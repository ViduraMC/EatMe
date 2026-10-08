import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  ChipRow,
  ChoiceCard,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  InfoBanner,
  LargeTitle,
  ListRow,
  Screen,
  SearchBar,
  SectionHeader,
  SkeletonList,
  TextField,
  TopBar,
  useConfirm,
  useScrollY,
  useToast,
} from '../../components';
import {
  createStaff,
  deleteStaff,
  fetchAdminUsers,
  updateStaff,
  updateUserStatus,
} from '../../api/admin.api';
import { useI18n, type TKey } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme, type Tone } from '../../theme';
import {
  enterListItem,
  layoutTransition,
  useReducedMotion,
} from '../../theme/animations';
import type { UserRole, UserStatus } from '../../types';
import type { AdminUser, StaffRole } from '../../types/admin';
import { haptics } from '../../utils/haptics';
import type { AdminTabProps } from '../../navigation/types';

type StatusFilter = 'all' | UserStatus;
type RoleFilter = 'all' | UserRole;

const STATUSES: UserStatus[] = ['pending', 'active', 'inactive', 'rejected'];
const ROLES: UserRole[] = ['donor', 'recipient', 'coordinator', 'driver', 'admin'];

export const roleTone: Record<UserRole, Tone> = {
  donor: 'brand',
  recipient: 'olive',
  coordinator: 'info',
  driver: 'safe',
  admin: 'neutral',
};

export const userStatusTone: Record<UserStatus, Tone> = {
  pending: 'urgent',
  active: 'safe',
  inactive: 'neutral',
  rejected: 'critical',
};

/** Awaiting approval first, then everyone else newest first. */
const STATUS_RANK: Record<UserStatus, number> = {
  pending: 0,
  active: 1,
  inactive: 2,
  rejected: 3,
};

function isStaff(user: AdminUser): user is AdminUser & { role: StaffRole } {
  return user.role === 'coordinator' || user.role === 'driver';
}

function staffHistory(user: AdminUser): number {
  return user.role === 'coordinator'
    ? user._count.coordinatedAssignments
    : user._count.drivenAssignments;
}

/**
 * The status changes the server allows from each state, so the sheet only
 * ever offers buttons that will work (see updateAdminUserStatus):
 * a pending recipient is approved or rejected, a rejected one can still be
 * approved later, and an active account can be suspended and reactivated.
 */
type StatusAction = 'approve' | 'reject' | 'suspend' | 'reactivate';

function statusActions(user: AdminUser): StatusAction[] {
  if (user.role === 'admin') return [];
  switch (user.status) {
    case 'pending':
      return user.role === 'recipient' ? ['approve', 'reject'] : ['approve'];
    case 'rejected':
      return ['approve'];
    case 'active':
      return ['suspend'];
    case 'inactive':
      return ['reactivate'];
  }
}

const ACTION: Record<
  StatusAction,
  {
    next: UserStatus;
    label: TKey;
    title: TKey;
    body: TKey;
    toast: TKey;
    tone: Tone;
    icon:
      | 'checkmark-circle-outline'
      | 'close-circle-outline'
      | 'pause-circle-outline'
      | 'play-circle-outline';
  }
> = {
  approve: {
    next: 'active',
    label: 'admin.approve',
    title: 'admin.approveTitle',
    body: 'admin.approveBody',
    toast: 'admin.approvedToast',
    tone: 'safe',
    icon: 'checkmark-circle-outline',
  },
  reject: {
    next: 'rejected',
    label: 'admin.reject',
    title: 'admin.rejectTitle',
    body: 'admin.rejectBody',
    toast: 'admin.rejectedToast',
    tone: 'critical',
    icon: 'close-circle-outline',
  },
  suspend: {
    next: 'inactive',
    label: 'admin.suspend',
    title: 'admin.suspendTitle',
    body: 'admin.suspendBody',
    toast: 'admin.suspendedToast',
    tone: 'critical',
    icon: 'pause-circle-outline',
  },
  reactivate: {
    next: 'active',
    label: 'admin.reactivate',
    title: 'admin.reactivateTitle',
    body: 'admin.reactivateBody',
    toast: 'admin.reactivatedToast',
    tone: 'safe',
    icon: 'play-circle-outline',
  },
};

interface StaffForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  role: StaffRole;
}

const EMPTY_FORM: StaffForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  role: 'driver',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Everyone on the platform, with the two jobs an administrator does here:
 * verifying recipient organisations before they can request food, and
 * managing the coordinator and driver accounts that only an admin can
 * create.
 *
 * Tapping a person opens a sheet with their details and only the actions
 * that are valid for their current status, so there are no buttons that
 * fail with a server error. Every change is confirmed first and reported
 * with a toast.
 */
export function AdminUsersScreen({ route }: AdminTabProps<'AdminUsers'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const toast = useToast();
  const confirm = useConfirm();
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [role, setRole] = useState<RoleFilter>('all');
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const [staffOpen, setStaffOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  // Arriving from the overview's "Review" button.
  const initialFilter = route.params?.filter;
  useEffect(() => {
    if (initialFilter === 'pending') {
      setStatus('pending');
      setRole('all');
    }
  }, [initialFilter]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setUsers(await fetchAdminUsers());
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

  const statusCounts = useMemo(() => {
    const counts: Record<UserStatus, number> = {
      pending: 0,
      active: 0,
      inactive: 0,
      rejected: 0,
    };
    for (const u of users) counts[u.status] += 1;
    return counts;
  }, [users]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => status === 'all' || u.status === status)
      .filter((u) => role === 'all' || u.role === role)
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.organisationName ?? '').toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [users, query, status, role]);

  const replaceUser = (next: AdminUser) =>
    setUsers((list) =>
      list.map((u) => (u.userId === next.userId ? { ...u, ...next } : u)),
    );

  async function runAction(user: AdminUser, action: StatusAction) {
    const a = ACTION[action];
    const name = user.organisationName ?? user.name;

    setSelected(null);

    // UserSheet is a native Modal-backed BottomSheet. Let it finish closing
    // before presenting the confirmation sheet, otherwise the two native
    // modals can overlap and leave the Admin screen unable to receive touches.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 300);
    });

    const ok = await confirm({
      title: t(a.title, { name }),
      message: t(a.body),
      confirmLabel: t(a.label),
      tone: a.tone,
      icon: a.icon,
    });
    if (!ok) return;
    try {
      const updated = await updateUserStatus(user.userId, a.next);
      replaceUser(updated);
      if (a.tone === 'safe') haptics.success();
      toast.show({ type: 'success', title: t(a.toast, { name }) });
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    }
  }

  async function removeStaff(user: AdminUser) {
    setSelected(null);

    // Wait for UserSheet to fully dismiss before opening confirmation.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 300);
    });

    const ok = await confirm({
      title: t('admin.deleteTitle', { name: user.name }),
      message: t('admin.deleteBody'),
      confirmLabel: t('common.delete'),
      tone: 'critical',
      icon: 'trash-outline',
    });
    if (!ok) return;
    try {
      await deleteStaff(user.userId);
      setUsers((list) => list.filter((u) => u.userId !== user.userId));
      toast.show({
        type: 'success',
        title: t('admin.deletedToast', { name: user.name }),
      });
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    }
  }

  function openStaff(user: AdminUser | null) {
    setSelected(null);

    const open = () => {
      setEditing(user);
      setForm(
        user && isStaff(user)
          ? {
              name: user.name,
              email: user.email,
              phone: user.phone,
              address: user.address,
              password: '',
              role: user.role,
            }
          : EMPTY_FORM,
      );
      setShowErrors(false);
      setStaffOpen(true);
    };

    if (selected) {
      // Editing is launched from UserSheet, so wait for that native modal to
      // finish closing before opening the staff form BottomSheet.
      setTimeout(open, 300);
    } else {
      // "Add staff" comes directly from the Users screen and needs no delay.
      open();
    }
  }

  // The same rules as the server's staff schema, checked here first so the
  // message appears under the field instead of as a generic error.
  const phone = form.phone.replace(/\s/g, '');
  const errors = {
    name: form.name.trim().length < 2 ? t('auth.nameShort') : undefined,
    email: EMAIL.test(form.email.trim()) ? undefined : t('auth.emailInvalid'),
    phone: /^07[01245678]\d{7}$/.test(phone) ? undefined : t('admin.phone10'),
    address: form.address.trim().length < 5 ? t('auth.addressShort') : undefined,
    password: !editing && form.password.length < 8 ? t('auth.passwordShort') : undefined,
  };
  const formValid = !Object.values(errors).some(Boolean);

  const unchanged =
    !!editing &&
    form.name.trim() === editing.name.trim() &&
    form.email.trim().toLowerCase() === editing.email.trim().toLowerCase() &&
    phone === editing.phone.replace(/\s/g, '') &&
    form.address.trim() === editing.address.trim();

  async function saveStaff() {
    setShowErrors(true);
    if (saving || unchanged) return;

    if (!formValid) {
      haptics.error();
      return;
    }
    setSaving(true);
    const input = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone,
      address: form.address.trim(),
    };
    try {
      if (editing) {
        replaceUser(await updateStaff(editing.userId, input));
        toast.show({ type: 'success', title: t('admin.staffSavedToast') });
      } else {
        await createStaff({ ...input, password: form.password, role: form.role });
        toast.show({
          type: 'success',
          title: t('admin.staffCreatedToast', { name: input.name }),
        });
        void load();
      }
      haptics.success();
      setStaffOpen(false);
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    } finally {
      setSaving(false);
    }
  }

  const set =
    <K extends keyof StaffForm>(key: K) =>
    (value: StaffForm[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  const header = (
    <View>
      <LargeTitle
        title={t('admin.usersTitle')}
        subtitle={t('admin.usersSubtitle')}
        scrollY={scrollY}
        right={
          <IconButton
            icon="person-add-outline"
            variant="tonal"
            tone="brand"
            onPress={() => openStaff(null)}
            accessibilityLabel={t('admin.addStaff')}
          />
        }
      />
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={t('admin.searchUsers')}
        style={styles.search}
      />
      <ChipRow>
        <Chip
          label={t('admin.anyStatus')}
          selected={status === 'all'}
          onPress={() => setStatus('all')}
        />
        {STATUSES.map((s) => (
          <Chip
            key={s}
            label={f.status('user', s)}
            count={statusCounts[s]}
            tone={userStatusTone[s]}
            selected={status === s}
            onPress={() => setStatus(s)}
          />
        ))}
      </ChipRow>
      <ChipRow style={styles.roleRow}>
        <Chip
          label={t('admin.allRoles')}
          selected={role === 'all'}
          onPress={() => setRole('all')}
        />
        {ROLES.map((r) => (
          <Chip
            key={r}
            label={t(`roles.${r}` as TKey)}
            tone={roleTone[r]}
            selected={role === r}
            onPress={() => setRole(r)}
          />
        ))}
      </ChipRow>
      {!loading && !error ? (
        <SectionHeader
          title={t('admin.usersTitle')}
          meta={t('admin.usersMeta', { count: visible.length })}
        />
      ) : null}
    </View>
  );

  let empty: React.ReactElement;
  if (loading) empty = <SkeletonList count={5} />;
  else if (error) empty = <ErrorState error={error} onRetry={() => void load()} />;
  else
    empty = (
      <EmptyState
        compact
        illustration="emptyBowl"
        title={t('admin.usersEmpty')}
        actionLabel={t('recipient.clearFilters')}
        onAction={() => {
          setQuery('');
          setStatus('all');
          setRole('all');
        }}
      />
    );

  return (
    <Screen>
      <TopBar title={t('admin.usersTitle')} scrollY={scrollY} />
      <Animated.FlatList
        data={loading || error ? [] : visible}
        keyExtractor={(u) => String(u.userId)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
            <UserCard user={item} onPress={() => setSelected(item)} />
          </Animated.View>
        )}
      />

      <UserSheet
        user={selected}
        onClose={() => setSelected(null)}
        onAction={(u, a) => void runAction(u, a)}
        onEdit={(u) => openStaff(u)}
        onDelete={(u) => void removeStaff(u)}
      />

      <BottomSheet
        visible={staffOpen}
        onClose={() => setStaffOpen(false)}
        dismissible={!saving}
        scrollable
        title={editing ? t('admin.staffTitleEdit') : t('admin.staffTitleNew')}
        footer={
          <View style={styles.row}>
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => setStaffOpen(false)}
              disabled={saving}
              style={styles.flex}
            />
            <Button
              label={editing ? t('common.save') : t('admin.addStaff')}
              onPress={() => void saveStaff()}
              loading={saving}
              disabled={saving || (!!editing && unchanged)}
              style={styles.flex}
            />
          </View>
        }
      >
        {!editing ? (
          <View style={styles.roles}>
            <AppText variant="secondaryStrong" style={styles.fieldLabel}>
              {t('admin.staffRole')}
            </AppText>
            <ChoiceCard
              title={t('roles.driver')}
              description={t('admin.driverBody')}
              icon="mc:truck-outline"
              tone="safe"
              selected={form.role === 'driver'}
              onPress={() => set('role')('driver')}
            />
            <ChoiceCard
              title={t('roles.coordinator')}
              description={t('admin.coordinatorBody')}
              icon="mc:clipboard-account-outline"
              tone="info"
              selected={form.role === 'coordinator'}
              onPress={() => set('role')('coordinator')}
            />
          </View>
        ) : null}
        <TextField
          label={t('auth.fullName')}
          value={form.name}
          onChangeText={set('name')}
          placeholder={t('auth.namePlaceholder')}
          autoCapitalize="words"
          error={showErrors ? errors.name : undefined}
          maxLength={100}
        />
        <TextField
          label={t('auth.email')}
          value={form.email}
          onChangeText={set('email')}
          placeholder={t('auth.emailPlaceholder')}
          autoCapitalize="none"
          autoComplete="off"
          keyboardType="email-address"
          error={showErrors ? errors.email : undefined}
          maxLength={150}
        />
        <TextField
          label={t('auth.phone')}
          value={form.phone}
          onChangeText={set('phone')}
          placeholder="0771234567"
          keyboardType="phone-pad"
          helper={t('admin.staffPhoneHelp')}
          error={showErrors ? errors.phone : undefined}
          maxLength={14}
        />
        <TextField
          label={t('auth.address')}
          value={form.address}
          onChangeText={set('address')}
          placeholder={t('auth.addressPlaceholder')}
          error={showErrors ? errors.address : undefined}
        />
        {!editing ? (
          <TextField
            label={t('auth.password')}
            value={form.password}
            onChangeText={set('password')}
            secure
            helper={t('admin.staffPasswordHelp')}
            error={showErrors ? errors.password : undefined}
            maxLength={72}
          />
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

function UserCard({ user, onPress }: { user: AdminUser; onPress: () => void }) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const display = user.organisationName ?? user.name;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${display}, ${t(`roles.${user.role}` as TKey)}, ${f.status('user', user.status)}`}
      style={user.status === 'pending' ? styles.pendingCard : undefined}
    >
      <View style={styles.head}>
        <Avatar name={display} size={44} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {display}
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {user.organisationName ? `${user.name} · ${user.email}` : user.email}
          </AppText>
          <View style={styles.badges}>
            <Badge
              size="sm"
              label={t(`roles.${user.role}` as TKey)}
              tone={roleTone[user.role]}
            />
            <Badge
              size="sm"
              dot
              label={f.status('user', user.status)}
              tone={userStatusTone[user.status]}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

function UserSheet({
  user,
  onClose,
  onAction,
  onEdit,
  onDelete,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onAction: (user: AdminUser, action: StatusAction) => void;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();

  // Keep the last user while the sheet slides away, so it does not go blank.
  const [shown, setShown] = useState<AdminUser | null>(user);
  useEffect(() => {
    if (user) setShown(user);
  }, [user]);
  const u = user ?? shown;
  if (!u) return null;

  const display = u.organisationName ?? u.name;
  const actions = statusActions(u);
  const activity = (() => {
    switch (u.role) {
      case 'donor':
        return t('admin.listingsCount', { count: u._count.listings });
      case 'recipient':
        return t('admin.requestsCount', { count: u._count.requests });
      case 'coordinator':
        return t('admin.assignmentsCount', { count: u._count.coordinatedAssignments });
      case 'driver':
        return t('admin.assignmentsCount', { count: u._count.drivenAssignments });
      default:
        return null;
    }
  })();

  return (
    <BottomSheet visible={!!user} onClose={onClose} scrollable>
      <View style={styles.sheetHead}>
        <Avatar name={display} size={64} />
        <AppText variant="headline" align="center">
          {display}
        </AppText>
        {u.organisationName ? (
          <AppText variant="secondary" color="textSecondary">
            {u.name}
          </AppText>
        ) : null}
        <View style={styles.badges}>
          <Badge label={t(`roles.${u.role}` as TKey)} tone={roleTone[u.role]} />
          <Badge dot label={f.status('user', u.status)} tone={userStatusTone[u.status]} />
        </View>
        <AppText variant="caption" color="textTertiary">
          {t('admin.joined', { when: f.dateMedium(u.createdAt) })}
        </AppText>
      </View>

      <SectionHeader title={t('admin.contact')} />
      <ListRow
        icon="mail-outline"
        iconTone="info"
        title={u.email}
        subtitle={t('admin.email')}
        onPress={() => void Linking.openURL(`mailto:${u.email}`)}
      />
      <Divider inset={48} />
      <ListRow
        icon="call-outline"
        iconTone="olive"
        title={u.phone}
        subtitle={t('admin.call')}
        onPress={() => void Linking.openURL(`tel:${u.phone.replace(/\s/g, '')}`)}
      />
      <Divider inset={48} />
      <ListRow
        icon="location-outline"
        iconTone="brand"
        title={u.address}
        chevron={false}
      />

      {activity ? (
        <>
          <SectionHeader title={t('admin.activity')} />
          <AppText variant="body">{activity}</AppText>
        </>
      ) : null}

      <SectionHeader title={t('admin.manage')} />
      {u.role === 'admin' ? (
        <InfoBanner message={t('admin.adminLocked')} icon="lock-closed-outline" />
      ) : (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Button
              key={a}
              label={t(ACTION[a].label)}
              icon={ACTION[a].icon}
              variant={
                ACTION[a].tone === 'critical'
                  ? 'dangerGhost'
                  : a === 'approve'
                    ? 'success'
                    : 'secondary'
              }
              onPress={() => onAction(u, a)}
            />
          ))}
          {isStaff(u) ? (
            <>
              <Button
                label={t('admin.editStaff')}
                icon="create-outline"
                variant="secondary"
                onPress={() => onEdit(u)}
              />
              {staffHistory(u) === 0 ? (
                <Button
                  label={t('admin.deleteStaff')}
                  icon="trash-outline"
                  variant="dangerGhost"
                  onPress={() => onDelete(u)}
                />
              ) : (
                <AppText variant="caption" color="textSecondary" align="center">
                  {t('admin.deleteBlocked', { name: u.name })}
                </AppText>
              )}
            </>
          ) : null}
        </View>
      )}
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
  search: { marginBottom: t.spacing.sm + 4 },
  roleRow: { marginTop: t.spacing.sm },
  pendingCard: { borderWidth: 1.5, borderColor: t.colors.urgent },
  head: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.xs + 2,
    marginTop: t.spacing.xs + 2,
  },
  sheetHead: { alignItems: 'center', gap: t.spacing.xs, paddingBottom: t.spacing.sm },
  actions: { gap: t.spacing.sm, paddingBottom: t.spacing.sm },
  roles: { gap: t.spacing.sm, marginBottom: t.spacing.md + 4 },
  fieldLabel: { marginBottom: t.spacing.xxs },
}));
