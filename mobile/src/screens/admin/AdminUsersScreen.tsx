import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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

type UserResponse = ApiSuccess<{
  user: AdminUser;
}>;

type RoleFilter = 'all' | UserRole;
type StatusFilter = 'all' | UserStatus;
type StaffRole = 'coordinator' | 'driver';

interface StaffFormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  role: StaffRole;
}

const EMPTY_STAFF_FORM: StaffFormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  role: 'coordinator',
};

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
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Rejected', value: 'rejected' },
];

function formatRole(role: UserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatStatus(status: UserStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
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

function isStaffUser(user: AdminUser): user is AdminUser & { role: StaffRole } {
  return user.role === 'coordinator' || user.role === 'driver';
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

  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AdminUser | null>(null);
  const [staffForm, setStaffForm] = useState<StaffFormState>(EMPTY_STAFF_FORM);
  const [staffFormError, setStaffFormError] = useState<string | null>(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);

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
        user.status.toLowerCase().includes(normalisedQuery) ||
        (user.organisationName?.toLowerCase().includes(normalisedQuery) ?? false)
      );
    });
  }, [roleFilter, searchQuery, statusFilter, users]);

  const replaceUser = useCallback((updatedUser: AdminUser) => {
    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.userId === updatedUser.userId ? updatedUser : currentUser,
      ),
    );
  }, []);

  const updateUserStatus = useCallback(
    async (user: AdminUser, nextStatus: UserStatus) => {
      setUpdatingUserId(user.userId);

      try {
        const response = await api.patch<UserResponse>(
          `/admin/users/${user.userId}/status`,
          {
            status: nextStatus,
          },
        );

        replaceUser(response.data.data.user);
      } catch (error) {
        Alert.alert('Could not update user', getErrorMessage(error));
      } finally {
        setUpdatingUserId(null);
      }
    },
    [replaceUser],
  );

  const approveRecipient = useCallback(
    (user: AdminUser) => {
      Alert.alert(
        'Approve recipient?',
        `Approve ${user.name}'s recipient account? They will be able to sign in after approval.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Approve',
            onPress: () => {
              void updateUserStatus(user, 'active');
            },
          },
        ],
      );
    },
    [updateUserStatus],
  );

  const rejectRecipient = useCallback(
    (user: AdminUser) => {
      Alert.alert('Reject recipient?', `Reject ${user.name}'s recipient registration?`, [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            void updateUserStatus(user, 'rejected');
          },
        },
      ]);
    },
    [updateUserStatus],
  );

  const confirmStatusChange = useCallback(
    (user: AdminUser) => {
      if (
        user.role === 'admin' ||
        user.status === 'pending' ||
        user.status === 'rejected'
      ) {
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

  const openCreateStaff = useCallback(() => {
    setEditingStaff(null);
    setStaffForm(EMPTY_STAFF_FORM);
    setStaffFormError(null);
    setStaffModalVisible(true);
  }, []);

  const openEditStaff = useCallback((user: AdminUser) => {
    if (!isStaffUser(user)) {
      return;
    }

    setEditingStaff(user);
    setStaffForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      password: '',
      role: user.role,
    });
    setStaffFormError(null);
    setStaffModalVisible(true);
  }, []);

  const closeStaffModal = useCallback(() => {
    if (isSavingStaff) {
      return;
    }

    setStaffModalVisible(false);
    setEditingStaff(null);
    setStaffForm(EMPTY_STAFF_FORM);
    setStaffFormError(null);
  }, [isSavingStaff]);

  const saveStaff = useCallback(async () => {
    setStaffFormError(null);

    const name = staffForm.name.trim();
    const email = staffForm.email.trim();
    const phone = staffForm.phone.trim();
    const address = staffForm.address.trim();

    if (!name || !email || !phone || !address) {
      setStaffFormError('Fill in every required field.');
      return;
    }

    if (!email.includes('@')) {
      setStaffFormError('Enter a valid email address.');
      return;
    }

    if (!editingStaff && staffForm.password.length < 8) {
      setStaffFormError('Password must be at least 8 characters.');
      return;
    }

    setIsSavingStaff(true);

    try {
      if (editingStaff) {
        const response = await api.put<UserResponse>(
          `/admin/users/${editingStaff.userId}/staff`,
          {
            name,
            email,
            phone,
            address,
          },
        );

        replaceUser(response.data.data.user);

        setStaffModalVisible(false);
        setEditingStaff(null);
        setStaffForm(EMPTY_STAFF_FORM);

        Alert.alert('Staff updated', 'The staff account was updated successfully.');
      } else {
        const response = await api.post<UserResponse>('/admin/users/staff', {
          name,
          email,
          password: staffForm.password,
          phone,
          address,
          role: staffForm.role,
        });

        setUsers((currentUsers) => [response.data.data.user, ...currentUsers]);

        setStaffModalVisible(false);
        setStaffForm(EMPTY_STAFF_FORM);

        Alert.alert(
          'Staff account created',
          `${formatRole(response.data.data.user.role)} account created successfully.`,
        );
      }
    } catch (error) {
      setStaffFormError(getErrorMessage(error));
    } finally {
      setIsSavingStaff(false);
    }
  }, [editingStaff, replaceUser, staffForm]);

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colours.accent} />
        <Text style={styles.stateText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <>
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
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Users</Text>
            <Text style={styles.subtitle}>
              Manage accounts, approvals and platform staff.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={openCreateStaff}
            style={({ pressed }) => [
              styles.addStaffButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.addStaffButtonText}>+ Staff</Text>
          </Pressable>
        </View>

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
                  style={[
                    styles.filterChipText,
                    selected && styles.filterChipTextSelected,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusFilterRow}
          style={styles.statusFilterScroll}
        >
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
        </ScrollView>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load users</Text>

            <Text style={styles.errorMessage}>{errorMessage}</Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.buttonPressed,
              ]}
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
              const isStaff = isStaffUser(user);
              const isPendingRecipient =
                user.role === 'recipient' && user.status === 'pending';

              const isUpdating = updatingUserId === user.userId;

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
                        user.status === 'active' && styles.activeStatusBadge,
                        user.status === 'inactive' && styles.inactiveStatusBadge,
                        user.status === 'pending' && styles.pendingStatusBadge,
                        user.status === 'rejected' && styles.rejectedStatusBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          user.status === 'active' && styles.activeStatusText,
                          user.status === 'inactive' && styles.inactiveStatusText,
                          user.status === 'pending' && styles.pendingStatusText,
                          user.status === 'rejected' && styles.rejectedStatusText,
                        ]}
                      >
                        {formatStatus(user.status)}
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
                    <Text style={styles.addressText}>{user.address}</Text>
                  </View>

                  {isPendingRecipient ? (
                    <View style={styles.pendingNotice}>
                      <Text style={styles.pendingNoticeText}>
                        This recipient is waiting for administrator approval.
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={styles.userIdText}>User #{user.userId}</Text>

                    {isAdmin ? (
                      <Text style={styles.protectedText}>Protected account</Text>
                    ) : null}

                    {isPendingRecipient ? (
                      <View style={styles.actionGroup}>
                        <Pressable
                          accessibilityRole="button"
                          disabled={isUpdating}
                          onPress={() => rejectRecipient(user)}
                          style={({ pressed }) => [
                            styles.smallActionButton,
                            styles.rejectButton,
                            (pressed || isUpdating) && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          disabled={isUpdating}
                          onPress={() => approveRecipient(user)}
                          style={({ pressed }) => [
                            styles.smallActionButton,
                            styles.approveButton,
                            (pressed || isUpdating) && styles.buttonPressed,
                          ]}
                        >
                          {isUpdating ? (
                            <ActivityIndicator size="small" color={colours.textInverse} />
                          ) : (
                            <Text style={styles.approveButtonText}>Approve</Text>
                          )}
                        </Pressable>
                      </View>
                    ) : null}

                    {!isAdmin && !isPendingRecipient && user.status !== 'rejected' ? (
                      <View style={styles.actionGroup}>
                        {isStaff ? (
                          <Pressable
                            accessibilityRole="button"
                            disabled={isUpdating}
                            onPress={() => openEditStaff(user)}
                            style={({ pressed }) => [
                              styles.smallActionButton,
                              styles.editButton,
                              (pressed || isUpdating) && styles.buttonPressed,
                            ]}
                          >
                            <Text style={styles.editButtonText}>Edit</Text>
                          </Pressable>
                        ) : null}

                        <Pressable
                          accessibilityRole="button"
                          disabled={isUpdating}
                          onPress={() => confirmStatusChange(user)}
                          style={({ pressed }) => [
                            styles.smallActionButton,
                            user.status === 'active'
                              ? styles.deactivateButton
                              : styles.activateButton,
                            (pressed || isUpdating) && styles.buttonPressed,
                          ]}
                        >
                          {isUpdating ? (
                            <ActivityIndicator
                              size="small"
                              color={
                                user.status === 'active'
                                  ? colours.critical
                                  : colours.accent
                              }
                            />
                          ) : (
                            <Text
                              style={[
                                styles.actionButtonText,
                                user.status === 'active'
                                  ? styles.deactivateButtonText
                                  : styles.activateButtonText,
                              ]}
                            >
                              {user.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    ) : null}

                    {user.status === 'rejected' ? (
                      <Text style={styles.rejectedAccountText}>
                        Registration rejected
                      </Text>
                    ) : null}
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
              Donors manage their own registration. Recipients require administrator
              approval. Coordinator and driver accounts are created and maintained by
              administrators. Deactivated accounts are retained to preserve platform
              history.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={staffModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeStaffModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleBlock}>
                  <Text style={styles.modalTitle}>
                    {editingStaff ? 'Edit staff account' : 'Create staff account'}
                  </Text>

                  <Text style={styles.modalSubtitle}>
                    {editingStaff
                      ? `Update ${formatRole(editingStaff.role)} details`
                      : 'Create a coordinator or delivery person account'}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={isSavingStaff}
                  onPress={closeStaffModal}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              </View>

              {!editingStaff ? (
                <>
                  <Text style={styles.formLabel}>Role</Text>

                  <View style={styles.staffRoleRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: staffForm.role === 'coordinator',
                      }}
                      onPress={() =>
                        setStaffForm((current) => ({
                          ...current,
                          role: 'coordinator',
                        }))
                      }
                      style={({ pressed }) => [
                        styles.staffRoleOption,
                        staffForm.role === 'coordinator' &&
                          styles.staffRoleOptionSelected,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.staffRoleOptionText,
                          staffForm.role === 'coordinator' &&
                            styles.staffRoleOptionTextSelected,
                        ]}
                      >
                        Coordinator
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: staffForm.role === 'driver',
                      }}
                      onPress={() =>
                        setStaffForm((current) => ({
                          ...current,
                          role: 'driver',
                        }))
                      }
                      style={({ pressed }) => [
                        styles.staffRoleOption,
                        staffForm.role === 'driver' && styles.staffRoleOptionSelected,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.staffRoleOptionText,
                          staffForm.role === 'driver' &&
                            styles.staffRoleOptionTextSelected,
                        ]}
                      >
                        Delivery Person
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              <Text style={styles.formLabel}>Full name</Text>
              <TextInput
                value={staffForm.name}
                onChangeText={(value) =>
                  setStaffForm((current) => ({
                    ...current,
                    name: value,
                  }))
                }
                placeholder="Full name"
                placeholderTextColor={colours.textSecondary}
                style={styles.formInput}
              />

              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                value={staffForm.email}
                onChangeText={(value) =>
                  setStaffForm((current) => ({
                    ...current,
                    email: value,
                  }))
                }
                placeholder="staff@example.lk"
                placeholderTextColor={colours.textSecondary}
                style={styles.formInput}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />

              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                value={staffForm.phone}
                onChangeText={(value) =>
                  setStaffForm((current) => ({
                    ...current,
                    phone: value,
                  }))
                }
                placeholder="0771234567"
                placeholderTextColor={colours.textSecondary}
                style={styles.formInput}
                keyboardType="phone-pad"
              />

              <Text style={styles.formLabel}>Address</Text>
              <TextInput
                value={staffForm.address}
                onChangeText={(value) =>
                  setStaffForm((current) => ({
                    ...current,
                    address: value,
                  }))
                }
                placeholder="Full address"
                placeholderTextColor={colours.textSecondary}
                style={[styles.formInput, styles.addressInput]}
                multiline
              />

              {!editingStaff ? (
                <>
                  <Text style={styles.formLabel}>Temporary password</Text>
                  <TextInput
                    value={staffForm.password}
                    onChangeText={(value) =>
                      setStaffForm((current) => ({
                        ...current,
                        password: value,
                      }))
                    }
                    placeholder="At least 8 characters"
                    placeholderTextColor={colours.textSecondary}
                    style={styles.formInput}
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  <Text style={styles.passwordHint}>
                    Give this password to the staff member so they can sign in.
                  </Text>
                </>
              ) : null}

              {staffFormError ? (
                <View style={styles.formErrorCard}>
                  <Text style={styles.formErrorText}>{staffFormError}</Text>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSavingStaff}
                  onPress={closeStaffModal}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={isSavingStaff}
                  onPress={() => {
                    void saveStaff();
                  }}
                  style={({ pressed }) => [
                    styles.saveButton,
                    (pressed || isSavingStaff) && styles.buttonPressed,
                  ]}
                >
                  {isSavingStaff ? (
                    <ActivityIndicator size="small" color={colours.textInverse} />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingStaff ? 'Save changes' : 'Create account'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },

  titleBlock: {
    flex: 1,
    paddingRight: spacing.sm,
  },

  title: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },

  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    lineHeight: 19,
    color: colours.textSecondary,
  },

  addStaffButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius,
    backgroundColor: colours.accent,
  },

  addStaffButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textInverse,
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

  statusFilterScroll: {
    marginBottom: spacing.lg,
  },

  statusFilterRow: {
    paddingRight: spacing.md,
  },

  statusFilter: {
    minHeight: 38,
    marginRight: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },

  statusFilterSelected: {
    borderColor: colours.accent,
    backgroundColor: colours.surface,
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

  pendingStatusBadge: {
    backgroundColor: '#FEF3C7',
  },

  rejectedStatusBadge: {
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

  pendingStatusText: {
    color: '#92400E',
  },

  rejectedStatusText: {
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

  addressText: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    lineHeight: 17,
    color: colours.textSecondary,
  },

  pendingNotice: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: layout.radius,
    backgroundColor: '#FFFBEB',
  },

  pendingNoticeText: {
    fontSize: fontSize.secondary,
    lineHeight: 19,
    color: '#92400E',
  },

  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
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

  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  smallActionButton: {
    minHeight: 36,
    minWidth: 72,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.borderWidth,
    borderRadius: layout.radius,
  },

  editButton: {
    borderColor: colours.border,
    backgroundColor: colours.surface,
  },

  editButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },

  approveButton: {
    borderColor: colours.accent,
    backgroundColor: colours.accent,
  },

  approveButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textInverse,
  },

  rejectButton: {
    borderColor: colours.critical,
    backgroundColor: colours.background,
  },

  rejectButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.critical,
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

  rejectedAccountText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colours.critical,
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

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  modalCard: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colours.background,
  },

  modalContent: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },

  modalTitleBlock: {
    flex: 1,
    paddingRight: spacing.md,
  },

  modalTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },

  modalSubtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    lineHeight: 19,
    color: colours.textSecondary,
  },

  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: colours.surface,
  },

  closeButtonText: {
    fontSize: 26,
    lineHeight: 28,
    color: colours.textSecondary,
  },

  formLabel: {
    marginBottom: spacing.xs,
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },

  formInput: {
    minHeight: layout.controlHeight,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
    fontSize: fontSize.body,
    color: colours.textPrimary,
  },

  addressInput: {
    minHeight: 80,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },

  staffRoleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  staffRoleOption: {
    flex: 1,
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },

  staffRoleOptionSelected: {
    borderColor: colours.accent,
    backgroundColor: colours.surface,
  },

  staffRoleOptionText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textSecondary,
    textAlign: 'center',
  },

  staffRoleOptionTextSelected: {
    color: colours.accent,
    fontWeight: fontWeight.semibold,
  },

  passwordHint: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    fontSize: fontSize.label,
    lineHeight: 17,
    color: colours.textSecondary,
  },

  formErrorCard: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: layout.radius,
    backgroundColor: '#FEF2F2',
  },

  formErrorText: {
    fontSize: fontSize.secondary,
    lineHeight: 19,
    color: colours.critical,
  },

  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  cancelButton: {
    flex: 1,
    minHeight: layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },

  cancelButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },

  saveButton: {
    flex: 1,
    minHeight: layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius,
    backgroundColor: colours.accent,
  },

  saveButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textInverse,
  },

  buttonPressed: {
    opacity: 0.8,
  },
});
