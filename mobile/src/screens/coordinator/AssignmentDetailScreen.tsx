import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  fetchAssignmentDetail,
  fetchDrivers,
  reassignDriver,
} from '../../api/assignments.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import { formatDateTime } from '../../utils/datetime';
import type {
  AssignmentDetail,
  AssignmentStatus,
  DriverInfo,
} from '../../types/assignment';
import type { CoordinatorStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CoordinatorStackParamList, 'AssignmentDetail'>;

function statusTone(
  status: AssignmentStatus,
): 'safe' | 'urgent' | 'critical' | 'neutral' {
  switch (status) {
    case 'pending_driver':
      return 'urgent';
    case 'accepted':
    case 'in_transit':
      return 'safe';
    case 'completed':
      return 'neutral';
    case 'declined':
    case 'cancelled':
      return 'critical';
    default:
      return 'neutral';
  }
}

function statusLabel(status: AssignmentStatus): string {
  switch (status) {
    case 'pending_driver':
      return 'Awaiting Driver';
    case 'accepted':
      return 'Driver Accepted';
    case 'in_transit':
      return 'In Transit';
    case 'completed':
      return 'Completed';
    case 'declined':
      return 'Driver Declined';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function AssignmentDetailScreen({ route, navigation }: Props) {
  const { assignmentId } = route.params;

  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reassign Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [reassignNote, setReassignNote] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchAssignmentDetail(assignmentId);
      setDetail(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openReassignModal = useCallback(async () => {
    setModalVisible(true);
    setLoadingDrivers(true);
    try {
      const driverList = await fetchDrivers();
      setDrivers(driverList);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLoadingDrivers(false);
    }
  }, []);

  const handleReassign = useCallback(async () => {
    if (!selectedDriverId || !detail) {
      Alert.alert('Select Driver', 'Please select a driver to reassign.');
      return;
    }

    setReassigning(true);
    try {
      await reassignDriver(detail.assignmentId, {
        requestId: detail.requestId,
        driverId: selectedDriverId,
        noteToDriver: reassignNote.trim() || null,
      });
      setModalVisible(false);
      setSelectedDriverId(null);
      setReassignNote('');
      Alert.alert('Success', 'Assignment reassigned to new driver!');
      void load();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setReassigning(false);
    }
  }, [selectedDriverId, detail, reassignNote, load]);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      </ScreenContainer>
    );
  }

  if (!detail) {
    return (
      <ScreenContainer>
        <View style={styles.centre}>
          <Text style={styles.errorText}>Assignment not found.</Text>
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

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {!!error && <Text style={styles.error}>{error}</Text>}

        {/* Status Header */}
        <Card style={styles.headerCard}>
          <View style={styles.cardTop}>
            <Text style={styles.title} numberOfLines={1}>
              {detail.request.listing.title}
            </Text>
            <StatusPill
              label={statusLabel(detail.status)}
              tone={statusTone(detail.status)}
            />
          </View>
          <Text style={styles.subText}>Assignment #{detail.assignmentId}</Text>
        </Card>

        {/* Declined Alert Banner */}
        {detail.status === 'declined' && (
          <Card style={styles.declinedBanner}>
            <Text style={styles.declinedTitle}>⚠️ Driver Declined Assignment</Text>
            {detail.declineReason ? (
              <Text style={styles.declinedReason}>Reason: "{detail.declineReason}"</Text>
            ) : (
              <Text style={styles.declinedReason}>No reason provided.</Text>
            )}
            <Button
              label="Reassign Driver Now"
              variant="primary"
              onPress={() => void openReassignModal()}
              style={styles.reassignBtn}
            />
          </Card>
        )}

        {/* Driver Details */}
        <Text style={styles.sectionTitle}>Assigned Driver</Text>
        <Card>
          <Text style={styles.driverName}>{detail.driver.name}</Text>
          <Text style={styles.detailMeta}>Phone: {detail.driver.phone || 'N/A'}</Text>
          <Text style={styles.detailMeta}>
            Status: {detail.driver.isAvailable ? '● Available' : '○ Busy'}
          </Text>
          {detail.noteToDriver ? (
            <Text style={styles.noteText}>
              Note sent to driver: {detail.noteToDriver}
            </Text>
          ) : null}
        </Card>

        {/* Pickup & Dropoff Info */}
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        <Card>
          <Text style={styles.detailLabel}>Donor</Text>
          <Text style={styles.detailValue}>
            {detail.request.listing.donor.organisationName ??
              detail.request.listing.donor.name}
          </Text>
          <Text style={styles.detailValue}>
            📍 {detail.request.listing.pickupAddress}
          </Text>

          <Text style={styles.detailLabel}>Recipient</Text>
          <Text style={styles.detailValue}>
            {detail.request.recipient.organisationName ?? detail.request.recipient.name}
          </Text>

          <Text style={styles.detailLabel}>Items</Text>
          {detail.request.items.map((ri) => (
            <Text key={ri.requestItemId} style={styles.detailValue}>
              • {ri.item.foodName} — {ri.quantityRequested} {ri.item.unit}
            </Text>
          ))}
        </Card>

        {/* Timeline */}
        <Text style={styles.sectionTitle}>Status Timeline</Text>
        <Card style={styles.timelineCard}>
          {detail.timeline.length === 0 ? (
            <Text style={styles.emptyText}>No status events logged yet.</Text>
          ) : (
            detail.timeline.map((t, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineEvent}>{t.event}</Text>
                  <Text style={styles.timelineTime}>{formatDateTime(t.timestamp)}</Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Related Reassignments */}
        {detail.relatedAssignments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Assignment History</Text>
            <Card>
              {detail.relatedAssignments.map((rel) => (
                <View key={rel.assignmentId} style={styles.historyRow}>
                  <Text style={styles.historyText}>
                    Driver: {rel.driver.name} ({statusLabel(rel.status)})
                  </Text>
                  <Text style={styles.historyTime}>{formatDateTime(rel.assignedAt)}</Text>
                  {rel.declineReason ? (
                    <Text style={styles.historyDecline}>
                      Declined: "{rel.declineReason}"
                    </Text>
                  ) : null}
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>

      {/* Reassign Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reassign Driver</Text>
            <Text style={styles.modalSub}>
              Select a new driver to take over this delivery:
            </Text>

            {loadingDrivers ? (
              <ActivityIndicator
                size="small"
                color={colours.accent}
                style={{ marginVertical: spacing.md }}
              />
            ) : drivers.length === 0 ? (
              <Text style={styles.emptyText}>No available drivers currently.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 200 }}>
                {drivers.map((drv) => {
                  const selected = selectedDriverId === drv.userId;
                  return (
                    <TouchableOpacity
                      key={drv.userId}
                      style={[styles.driverRow, selected && styles.driverRowSelected]}
                      onPress={() => setSelectedDriverId(drv.userId)}
                    >
                      <View style={styles.radio}>
                        {selected && <View style={styles.radioFill} />}
                      </View>
                      <View>
                        <Text style={styles.driverRowName}>{drv.name}</Text>
                        <Text style={styles.driverRowMeta}>
                          {drv.isAvailable ? 'Available' : 'Busy'} · {drv.phone}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <Text style={styles.detailLabel}>Note to Driver (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Urgent reassignment for pickup"
              placeholderTextColor={colours.textSecondary}
              value={reassignNote}
              onChangeText={setReassignNote}
            />

            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                label={reassigning ? 'Reassigning…' : 'Confirm'}
                variant="primary"
                onPress={() => void handleReassign()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: spacing.md,
  },
  backButton: { alignSelf: 'center' },
  headerCard: { marginBottom: spacing.md },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  subText: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: 4,
  },
  declinedBanner: {
    backgroundColor: '#FFF5F5',
    borderColor: colours.critical,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  declinedTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.critical,
    marginBottom: 4,
  },
  declinedReason: {
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  reassignBtn: { marginTop: spacing.xs },
  sectionTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  driverName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  detailMeta: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: 2,
  },
  noteText: {
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.textSecondary,
    marginTop: spacing.sm,
  },
  detailValue: {
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
    lineHeight: 20,
  },
  timelineCard: { paddingVertical: spacing.sm },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colours.accent,
    marginTop: 4,
  },
  timelineContent: { flex: 1 },
  timelineEvent: {
    fontSize: fontSize.body,
    color: colours.textPrimary,
    fontWeight: fontWeight.medium,
  },
  timelineTime: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  emptyText: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    fontStyle: 'italic',
  },
  historyRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  historyText: {
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
    fontWeight: fontWeight.medium,
  },
  historyTime: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  historyDecline: {
    fontSize: fontSize.label,
    color: colours.critical,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colours.background,
    borderRadius: spacing.md,
    padding: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  modalSub: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginBottom: spacing.sm,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: spacing.xs,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  driverRowSelected: {
    borderColor: colours.accent,
    backgroundColor: colours.surface,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colours.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioFill: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colours.accent,
  },
  driverRowName: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  driverRowMeta: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  modalInput: {
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: spacing.xs,
    padding: spacing.sm,
    color: colours.textPrimary,
    fontSize: fontSize.secondary,
    marginVertical: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
