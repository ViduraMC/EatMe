import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, ScreenContainer } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';

/**
 * Placeholder for the shared profile screen (Figma frame "01 Profile").
 *
 * Sprint 1 only needs the third tab to exist and a way to sign out while
 * testing the login to driver stack path.
 */
export function DriverProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Profile</Text>

      <Card>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.meta}>{user?.phone}</Text>
        <Text style={styles.meta}>
          {user?.isAvailable ? 'Available for deliveries' : 'Not available'}
        </Text>
      </Card>

      <View style={styles.actions}>
        <Button label="Log out" variant="secondary" onPress={() => void logout()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
    marginBottom: spacing.lg,
  },
  name: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  meta: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.xs,
  },
  actions: { marginTop: spacing.lg },
});
