import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import type { ApiSuccess, UserRole, UserStatus } from '../../types';

interface AdminUserCounts {
  listings: number;
  requests: number;
  coordinatedAssignments: number;
  drivenAssignments: number;
}

interface AdminUser {
  userId: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  organisationName: string | null;
  isAvailable: boolean;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  _count: AdminUserCounts;
}

type UsersResponse = ApiSuccess<{
  users: AdminUser[];
}>;

type UpdateUserResponse = ApiSuccess<{
  user: AdminUser;
}>;

type RoleFilter = 'all' | UserRole;
type StatusFilter = 'all' | UserStatus;

const roleFilters: Array<{
  label: string;
  value: RoleFilter;
}> = [
  { label: 'All', value: 'all' },
  { label: 'Donor', value: 'donor' },
  { label: 'Recipient', value: 'recipient' },
  { label: 'Coordinator', value: 'coordinator' },
  { label: 'Driver', value: 'driver' },
  { label: 'Admin', value: 'admin' },
];

const statusFilters: Array<{
  label: string;
  value: StatusFilter;
}> = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

function formatRole(role: UserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getUserActivityText(user: AdminUser): string | null {
  if (user.role === 'donor') {
    return `${user._count.listings} ${
      user._count.listings === 1 ? 'listing' : 'listings'
    }`;
  }

  if (user.role === 'recipient') {
    return `${user._count.requests} ${
      user._count.requests === 1 ? 'request' : 'requests'
    }`;
  }

  if (user.role === 'coordinator') {
    return `${user._count.coordinatedAssignments} ${
      user._count.coordinatedAssignments === 1 ? 'assignment' : 'assignments'
    }`;
  }

  if (user.role === 'driver') {
    return `${user._count.drivenAssignments} ${
      user._count.drivenAssignments === 1 ? 'delivery' : 'deliveries'
    }`;
  }

  return null;
}

export function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) {
      setIsLoading(true);
    }

    try {
      setErrorMessage(null);

      const response = await api.get<UsersResponse>('/admin/users');

      setUsers(response.data.data.users);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers(true);
  }, [loadUsers]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalisedQuery = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

      if (!matchesRole || !matchesStatus) {
        return false;
      }

      if (!normalisedQuery) {
        return true;
      }

      return (
        user.name.toLowerCase().includes(normalisedQuery) ||
        user.email.toLowerCase().includes(normalisedQuery) ||
        user.phone.toLowerCase().includes(normalisedQuery) ||
        user.address.toLowerCase().includes(normalisedQuery) ||
        user.role.toLowerCase().includes(normalisedQuery) ||
        (user.organisationName?.toLowerCase().includes(normalisedQuery) ?? false)
      );
    });
  }, [roleFilter, searchQuery, statusFilter, users]);

  const updateUserStatus = useCallback(
    async (user: AdminUser, nextStatus: UserStatus) => {
      setUpdatingUserId(user.userId);

      try {
        const response = await api.patch<UpdateUserResponse>(
          `/admin/users/${user.userId}/status`,
          {
            status: nextStatus,
          },
        );

        const updatedUser = response.data.data.user;

        setUsers((currentUsers) =>
          currentUsers.map((currentUser) =>
            currentUser.userId === updatedUser.userId ? updatedUser : currentUser,
          ),
        );
      } catch (error) {
        Alert.alert('Could not update user', getErrorMessage(error));
      } finally {
        setUpdatingUserId(null);
      }
    },
    [],
  );

  const confirmStatusChange = useCallback(
    (user: AdminUser) => {
      if (user.role === 'admin') {
        return;
      }

      const nextStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active';

      const actionLabel = nextStatus === 'inactive' ? 'Deactivate' : 'Activate';

      Alert.alert(`${actionLabel} user?`, `${actionLabel} ${user.name}'s account?`, [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: actionLabel,
          style: nextStatus === 'inactive' ? 'destructive' : 'default',
          onPress: () => {
            void updateUserStatus(user, nextStatus);
          },
        },
      ]);
    },
    [updateUserStatus],
  );

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colours.accent} />
        <Text style={styles.stateText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colours.accent}
        />
      }
    >
      <Text style={styles.title}>Users</Text>

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search users"
        placeholderTextColor={colours.textSecondary}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.roleFilterScroll}
        keyboardShouldPersistTaps="handled"
      >
        {roleFilters.map((filter) => {
          const selected = roleFilter === filter.value;

          return (
            <Pressable
              key={filter.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setRoleFilter(filter.value)}
              style={({ pressed }) => [
                styles.filterChip,
                selected && styles.filterChipSelected,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[styles.filterChipText, selected && styles.filterChipTextSelected]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.statusRow}>
        {statusFilters.map((filter) => {
          const selected = statusFilter === filter.value;

          return (
            <Pressable
              key={filter.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setStatusFilter(filter.value)}
              style={({ pressed }) => [
                styles.statusFilter,
                selected && styles.statusFilterSelected,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.statusFilterText,
                  selected && styles.statusFilterTextSelected,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Could not load users</Text>

          <Text style={styles.errorMessage}>{errorMessage}</Text>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
            onPress={() => {
              void loadUsers(true);
            }}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!errorMessage && filteredUsers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No users found</Text>

          <Text style={styles.emptyText}>
            Try another search term or change the selected filters.
          </Text>
        </View>
      ) : null}

      {!errorMessage
        ? filteredUsers.map((user) => {
            const activityText = getUserActivityText(user);
            const isAdmin = user.role === 'admin';
            const isUpdating = updatingUserId === user.userId;
            const isActive = user.status === 'active';

            return (
              <View key={user.userId} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userIdentity}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {user.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.userNameBlock}>
                      <Text style={styles.userName}>{user.name}</Text>

                      {user.organisationName ? (
                        <Text style={styles.organisationName} numberOfLines={1}>
                          {user.organisationName}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isActive ? styles.activeStatusBadge : styles.inactiveStatusBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isActive ? styles.activeStatusText : styles.inactiveStatusText,
                      ]}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                <View style={styles.roleRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{formatRole(user.role)}</Text>
                  </View>

                  {activityText ? (
                    <Text style={styles.activityText}>{activityText}</Text>
                  ) : null}
                </View>

                <View style={styles.contactSection}>
                  <Text style={styles.contactText}>{user.email}</Text>
                  <Text style={styles.contactText}>{user.phone}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.userIdText}>User #{user.userId}</Text>

                  {isAdmin ? (
                    <Text style={styles.protectedText}>Protected account</Text>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      disabled={isUpdating}
                      onPress={() => confirmStatusChange(user)}
                      style={({ pressed }) => [
                        styles.actionButton,
                        isActive ? styles.deactivateButton : styles.activateButton,
                        (pressed || isUpdating) && styles.buttonPressed,
                      ]}
                    >
                      {isUpdating ? (
                        <ActivityIndicator
                          size="small"
                          color={isActive ? colours.critical : colours.accent}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.actionButtonText,
                            isActive
                              ? styles.deactivateButtonText
                              : styles.activateButtonText,
                          ]}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        : null}

      {!errorMessage ? (
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>i</Text>
          </View>

          <Text style={styles.infoText}>
            Deactivated accounts remain in the platform so their donation, request and
            delivery history is preserved.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colours.background,
  },

  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colours.background,
  },

  stateText: {
    marginTop: spacing.md,
    fontSize: fontSize.body,
    color: colours.textSecondary,
    textAlign: 'center',
  },

  title: {
    marginBottom: spacing.lg,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },

  searchInput: {
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
    fontSize: fontSize.body,
    color: colours.textPrimary,
  },

  roleFilterScroll: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },

  filterRow: {
    paddingRight: spacing.md,
  },

  filterChip: {
    minHeight: 40,
    marginRight: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },

  filterChipSelected: {
    borderColor: colours.accent,
    backgroundColor: colours.accent,
  },

  filterChipText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textSecondary,
  },

  filterChipTextSelected: {
    color: colours.textInverse,
  },

  statusRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    padding: 3,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  statusFilter: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius,
  },

  statusFilterSelected: {
    backgroundColor: colours.background,
  },

  statusFilterText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textSecondary,
  },

  statusFilterTextSelected: {
    color: colours.accent,
    fontWeight: fontWeight.semibold,
  },

  userCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },

  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  userIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },

  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colours.surface,
  },

  avatarText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colours.accent,
  },

  userNameBlock: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  userName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },

  organisationName: {
    marginTop: 2,
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
  },

  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.radius,
  },

  activeStatusBadge: {
    backgroundColor: '#DCFCE7',
  },

  inactiveStatusBadge: {
    backgroundColor: '#FEE2E2',
  },

  statusBadgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
  },

  activeStatusText: {
    color: colours.safe,
  },

  inactiveStatusText: {
    color: colours.critical,
  },

  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },

  roleBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  roleBadgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },

  activityText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
  },

  contactSection: {
    marginTop: spacing.sm,
  },

  contactText: {
    marginTop: 2,
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: layout.borderWidth,
    borderTopColor: colours.border,
  },

  userIdText: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },

  protectedText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colours.textSecondary,
  },

  actionButton: {
    minWidth: 92,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.borderWidth,
    borderRadius: layout.radius,
  },

  deactivateButton: {
    borderColor: colours.critical,
    backgroundColor: colours.background,
  },

  activateButton: {
    borderColor: colours.accent,
    backgroundColor: colours.background,
  },

  actionButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
  },

  deactivateButtonText: {
    color: colours.critical,
  },

  activateButtonText: {
    color: colours.accent,
  },

  emptyCard: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  emptyTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    textAlign: 'center',
  },

  emptyText: {
    marginTop: spacing.sm,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
    textAlign: 'center',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  infoIcon: {
    width: 24,
    height: 24,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colours.accent,
  },

  infoIconText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textInverse,
  },

  infoText: {
    flex: 1,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
  },

  errorCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.critical,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  errorTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.critical,
  },

  errorMessage: {
    marginTop: spacing.sm,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
  },

  retryButton: {
    alignSelf: 'flex-start',
    minHeight: layout.controlHeight,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius,
    backgroundColor: colours.critical,
  },

  retryButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textInverse,
  },

  buttonPressed: {
    opacity: 0.8,
  },
});
