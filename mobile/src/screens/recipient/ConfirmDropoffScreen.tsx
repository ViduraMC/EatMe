import React, { useCallback, useState } from 'react';
import { Linking, RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  Badge,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  HandshakePanel,
  Icon,
  IconButton,
  InfoBanner,
  LargeTitle,
  Screen,
  SkeletonList,
  SlideToConfirm,
  TextField,
  Timeline,
  TopBar,
  useScrollY,
  useToast,
  type TimelineStep,
} from '../../components';
import { confirmDropoff, fetchPendingDropoffs } from '../../api/requests.api';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import { enterListItem, useReducedMotion } from '../../theme/animations';
import type { RecipientAssignment } from '../../types/assignment';
import { assignmentTone } from '../../utils/status';
import type { RecipientTabProps } from '../../navigation/types';
import { setPendingDropoffs } from './dropoffBadge';

/**
 * The recipient's handover confirmation screen: confirm the driver has delivered the food.
 *
 * Provides full transparency (driver info, donor info, items requested) and asks
 * the recipient to tick off each item upon delivery before sliding to confirm receipt.
 */
export function ConfirmDropoffScreen({ route }: RecipientTabProps<'ConfirmDropoff'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();
  const focusedId = route.params?.assignmentId;

  const [assignments, setAssignments] = useState<RecipientAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const rows = await fetchPendingDropoffs();
        setPendingDropoffs(rows.filter((a) => !a.dropoffRecipientConfirmedAt).length);
        const sorted = focusedId
          ? [...rows].sort((a, b) =>
              a.assignmentId === focusedId ? -1 : b.assignmentId === focusedId ? 1 : 0,
            )
          : rows;
        setAssignments(sorted);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [focusedId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  let empty: React.ReactElement;
  if (loading) empty = <SkeletonList count={2} />;
  else if (error) empty = <ErrorState error={error} onRetry={() => void load()} />;
  else
    empty = (
      <EmptyState
        illustration="deliverFood"
        title={t('recipient.dropoffsEmptyTitle')}
        message={t('recipient.dropoffsEmptyBody')}
      />
    );

  return (
    <Screen avoidKeyboard>
      <TopBar title={t('recipient.dropoffTitle')} scrollY={scrollY} />
      <Animated.FlatList
        data={loading || error ? [] : assignments}
        keyExtractor={(a) => String(a.assignmentId)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <LargeTitle
            title={t('recipient.dropoffTitle')}
            subtitle={t('recipient.dropoffSubtitle')}
            scrollY={scrollY}
          />
        }
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={theme.colors.brand}
            colors={[theme.colors.brand]}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={enterListItem(index, reduced)}>
            <HandoverCard assignment={item} onConfirmed={() => void load()} />
          </Animated.View>
        )}
      />
    </Screen>
  );
}

function HandoverCard({
  assignment,
  onConfirmed,
}: {
  assignment: RecipientAssignment;
  onConfirmed: () => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const toast = useToast();
  const { user } = useAuth();
  const { request, driver } = assignment;
  const listing = request.listing;
  const donorName = listing.donor.organisationName ?? listing.donor.name;
  const youConfirmed = !!assignment.dropoffRecipientConfirmedAt;

  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState('');
  const allChecked = request.items.every((i) => checked[i.requestItemId]);

  const steps: TimelineStep[] = [
    { key: 'requested', title: t('recipient.stepSent'), state: 'done' },
    { key: 'approved', title: t('recipient.stepApproved'), state: 'done' },
    {
      key: 'pickup',
      title: t('donor.stepPickedUp'),
      state: 'done',
    },
    {
      key: 'driver',
      title: t('donor.stepDriver'),
      state: assignment.status === 'completed' ? 'done' : 'current',
    },
    {
      key: 'delivered',
      title: t('donor.stepDelivered'),
      state: assignment.status === 'completed' ? 'done' : 'upcoming',
    },
  ];

  async function confirm() {
    try {
      const updated = await confirmDropoff(assignment.assignmentId, {
        notes: notes.trim() || null,
      });
      toast.show({
        type: 'success',
        title: t('recipient.dropoffConfirmed'),
        message:
          updated.status === 'completed'
            ? t('recipient.confirmedBothDropoff')
            : t('recipient.confirmedYouDropoff'),
      });
      setTimeout(onConfirmed, 1200);
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
      throw err;
    }
  }

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText variant="caption" color="textSecondary">
            {t('donor.deliveryNo', { id: assignment.assignmentId })}
          </AppText>
          <AppText variant="subtitle" numberOfLines={2}>
            {listing.title}
          </AppText>
        </View>
        <Badge
          label={f.status('assignment', assignment.status)}
          tone={assignmentTone[assignment.status]}
          dot
          size="sm"
        />
      </View>

      <Timeline steps={steps} orientation="horizontal" style={styles.timeline} />

      <View style={styles.driverRow}>
        <Avatar name={driver.name} size={44} icon="mc:truck-delivery-outline" />
        <View style={styles.flex}>
          <AppText variant="caption" color="textSecondary">
            {t('recipient.driver')}
          </AppText>
          <AppText variant="bodyStrong">{driver.name}</AppText>
          <AppText variant="caption" color="textSecondary">
            {driver.phone}
          </AppText>
        </View>
        <IconButton
          icon="call"
          variant="filled"
          tone="olive"
          onPress={() => void Linking.openURL(`tel:${driver.phone.replace(/\s/g, '')}`)}
          accessibilityLabel={t('recipient.callDriver', { name: driver.name })}
        />
      </View>

      <View style={styles.facts}>
        <Fact
          icon="mc:storefront-outline"
          label={t('recipient.donatedBy')}
          value={donorName}
        />
        <Fact
          icon="location-outline"
          label={t('donor.collectFrom')}
          value={listing.pickupAddress}
        />
      </View>

      {assignment.noteToDriver ? (
        <InfoBanner
          tone="neutral"
          icon="chatbox-ellipses-outline"
          title={t('recipient.noteFromCoordinator')}
          message={assignment.noteToDriver}
        />
      ) : null}

      <HandshakePanel
        title={t('donor.bothConfirm')}
        waitingLabel={t('donor.waiting')}
        left={{
          label: driver.name.split(' ')[0] ?? driver.name,
          name: driver.name,
          confirmedAt: assignment.dropoffDriverConfirmedAt,
          confirmedText: assignment.dropoffDriverConfirmedAt
            ? t('donor.confirmedAt', {
                when: f.time(assignment.dropoffDriverConfirmedAt),
              })
            : undefined,
        }}
        right={{
          label: t('donor.you'),
          name: user?.organisationName ?? user?.name ?? 'Recipient',
          confirmedAt: assignment.dropoffRecipientConfirmedAt,
          confirmedText: assignment.dropoffRecipientConfirmedAt
            ? t('donor.confirmedAt', {
                when: f.time(assignment.dropoffRecipientConfirmedAt),
              })
            : undefined,
        }}
      />

      {youConfirmed ? (
        <InfoBanner
          tone="safe"
          icon="checkmark-circle"
          message={t('recipient.alreadyConfirmedDropoff')}
        />
      ) : (
        <>
          <AppText variant="secondaryStrong">{t('recipient.dropoffChecklist')}</AppText>
          <AppText variant="caption" color="textSecondary" style={styles.hint}>
            {t('recipient.dropoffChecklistHint')}
          </AppText>
          {request.items.map((line) => (
            <Checkbox
              key={line.requestItemId}
              checked={!!checked[line.requestItemId]}
              onChange={(v) => setChecked((c) => ({ ...c, [line.requestItemId]: v }))}
              label={line.item.foodName}
              trailing={
                <AppText variant="secondaryStrong" color="textSecondary">
                  {f.quantity(line.quantityRequested, line.item.unit)}
                </AppText>
              }
            />
          ))}

          <TextField
            label={t('recipient.dropoffNotes')}
            optional
            value={notes}
            onChangeText={setNotes}
            placeholder={t('recipient.dropoffPlaceholder')}
            multiline
            maxLength={500}
            containerStyle={styles.notes}
          />

          <SlideToConfirm
            label={t('recipient.slideToConfirmDropoff')}
            doneLabel={t('recipient.dropoffConfirmed')}
            onConfirm={confirm}
            disabled={!allChecked}
          />
          {!allChecked ? (
            <View style={styles.lockHint}>
              <Icon name="lock-closed-outline" size={14} color="textSecondary" />
              <AppText variant="caption" color="textSecondary">
                {t('recipient.checkAllFirstDropoff')}
              </AppText>
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  value: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={18} color="brandText" />
      <View style={styles.flex}>
        <AppText variant="caption" color="textSecondary">
          {label}
        </AppText>
        <AppText variant="secondaryStrong">{value}</AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  content: {
    paddingHorizontal: t.layout.screenPadding,
    paddingBottom: t.spacing.xxl,
    flexGrow: 1,
  },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm },
  timeline: { marginVertical: t.spacing.md },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    padding: t.spacing.sm + 4,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.oliveSoft,
    marginBottom: t.spacing.md,
  },
  facts: { gap: t.spacing.sm + 4, marginBottom: t.spacing.md },
  fact: { flexDirection: 'row', gap: t.spacing.sm + 4, alignItems: 'flex-start' },
  hint: { marginBottom: t.spacing.xs },
  notes: { marginTop: t.spacing.sm },
  lockHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    marginTop: t.spacing.sm,
  },
}));
