import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import {
  AppText,
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  ChipRow,
  DateTimeField,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  InfoBanner,
  LargeTitle,
  ProgressBar,
  Screen,
  SectionHeader,
  SegmentedControl,
  SkeletonList,
  TextField,
  TopBar,
  useConfirm,
  useScrollY,
  useToast,
  type IconName,
} from '../../components';
import {
  createReport,
  deleteReport,
  deleteReportPermanently,
  downloadReportPdf,
  fetchReports,
  finalizeReport,
  renameReport,
  restoreReport,
} from '../../api/admin.api';
import { useI18n, type TKey } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat, type Formatters } from '../../i18n/format';
import { makeStyles, useTheme, type Tone } from '../../theme';
import {
  enterListItem,
  layoutTransition,
  useReducedMotion,
} from '../../theme/animations';
import type { AdminReport, ReportType } from '../../types/admin';
import { haptics } from '../../utils/haptics';
import type { AdminTabProps } from '../../navigation/types';

type ReportTab = 'active' | 'deleted';

const TYPES: { value: ReportType; label: TKey; icon: IconName; tone: Tone }[] = [
  { value: 'overall', label: 'admin.typeOverall', icon: 'grid-outline', tone: 'brand' },
  { value: 'users', label: 'admin.typeUsers', icon: 'people-outline', tone: 'info' },
  {
    value: 'donations',
    label: 'admin.typeDonations',
    icon: 'mc:basket-outline',
    tone: 'brand',
  },
  {
    value: 'requests',
    label: 'admin.typeRequests',
    icon: 'hand-left-outline',
    tone: 'olive',
  },
  {
    value: 'deliveries',
    label: 'admin.typeDeliveries',
    icon: 'mc:truck-outline',
    tone: 'safe',
  },
];
const typeInfo = (type: ReportType) => TYPES.find((x) => x.value === type) ?? TYPES[0];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** The three ranges an administrator reaches for most. */
function rangeFor(
  preset: 'week' | 'month' | 'lastMonth',
  now = new Date(),
): [Date, Date] {
  if (preset === 'week') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return [from, endOfDay(now)];
  }
  if (preset === 'month')
    return [new Date(now.getFullYear(), now.getMonth(), 1), endOfDay(now)];
  return [
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
    endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
  ];
}

interface Row {
  label: string;
  value: number;
}

/** "partiallyClaimed" -> "partially_claimed", to reuse the status labels. */
const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/**
 * Postgres stores report data as jsonb, which reorders object keys, so rows
 * are put back into the order a person expects (the lifecycle order).
 */
const ORDER: Record<string, string[]> = {
  role: ['donor', 'recipient', 'coordinator', 'driver', 'admin'],
  user: ['active', 'pending', 'inactive', 'rejected'],
  listing: ['open', 'partially_claimed', 'fully_claimed', 'expired', 'cancelled'],
  request: ['pending', 'accepted', 'rejected', 'cancelled'],
  assignment: [
    'pending_driver',
    'accepted',
    'in_transit',
    'completed',
    'declined',
    'cancelled',
  ],
};
const rank = (list: string[], key: string) => {
  const i = list.indexOf(snake(key));
  return i < 0 ? list.length : i;
};

/**
 * Turns a report's stored counts into labelled rows. The server stores
 * { users, donations, requests, deliveries } for an overall report and
 * { total, byRole?, byStatus } for the others (see generateReportData).
 */
function breakdown(
  report: AdminReport,
  t: (k: TKey) => string,
  f: Formatters,
): { total: number | null; groups: { title: string; rows: Row[] }[] } {
  const data = report.data;
  const num = (v: unknown) => (typeof v === 'number' ? v : 0);
  const rowsOf = (obj: unknown, order: string[], label: (k: string) => string): Row[] =>
    obj && typeof obj === 'object'
      ? Object.entries(obj as Record<string, unknown>)
          .sort(([a], [b]) => rank(order, a) - rank(order, b))
          .map(([k, v]) => ({ label: label(k), value: num(v) }))
      : [];

  if (report.type === 'overall') {
    return {
      total: null,
      groups: [
        {
          title: t('admin.typeOverall'),
          rows: (['users', 'donations', 'requests', 'deliveries'] as const).map((k) => ({
            label: t(typeInfo(k).label),
            value: num(data[k]),
          })),
        },
      ],
    };
  }

  const kind =
    report.type === 'users'
      ? 'user'
      : report.type === 'donations'
        ? 'listing'
        : report.type === 'requests'
          ? 'request'
          : 'assignment';
  const groups: { title: string; rows: Row[] }[] = [];
  if (data.byRole) {
    groups.push({
      title: t('admin.byRole'),
      rows: rowsOf(data.byRole, ORDER.role, (k) => t(`roles.${k}` as TKey)),
    });
  }
  groups.push({
    // A heading is only needed when there is more than one group.
    title: data.byRole ? t('admin.byStatus') : '',
    rows: rowsOf(data.byStatus, ORDER[kind], (k) => f.status(kind, snake(k))),
  });
  return { total: num(data.total), groups };
}

/**
 * Reports are dated snapshots of platform activity. The flow is
 * generate -> review -> finalise -> download as PDF: a finalised report is
 * locked, so the PDF handed to a sponsor always matches what was reviewed.
 *
 * Deleting is soft, with an Undo in the toast and a "Recently deleted" tab,
 * because an accidental delete of a finished report is costly and the fix
 * should be one tap away (error recovery heuristic).
 *
 * Renaming uses a sheet; the previous version used Alert.prompt, which only
 * exists on iOS, so renaming did nothing on Android.
 */
export function AdminReportsScreen(_: AdminTabProps<'AdminReports'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const toast = useToast();
  const confirm = useConfirm();
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

  const [tab, setTab] = useState<ReportTab>('active');
  const [active, setActive] = useState<AdminReport[]>([]);
  const [deleted, setDeleted] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const [open, setOpen] = useState<AdminReport | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<AdminReport | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const r = await fetchReports();
      setActive(r.active);
      setDeleted(r.deleted);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const fail = (err: unknown) =>
    toast.show({ type: 'error', title: describeError(err, t).message });

  const put = (report: AdminReport) => {
    setActive((list) => list.map((r) => (r.reportId === report.reportId ? report : r)));
    setOpen((o) => (o?.reportId === report.reportId ? report : o));
  };

  async function finalize(report: AdminReport) {
    const ok = await confirm({
      title: t('admin.finalizeTitle'),
      message: t('admin.finalizeBody'),
      confirmLabel: t('admin.finalize'),
      icon: 'lock-closed-outline',
    });
    if (!ok) return;
    setBusy('finalize');
    try {
      put(await finalizeReport(report.reportId));
      haptics.success();
      toast.show({ type: 'success', title: t('admin.finalizedToast') });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function download(report: AdminReport) {
    setBusy('download');
    try {
      const uri = await downloadReportPdf(report.reportId);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: report.title,
          UTI: 'com.adobe.pdf',
        });
      } else {
        toast.show({ type: 'success', title: t('admin.pdfReady') });
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function remove(report: AdminReport) {
    setOpen(null);
    try {
      await deleteReport(report.reportId);
      setActive((list) => list.filter((r) => r.reportId !== report.reportId));
      setDeleted((list) => [{ ...report, deletedAt: new Date().toISOString() }, ...list]);
      toast.show({
        type: 'info',
        title: t('admin.deletedReportToast'),
        actionLabel: t('admin.undo'),
        onAction: () => void restore(report),
      });
    } catch (err) {
      fail(err);
    }
  }

  async function restore(report: AdminReport) {
    try {
      const restored = await restoreReport(report.reportId);
      setDeleted((list) => list.filter((r) => r.reportId !== report.reportId));
      setActive((list) =>
        [restored, ...list.filter((r) => r.reportId !== restored.reportId)].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
      toast.show({ type: 'success', title: t('admin.restoredToast') });
    } catch (err) {
      fail(err);
    }
  }

  async function destroy(report: AdminReport) {
    const ok = await confirm({
      title: t('admin.deleteForeverTitle'),
      message: t('admin.deleteForeverBody'),
      confirmLabel: t('admin.deleteForever'),
      tone: 'critical',
      icon: 'trash-outline',
    });
    if (!ok) return;
    try {
      await deleteReportPermanently(report.reportId);
      setDeleted((list) => list.filter((r) => r.reportId !== report.reportId));
      toast.show({ type: 'success', title: t('admin.deletedForeverToast') });
    } catch (err) {
      fail(err);
    }
  }

  const list = tab === 'active' ? active : deleted;

  const header = (
    <View>
      <LargeTitle
        title={t('admin.reportsTitle')}
        subtitle={t('admin.reportsSubtitle')}
        scrollY={scrollY}
        right={
          <IconButton
            icon="add"
            variant="filled"
            tone="brand"
            onPress={() => setCreating(true)}
            accessibilityLabel={t('admin.newReport')}
          />
        }
      />
      <SegmentedControl
        segments={[
          { value: 'active', label: t('admin.tabActive'), icon: 'document-text-outline' },
          { value: 'deleted', label: t('admin.tabDeleted'), icon: 'trash-outline' },
        ]}
        value={tab}
        onChange={setTab}
        style={styles.segments}
      />
    </View>
  );

  let empty: React.ReactElement;
  if (loading) empty = <SkeletonList count={3} />;
  else if (error) empty = <ErrorState error={error} onRetry={() => void load()} />;
  else if (tab === 'active')
    empty = (
      <EmptyState
        compact
        illustration="waiting"
        title={t('admin.reportsEmptyTitle')}
        message={t('admin.reportsEmptyBody')}
        actionLabel={t('admin.newReport')}
        onAction={() => setCreating(true)}
      />
    );
  else
    empty = (
      <EmptyState compact illustration="allClear" title={t('admin.deletedEmpty')} />
    );

  return (
    <Screen>
      <TopBar title={t('admin.reportsTitle')} scrollY={scrollY} />
      <Animated.FlatList
        data={loading || error ? [] : list}
        keyExtractor={(r) => `${tab}-${r.reportId}`}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={theme.colors.brand}
            colors={[theme.colors.brand]}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={enterListItem(index, reduced)}
            layout={layoutTransition(reduced)}
          >
            {tab === 'active' ? (
              <ReportCard report={item} onPress={() => setOpen(item)} />
            ) : (
              <DeletedCard
                report={item}
                onRestore={() => void restore(item)}
                onDestroy={() => void destroy(item)}
              />
            )}
          </Animated.View>
        )}
      />

      <ReportSheet
        report={open}
        busy={busy}
        onClose={() => setOpen(null)}
        onRename={(r) => {
          setOpen(null);
          setRenaming(r);
        }}
        onFinalize={(r) => void finalize(r)}
        onDownload={(r) => void download(r)}
        onDelete={(r) => void remove(r)}
      />

      <CreateSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={(r) => {
          setCreating(false);
          setTab('active');
          setActive((list) => [r, ...list]);
          haptics.success();
          toast.show({ type: 'success', title: t('admin.generatedToast') });
          setOpen(r);
        }}
      />

      <RenameSheet
        report={renaming}
        onClose={() => setRenaming(null)}
        onRenamed={(r) => {
          put(r);
          setRenaming(null);
          toast.show({ type: 'success', title: t('admin.renamedToast') });
        }}
      />
    </Screen>
  );
}

function ReportCard({ report, onPress }: { report: AdminReport; onPress: () => void }) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const info = typeInfo(report.type);
  const c = theme.tone(info.tone);
  const finalised = report.status === 'finalized';

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${report.title}, ${f.status('report', report.status)}`}
    >
      <View style={styles.cardHead}>
        <View style={[styles.typeIcon, { backgroundColor: c.bg }]}>
          <Icon name={info.icon} size={20} color={c.fg} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {report.title}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {`${t(info.label)} · ${t('admin.reportRange', {
              start: f.dateShort(report.startDate),
              end: f.dateShort(report.endDate),
            })}`}
          </AppText>
        </View>
        <Badge
          size="sm"
          icon={finalised ? 'lock-closed' : undefined}
          label={f.status('report', report.status)}
          tone={finalised ? 'safe' : 'neutral'}
        />
      </View>
    </Card>
  );
}

function DeletedCard({
  report,
  onRestore,
  onDestroy,
}: {
  report: AdminReport;
  onRestore: () => void;
  onDestroy: () => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();

  return (
    <Card variant="flat">
      <AppText variant="bodyStrong" color="textSecondary" numberOfLines={2}>
        {report.title}
      </AppText>
      <AppText variant="caption" color="textTertiary">
        {`${t(typeInfo(report.type).label)} · ${f.relative(report.deletedAt ?? report.updatedAt)}`}
      </AppText>
      <View style={styles.deletedActions}>
        <Button
          label={t('admin.deleteForever')}
          variant="dangerGhost"
          size="sm"
          onPress={onDestroy}
        />
        <Button
          label={t('admin.restore')}
          icon="arrow-undo-outline"
          variant="tonal"
          size="sm"
          inline
          onPress={onRestore}
        />
      </View>
    </Card>
  );
}

function ReportSheet({
  report,
  busy,
  onClose,
  onRename,
  onFinalize,
  onDownload,
  onDelete,
}: {
  report: AdminReport | null;
  busy: string | null;
  onClose: () => void;
  onRename: (r: AdminReport) => void;
  onFinalize: (r: AdminReport) => void;
  onDownload: (r: AdminReport) => void;
  onDelete: (r: AdminReport) => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();

  // Keep the content while the sheet slides away.
  const [shown, setShown] = useState<AdminReport | null>(report);
  useEffect(() => {
    if (report) setShown(report);
  }, [report]);
  const r = report ?? shown;
  if (!r) return null;

  const finalised = r.status === 'finalized';
  const { total, groups } = breakdown(r, t, f);
  const max = Math.max(1, ...groups.flatMap((g) => g.rows.map((x) => x.value)));
  const info = typeInfo(r.type);

  return (
    <BottomSheet
      visible={!!report}
      onClose={onClose}
      dismissible={!busy}
      scrollable
      title={r.title}
      subtitle={`${t(info.label)} · ${t('admin.reportRange', {
        start: f.dateMedium(r.startDate),
        end: f.dateMedium(r.endDate),
      })}`}
      footer={
        finalised ? (
          <Button
            label={t('admin.download')}
            icon="download-outline"
            onPress={() => onDownload(r)}
            loading={busy === 'download'}
          />
        ) : (
          <View style={styles.row}>
            <Button
              label={t('admin.rename')}
              icon="create-outline"
              variant="secondary"
              onPress={() => onRename(r)}
              style={styles.flex}
              disabled={!!busy}
            />
            <Button
              label={t('admin.finalize')}
              icon="lock-closed-outline"
              onPress={() => onFinalize(r)}
              loading={busy === 'finalize'}
              style={styles.flex}
            />
          </View>
        )
      }
    >
      <View style={styles.badgeRow}>
        <Badge
          icon={finalised ? 'lock-closed' : 'create-outline'}
          label={f.status('report', r.status)}
          tone={finalised ? 'safe' : 'neutral'}
        />
        <AppText variant="caption" color="textSecondary">
          {finalised && r.finalizedAt
            ? t('admin.finalisedOn', { when: f.dateMedium(r.finalizedAt) })
            : t('admin.createdOn', { when: f.dateMedium(r.createdAt) })}
        </AppText>
      </View>

      {total !== null ? (
        <View style={styles.total}>
          <AppText variant="display">{f.number(total)}</AppText>
          <AppText variant="secondary" color="textSecondary">
            {t('admin.total')}
          </AppText>
        </View>
      ) : null}

      <SectionHeader title={t('admin.preview')} />
      {groups.map((g, gi) => (
        <View key={gi} style={gi > 0 ? styles.groupGap : undefined}>
          {g.title ? (
            <AppText variant="overline" color="textSecondary" style={styles.groupTitle}>
              {g.title}
            </AppText>
          ) : null}
          {g.rows.map((row) => (
            <View key={row.label} style={styles.bRow}>
              <View style={styles.bLabel}>
                <AppText variant="secondary">{row.label}</AppText>
                <AppText variant="secondaryStrong">{f.number(row.value)}</AppText>
              </View>
              <ProgressBar
                value={row.value / max}
                tone={info.tone}
                height={6}
                accessibilityLabel={`${row.label}, ${row.value}`}
              />
            </View>
          ))}
        </View>
      ))}

      {!finalised ? (
        <InfoBanner
          style={styles.hintBanner}
          icon="document-lock-outline"
          message={t('admin.downloadHint')}
        />
      ) : null}

      <Button
        label={t('admin.deleteReport')}
        icon="trash-outline"
        variant="dangerGhost"
        size="sm"
        onPress={() => onDelete(r)}
        disabled={!!busy}
        style={styles.deleteBtn}
      />
    </BottomSheet>
  );
}

function CreateSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (r: AdminReport) => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ReportType>('overall');
  const [range, setRange] = useState<[Date, Date]>(() => rangeFor('month'));
  const [preset, setPreset] = useState<'week' | 'month' | 'lastMonth' | null>('month');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setType('overall');
      setRange(rangeFor('month'));
      setPreset('month');
      setShowErrors(false);
    }
  }, [visible]);

  const titleError = title.trim().length < 2 ? t('admin.titleShort') : undefined;
  const now = new Date();

  async function submit() {
    setShowErrors(true);
    if (titleError) {
      haptics.error();
      return;
    }
    setSaving(true);
    try {
      const report = await createReport({
        title: title.trim(),
        type,
        startDate: startOfDay(range[0]).toISOString(),
        endDate: endOfDay(range[1]).toISOString(),
      });
      onCreated(report);
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    } finally {
      setSaving(false);
    }
  }

  const pick = (p: 'week' | 'month' | 'lastMonth') => {
    setPreset(p);
    setRange(rangeFor(p));
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      dismissible={!saving}
      scrollable
      title={t('admin.newReport')}
      footer={
        <Button
          label={t('admin.generate')}
          icon="sparkles-outline"
          onPress={() => void submit()}
          loading={saving}
        />
      }
    >
      <TextField
        label={t('admin.reportTitle')}
        value={title}
        onChangeText={setTitle}
        placeholder={t('admin.reportTitlePlaceholder')}
        error={showErrors ? titleError : undefined}
        maxLength={150}
      />
      <AppText variant="secondaryStrong" style={styles.fieldLabel}>
        {t('admin.reportType')}
      </AppText>
      <View style={styles.typeGrid}>
        {TYPES.map((x) => (
          <Chip
            key={x.value}
            label={t(x.label)}
            icon={x.icon}
            tone={x.tone}
            selected={type === x.value}
            onPress={() => setType(x.value)}
          />
        ))}
      </View>
      <ChipRow style={styles.presets}>
        <Chip
          label={t('admin.rangeWeek')}
          selected={preset === 'week'}
          onPress={() => pick('week')}
        />
        <Chip
          label={t('admin.rangeMonth')}
          selected={preset === 'month'}
          onPress={() => pick('month')}
        />
        <Chip
          label={t('admin.rangeLastMonth')}
          selected={preset === 'lastMonth'}
          onPress={() => pick('lastMonth')}
        />
      </ChipRow>
      <View style={styles.row}>
        <DateTimeField
          label={t('admin.reportFrom')}
          mode="date"
          value={range[0]}
          maximum={range[1]}
          onChange={(d) => {
            setPreset(null);
            setRange([startOfDay(d), range[1]]);
          }}
          style={styles.flex}
        />
        <DateTimeField
          label={t('admin.reportTo')}
          mode="date"
          value={range[1]}
          minimum={range[0]}
          maximum={endOfDay(now)}
          onChange={(d) => {
            setPreset(null);
            setRange([range[0], endOfDay(d)]);
          }}
          style={styles.flex}
        />
      </View>
    </BottomSheet>
  );
}

function RenameSheet({
  report,
  onClose,
  onRenamed,
}: {
  report: AdminReport | null;
  onClose: () => void;
  onRenamed: (r: AdminReport) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (report) setTitle(report.title);
  }, [report]);

  const error = title.trim().length < 2 ? t('admin.titleShort') : undefined;

  async function save() {
    if (!report || error) return;
    setSaving(true);
    try {
      onRenamed(await renameReport(report.reportId, title.trim()));
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      visible={!!report}
      onClose={onClose}
      dismissible={!saving}
      title={t('admin.renameTitle')}
      footer={
        <Button
          label={t('common.save')}
          onPress={() => void save()}
          loading={saving}
          disabled={!!error || title.trim() === report?.title}
        />
      }
    >
      <TextField
        label={t('admin.reportTitle')}
        value={title}
        onChangeText={setTitle}
        error={error}
        maxLength={150}
        autoFocus
        clearable
        onSubmitEditing={() => void save()}
        returnKeyType="done"
      />
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({
  content: {
    paddingHorizontal: t.layout.screenPadding,
    paddingBottom: t.spacing.xxl,
    flexGrow: 1,
  },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: t.spacing.sm + 4 },
  gap: { height: t.spacing.sm + 2 },
  segments: { marginBottom: t.spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: t.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: t.spacing.sm,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  total: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: t.spacing.sm,
    marginTop: t.spacing.md,
  },
  groupGap: { marginTop: t.spacing.md },
  groupTitle: { marginBottom: t.spacing.sm },
  bRow: { marginBottom: t.spacing.sm + 4 },
  bLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: t.spacing.xs + 2,
  },
  hintBanner: { marginTop: t.spacing.sm },
  deleteBtn: { alignSelf: 'center', marginTop: t.spacing.md },
  fieldLabel: { marginBottom: t.spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  presets: { marginTop: t.spacing.md + 4, marginBottom: t.spacing.md },
}));
