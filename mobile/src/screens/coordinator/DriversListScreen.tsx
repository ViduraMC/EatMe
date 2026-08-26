import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Card, Input, ScreenContainer, StatusPill } from '../../components';
import { fetchDrivers } from '../../api/assignments.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import type { DriverInfo } from '../../types/assignment';

export function DriversListScreen() {
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      setDrivers(await fetchDrivers());
    } catch (err) {
      setError(getErrorMessage(err));
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

  const handleCall = (phone: string) => {
    void Linking.openURL(`tel:${phone}`).catch(() => {
      // Quietly fail if simulator has no dialer
    });
  };

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search),
  );

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Input
        label="Search Drivers"
        placeholder="Search by name, email, or phone..."
        value={search}
        onChangeText={setSearch}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={filteredDrivers}
        keyExtractor={(item) => String(item.userId)}
        refreshing={refreshing}
        onRefresh={() => void load(true)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          filteredDrivers.length === 0 ? styles.emptyWrap : undefined
        }
        ListEmptyComponent={
          <View style={styles.centre}>
            <Text style={styles.emptyText}>
              {search ? 'No drivers match your search' : 'No drivers available'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.driverCard}>
            <View style={styles.cardHeader}>
              <View style={styles.driverMeta}>
                <Text style={styles.driverName}>{item.name}</Text>
                <Text style={styles.driverEmail}>{item.email}</Text>
              </View>
              <StatusPill
                label={item.isAvailable ? 'Available' : 'Busy'}
                tone={item.isAvailable ? 'safe' : 'neutral'}
              />
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{item.address}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Phone:</Text>
              <TouchableOpacity onPress={() => handleCall(item.phone)}>
                <Text style={styles.phoneLink}>{item.phone}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.sm,
  },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  emptyText: {
    fontSize: fontSize.body,
    color: colours.textSecondary,
    textAlign: 'center',
  },
  driverCard: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  driverMeta: {
    flexShrink: 1,
  },
  driverName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  driverEmail: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    width: 80,
  },
  value: {
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
    flex: 1,
  },
  phoneLink: {
    fontSize: fontSize.secondary,
    color: colours.accent,
    fontWeight: fontWeight.medium,
    textDecorationLine: 'underline',
  },
});
