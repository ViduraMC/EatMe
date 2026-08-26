import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, ScreenContainer, StatusPill } from '../../components';
import {
  createAssignment,
  fetchAssignmentQueue,
  fetchDrivers,
} from '../../api/assignments.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import { formatDateTime, formatTimeUntil } from '../../utils/datetime';
import type { AssignmentQueueRequest } from '../../types/assignment';
import type { DriverInfo } from '../../types/assignment';
import type { CoordinatorStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CoordinatorStackParamList, 'CreateAssignment'>;

export function CreateAssignmentScreen({ route, navigation }: Props) {
  const { requestId } = route.params;

  const [request, setRequest] = useState<AssignmentQueueRequest | null>(null);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [noteToDriver, setNoteToDriver] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [queue, driverList] = await Promise.all([
        fetchAssignmentQueue(),
        fetchDrivers(),
      ]);
      const found = queue.find((r) => r.requestId === requestId) ?? null;
      setRequest(found);
      setDrivers(driverList);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedDriverId) {
      Alert.alert('Select Driver', 'Please select a driver before assigning.');
      return;
    }

    setSubmitting(true);
    try {
      await createAssignment({
        requestId,
        driverId: selectedDriverId,
        noteToDriver: noteToDriver.trim() || null,
      });
      Alert.alert('Success', 'Driver assigned successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, [requestId, selectedDriverId, noteToDriver, navigation]);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      </ScreenContainer>
    );
  }

  if (!request) {
    return (
      <ScreenContainer>
        <View style={styles.centre}>
          <Text style={styles.errorText}>Request not found or already assigned.</Text>
          <Button
            label="Go Back"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>
      </ScreenContainer>
    );
  }

  const worstLevel = request.items.some((i) => i.item.urgencyLevel === 'critical')
    ? 'critical'
    : request.items.some((i) => i.item.urgencyLevel === 'urgent')
      ? 'urgent'
      : 'safe';

  const soonestExpiry =
    request.items
      .map((i) => i.item.effectiveExpiry)
      .filter((d): d is string => !!d)
      .sort()[0] ?? null;

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!!error && <Text style={styles.error}>{error}</Text>}

        {/* Request summary */}
        <Text style={styles.sectionTitle}>Request Details</Text>
        <Card style={styles.summaryCard}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {request.listing.title}
            </Text>
            <StatusPill label={worstLevel} tone={worstLevel} />
          </View>

          <Text style={styles.detailLabel}>Donor</Text>
          <Text style={styles.detailValue}>
            {request.listing.donor.organisationName ?? request.listing.donor.name}
          </Text>
          <Text style={styles.detailValue}>{request.listing.pickupAddress}</Text>

          <Text style={styles.detailLabel}>Recipient</Text>
          <Text style={styles.detailValue}>
            {request.recipient.organisationName ?? request.recipient.name}
          </Text>

          <Text style={styles.detailLabel}>Items to Deliver</Text>
          {request.items.map((ri) => (
            <Text key={ri.requestItemId} style={styles.detailValue}>
              • {ri.item.foodName} — {ri.quantityRequested} {ri.item.unit}
            </Text>
          ))}

          <Text style={styles.detailLabel}>Pickup Window</Text>
          <Text style={styles.detailValue}>
            {formatDateTime(request.listing.pickupWindowStart)} →{' '}
            {formatDateTime(request.listing.pickupWindowEnd)}
          </Text>

          {soonestExpiry && (
            <>
              <Text style={styles.detailLabel}>Soonest Expiry</Text>
              <Text
                style={[
                  styles.detailValue,
                  worstLevel === 'critical' && styles.criticalText,
                ]}
              >
                {formatTimeUntil(soonestExpiry)}
              </Text>
            </>
          )}
        </Card>

        {/* Driver selection */}
        <Text style={styles.sectionTitle}>Select Driver</Text>
        {drivers.length === 0 ? (
          <Text style={styles.emptyDrivers}>
            No active drivers are currently available.
          </Text>
        ) : (
          drivers.map((driver) => {
            const isSelected = selectedDriverId === driver.userId;
            return (
              <TouchableOpacity
                key={driver.userId}
                style={[styles.driverRow, isSelected && styles.driverRowSelected]}
                onPress={() => setSelectedDriverId(driver.userId)}
                activeOpacity={0.7}
              >
                <View style={styles.driverRadio}>
                  {isSelected && <View style={styles.driverRadioFill} />}
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <Text style={styles.driverMeta}>
                    {driver.isAvailable ? '● Available' : '○ Busy'} ·{' '}
                    {driver.phone ?? '—'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Note to driver */}
        <Text style={styles.sectionTitle}>Note to Driver (optional)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="e.g. Call when arriving at pickup address"
          placeholderTextColor={colours.textSecondary}
          value={noteToDriver}
          onChangeText={setNoteToDriver}
          multiline
          numberOfLines={3}
          maxLength={1000}
        />

        <Button
          label={submitting ? 'Assigning…' : 'Create Assignment'}
          variant="primary"
          onPress={() => void handleSubmit()}
          style={styles.submitButton}
        />
      </ScrollView>
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
  errorText: {
    color: colours.textSecondary,
    fontSize: fontSize.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  backButton: { alignSelf: 'center' },
  sectionTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryCard: {},
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  detailLabel: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    marginTop: spacing.sm,
    fontWeight: fontWeight.semibold,
  },
  detailValue: {
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
    lineHeight: 20,
  },
  criticalText: {
    color: colours.critical,
    fontWeight: fontWeight.semibold,
  },
  emptyDrivers: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  driverRowSelected: {
    borderColor: colours.accent,
    backgroundColor: colours.surface,
  },
  driverRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colours.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverRadioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colours.accent,
  },
  driverInfo: { flex: 1 },
  driverName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  driverMeta: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: 2,
  },
  noteInput: {
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: spacing.sm,
    padding: spacing.md,
    color: colours.textPrimary,
    fontSize: fontSize.body,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
