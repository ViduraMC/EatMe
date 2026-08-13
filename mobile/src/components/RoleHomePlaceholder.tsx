import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Card } from './Card';
import { ScreenContainer } from './ScreenContainer';
import { useAuth } from '../context/AuthContext';
import { colours, fontSize, fontWeight, spacing } from '../constants/theme';

interface RoleHomePlaceholderProps {
  roleLabel: string;
  owner: string;
  /** What this module will do, so the screen is not blank while it is built. */
  upcoming: string[];
}

/**
 * The stub every role lands on until its owner builds the real screens.
 *
 * It exists so that the shared foundation can be merged and demonstrated end to
 * end: log in as any role, see that the token worked and that the correct stack
 * loaded, and log out again. Each owner replaces their own screen.
 */
export function RoleHomePlaceholder({
  roleLabel,
  owner,
  upcoming,
}: RoleHomePlaceholderProps) {
  const { user, logout } = useAuth();

  return (
    <ScreenContainer scroll>
      <Text style={styles.role}>{roleLabel}</Text>
      <Text style={styles.greeting}>Signed in as {user?.name ?? 'unknown user'}</Text>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Row label="Email" value={user?.email ?? '-'} />
        <Row label="Role" value={user?.role ?? '-'} />
        {!!user?.organisationName && (
          <Row label="Organisation" value={user.organisationName} />
        )}
        <Row label="Status" value={user?.status ?? '-'} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>This module is not built yet</Text>
        <Text style={styles.cardBody}>
          Owned by {owner}. The screens below arrive in Sprint 1 and Sprint 2.
        </Text>
        {upcoming.map((item) => (
          <Text key={item} style={styles.upcoming}>
            {'•'} {item}
          </Text>
        ))}
      </Card>

      <Button label="Log Out" variant="secondary" onPress={() => void logout()} />
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  role: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  greeting: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  card: { marginBottom: spacing.md },
  cardTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    marginBottom: spacing.sm,
  },
  cardBody: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  upcoming: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  rowLabel: { fontSize: fontSize.secondary, color: colours.textSecondary },
  rowValue: {
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
  },
});
