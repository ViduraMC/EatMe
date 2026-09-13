import React, { useCallback } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import type { AdminStackParamList } from '../../navigation/types';

type AdminNavigation = NativeStackNavigationProp<AdminStackParamList>;

interface Props {
  visible: boolean;
  onClose: () => void;
  navigation: AdminNavigation;
}

interface MenuItem {
  label: string;
  route: keyof AdminStackParamList;
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', route: 'AdminHome' },
  { label: 'Donation Listings', route: 'AdminListings' },
  { label: 'Donation Requests', route: 'AdminRequests' },
  { label: 'Delivery Assignments', route: 'AdminAssignments' },
  { label: 'Users', route: 'AdminUsers' },
  { label: 'Reports', route: 'AdminReports' },
];

export function AdminMenu({ visible, onClose, navigation }: Props) {
  const { logout } = useAuth();

  const handleNavigate = useCallback(
    (route: keyof AdminStackParamList) => {
      onClose();
      navigation.navigate(route);
    },
    [navigation, onClose],
  );

  const handleLogout = useCallback(() => {
    onClose();

    Alert.alert(
      'Log out?',
      'Are you sure you want to log out of the administrator account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            void logout();
          },
        },
      ],
    );
  }, [logout, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.drawer}>
          <View style={styles.header}>
            <Text style={styles.brand}>EatMe</Text>
            <Text style={styles.subtitle}>Admin Menu</Text>
          </View>

          <View style={styles.menu}>
            {menuItems.map((item) => (
              <Pressable
                key={item.route}
                accessibilityRole="button"
                onPress={() => handleNavigate(item.route)}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <Text style={styles.menuItemText}>{item.label}</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.menuItemPressed,
              ]}
            >
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close admin menu"
          style={styles.backdrop}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  drawer: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: colours.background,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  backdrop: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.lg,
  },
  brand: {
    color: colours.accent,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold as '700',
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colours.textSecondary,
    fontSize: fontSize.label,
  },
  menu: {
    flex: 1,
    marginTop: spacing.md,
  },
  menuItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colours.border,
  },
  menuItemPressed: {
    opacity: 0.6,
  },
  menuItemText: {
    color: colours.textPrimary,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium as '500',
  },
  chevron: {
    color: colours.textSecondary,
    fontSize: 24,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colours.border,
    paddingTop: spacing.md,
  },
  logoutButton: {
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  logoutText: {
    color: '#B42318',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold as '600',
  },
});
