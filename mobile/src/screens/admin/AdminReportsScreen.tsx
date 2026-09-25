import React, { useCallback, useEffect, useState } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

import { api, getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';

import type { AdminTabProps } from '../../navigation/types';

type Props = AdminTabProps<'AdminReports'>;

type ReportType = 'overall' | 'users' | 'donations' | 'requests' | 'deliveries';

type ReportStatus = 'draft' | 'finalized';

type ReportStatusFilter = 'all' | ReportStatus;
type ReportTypeFilter = 'all' | ReportType;

interface AdminReport {
  reportId: number;
  adminId: number;
  title: string;
  type: ReportType;
  status: ReportStatus;
  startDate: string;
  endDate: string;
  data: Record<string, unknown>;
  finalizedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReportsResponse {
  success: true;
  data: {
    reports: AdminReport[];
  };
}

interface ReportResponse {
  success: true;
  data: {
    report: AdminReport;
  };
}

const REPORT_TYPES: Array<{ label: string; value: ReportType }> = [
  { label: 'Overall', value: 'overall' },
  { label: 'Users', value: 'users' },
  { label: 'Donations', value: 'donations' },
  { label: 'Requests', value: 'requests' },
  { label: 'Deliveries', value: 'deliveries' },
];

const REPORT_STATUS_FILTERS: Array<{
  label: string;
  value: ReportStatusFilter;
}> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Finalized', value: 'finalized' },
];

const REPORT_TYPE_FILTERS: Array<{
  label: string;
  value: ReportTypeFilter;
}> = [{ label: 'All', value: 'all' }, ...REPORT_TYPES];

function todayIsoStart(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function stringifyReportData(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (char) => char.toUpperCase());

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = Object.entries(value as Record<string, unknown>)
          .map(([nestedKey, nestedValue]) => {
            const nestedLabel = nestedKey
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, (char) => char.toUpperCase());

            return `${nestedLabel}: ${String(nestedValue)}`;
          })
          .join(' · ');

        return `${label}: ${nested}`;
      }

      return `${label}: ${String(value)}`;
    })
    .join('\n');
}

export function AdminReportsScreen(_props: Props) {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [deletedReports, setDeletedReports] = useState<AdminReport[]>([]);

  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState<ReportType>('overall');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<ReportTypeFilter>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [busyReportId, setBusyReportId] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadReports = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) {
      setIsLoading(true);
    }

    try {
      setErrorMessage(null);

      const [activeResponse, deletedResponse] = await Promise.all([
        api.get<ReportsResponse>('/admin/reports'),
        api.get<ReportsResponse>('/admin/reports/deleted'),
      ]);

      setReports(activeResponse.data.data.reports);
      setDeletedReports(deletedResponse.data.data.reports);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReports(true);
  }, [loadReports]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadReports();
  }, [loadReports]);

  const handleCreateReport = useCallback(async () => {
    const trimmedTitle = title.trim();

    if (trimmedTitle.length < 2) {
      Alert.alert('Report title required', 'Enter a title before generating the report.');
      return;
    }

    try {
      setIsCreating(true);

      const response = await api.post<ReportResponse>('/admin/reports', {
        title: trimmedTitle,
        type: reportType,
        startDate: monthStartIso(),
        endDate: todayIsoStart(),
      });

      setReports((current) => [response.data.data.report, ...current]);
      setTitle('');
      setReportType('overall');
      setIsCreateModalVisible(false);

      Alert.alert('Report generated', 'The report has been created as a draft.');
    } catch (error) {
      Alert.alert('Could not generate report', getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }, [reportType, title]);

  const handleDownloadReport = useCallback(async (report: AdminReport) => {
    if (report.status !== 'finalized') {
      Alert.alert('Report not finalized', 'Only finalized reports can be downloaded.');
      return;
    }

    try {
      setBusyReportId(report.reportId);

      const response = await api.get<ArrayBuffer>(
        `/admin/reports/${report.reportId}/download`,
        {
          responseType: 'arraybuffer',
        },
      );

      const file = new File(Paths.cache, `eatme-report-${report.reportId}.pdf`);

      if (file.exists) {
        file.delete();
      }

      file.create();

      const bytes = new Uint8Array(response.data);
      file.write(bytes);

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert('PDF downloaded', 'The report PDF was generated successfully.');
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: report.title,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      Alert.alert('Could not download report', getErrorMessage(error));
    } finally {
      setBusyReportId(null);
    }
  }, []);

  const handleRenameReport = useCallback((report: AdminReport) => {
    if (report.status === 'finalized') {
      Alert.alert('Report finalized', 'Finalized reports cannot be renamed.');
      return;
    }

    Alert.prompt(
      'Rename report',
      'Enter a new title.',
      async (value) => {
        const nextTitle = value?.trim();

        if (!nextTitle || nextTitle.length < 2) {
          Alert.alert(
            'Invalid title',
            'Report title must contain at least 2 characters.',
          );
          return;
        }

        if (nextTitle.length > 150) {
          Alert.alert('Invalid title', 'Report title cannot exceed 150 characters.');
          return;
        }

        try {
          setBusyReportId(report.reportId);

          const response = await api.put<ReportResponse>(
            `/admin/reports/${report.reportId}`,
            {
              title: nextTitle,
            },
          );

          setReports((current) =>
            current.map((item) =>
              item.reportId === report.reportId ? response.data.data.report : item,
            ),
          );
        } catch (error) {
          Alert.alert('Could not rename report', getErrorMessage(error));
        } finally {
          setBusyReportId(null);
        }
      },
      'plain-text',
      report.title,
    );
  }, []);

  const handleFinalizeReport = useCallback((report: AdminReport) => {
    Alert.alert(
      'Finalize report?',
      `Finalize "${report.title}"? You will not be able to rename it afterwards.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Finalize',
          onPress: () => {
            void (async () => {
              try {
                setBusyReportId(report.reportId);

                const response = await api.patch<ReportResponse>(
                  `/admin/reports/${report.reportId}/finalize`,
                );

                setReports((current) =>
                  current.map((item) =>
                    item.reportId === report.reportId ? response.data.data.report : item,
                  ),
                );

                Alert.alert(
                  'Report finalized',
                  'This report is now locked from further editing.',
                );
              } catch (error) {
                Alert.alert('Could not finalize report', getErrorMessage(error));
              } finally {
                setBusyReportId(null);
              }
            })();
          },
        },
      ],
    );
  }, []);

  const handleDeleteReport = useCallback((report: AdminReport) => {
    Alert.alert(
      'Move report to deleted reports?',
      `"${report.title}" can be restored later.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setBusyReportId(report.reportId);

                await api.delete(`/admin/reports/${report.reportId}`);

                setReports((current) =>
                  current.filter((item) => item.reportId !== report.reportId),
                );

                const deletedCopy: AdminReport = {
                  ...report,
                  deletedAt: new Date().toISOString(),
                };

                setDeletedReports((current) => [
                  deletedCopy,
                  ...current.filter((item) => item.reportId !== report.reportId),
                ]);
              } catch (error) {
                Alert.alert('Could not delete report', getErrorMessage(error));
              } finally {
                setBusyReportId(null);
              }
            })();
          },
        },
      ],
    );
  }, []);

  const handleRestoreReport = useCallback((report: AdminReport) => {
    Alert.alert('Restore report?', `Restore "${report.title}" to saved reports?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Restore',
        onPress: () => {
          void (async () => {
            try {
              setBusyReportId(report.reportId);

              const response = await api.patch<ReportResponse>(
                `/admin/reports/${report.reportId}/restore`,
              );

              setDeletedReports((current) =>
                current.filter((item) => item.reportId !== report.reportId),
              );

              setReports((current) => [response.data.data.report, ...current]);
            } catch (error) {
              Alert.alert('Could not restore report', getErrorMessage(error));
            } finally {
              setBusyReportId(null);
            }
          })();
        },
      },
    ]);
  }, []);

  const handlePermanentDeleteReport = useCallback((report: AdminReport) => {
    Alert.alert(
      'Delete permanently?',
      `"${report.title}" will be removed permanently and cannot be restored.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setBusyReportId(report.reportId);

                await api.delete(`/admin/reports/${report.reportId}/permanent`);

                setDeletedReports((current) =>
                  current.filter((item) => item.reportId !== report.reportId),
                );

                Alert.alert('Report deleted', 'The report has been permanently removed.');
              } catch (error) {
                Alert.alert(
                  'Could not permanently delete report',
                  getErrorMessage(error),
                );
              } finally {
                setBusyReportId(null);
              }
            })();
          },
        },
      ],
    );
  }, []);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      report.title.toLowerCase().includes(normalizedSearchQuery);

    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;

    const matchesType = typeFilter === 'all' || report.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const hasActiveFilters =
    normalizedSearchQuery.length > 0 || statusFilter !== 'all' || typeFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colours.accent} />
        <Text style={styles.stateText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colours.accent}
        />
      }
    >
      <View style={styles.headerBlock}>
        <View style={styles.pageTitleRow}>
          <View style={styles.pageTitleContent}>
            <Text style={styles.title}>Reports</Text>
            <Text style={styles.subtitle}>
              Generate and manage administrative summaries from platform activity.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setIsCreateModalVisible(true)}
            style={({ pressed }) => [
              styles.createReportButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.createReportButtonText}>+ Create</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create report</Text>

              <Pressable
                accessibilityRole="button"
                disabled={isCreating}
                onPress={() => setIsCreateModalVisible(false)}
                style={({ pressed }) => [
                  styles.modalCloseButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalDescription}>
              Generate an administrative summary from platform activity.
            </Text>

            <Text style={styles.inputLabel}>Report title</Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. August platform summary"
              placeholderTextColor={colours.textSecondary}
              style={styles.input}
              maxLength={150}
            />

            <Text style={styles.inputLabel}>Report type</Text>

            <View style={styles.typeGrid}>
              {REPORT_TYPES.map((item) => {
                const selected = reportType === item.value;

                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    disabled={isCreating}
                    onPress={() => setReportType(item.value)}
                    style={({ pressed }) => [
                      styles.typeButton,
                      selected && styles.typeButtonSelected,
                      pressed && styles.buttonPressed,
                      isCreating && styles.buttonDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        selected && styles.typeButtonTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.periodBox}>
              <Text style={styles.periodLabel}>Reporting period</Text>
              <Text style={styles.periodValue}>Current month to today</Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isCreating}
                onPress={() => setIsCreateModalVisible(false)}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.buttonPressed,
                  isCreating && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isCreating}
                onPress={() => {
                  void handleCreateReport();
                }}
                style={({ pressed }) => [
                  styles.modalGenerateButton,
                  pressed && styles.buttonPressed,
                  isCreating && styles.buttonDisabled,
                ]}
              >
                {isCreating ? (
                  <ActivityIndicator color={colours.textInverse} />
                ) : (
                  <Text style={styles.generateButtonText}>Generate report</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Could not load reports</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={styles.sectionTitle}>Saved reports</Text>

            <Text style={styles.reportCount}>
              {hasActiveFilters
                ? `${filteredReports.length} of ${reports.length} reports`
                : `${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`}
            </Text>
          </View>

          {hasActiveFilters ? (
            <Pressable
              accessibilityRole="button"
              onPress={clearFilters}
              style={({ pressed }) => [
                styles.clearFilterButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.clearFilterText}>Clear filters</Text>
            </Pressable>
          ) : null}
        </View>

        {reports.length > 0 ? (
          <View style={styles.filterCard}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search report title..."
              placeholderTextColor={colours.textSecondary}
              style={styles.input}
            />

            <Text style={styles.filterLabel}>Status</Text>

            <View style={styles.filterRow}>
              {REPORT_STATUS_FILTERS.map((item) => {
                const selected = statusFilter === item.value;

                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    onPress={() => setStatusFilter(item.value)}
                    style={({ pressed }) => [
                      styles.filterButton,
                      selected && styles.filterButtonSelected,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        selected && styles.filterButtonTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterLabel}>Report type</Text>

            <View style={styles.filterRow}>
              {REPORT_TYPE_FILTERS.map((item) => {
                const selected = typeFilter === item.value;

                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    onPress={() => setTypeFilter(item.value)}
                    style={({ pressed }) => [
                      styles.filterButton,
                      selected && styles.filterButtonSelected,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        selected && styles.filterButtonTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No saved reports yet</Text>
            <Text style={styles.emptyText}>
              Generate a report above and it will appear here.
            </Text>
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matching reports</Text>
            <Text style={styles.emptyText}>
              Try changing your search or report filters.
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => {
            const isFinalized = report.status === 'finalized';
            const isBusy = busyReportId === report.reportId;

            return (
              <View key={report.reportId} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View style={styles.reportHeaderText}>
                    <View style={styles.titleRow}>
                      <Text style={styles.reportTitle}>{report.title}</Text>

                      <View
                        style={[
                          styles.statusBadge,
                          isFinalized ? styles.finalizedBadge : styles.draftBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isFinalized
                              ? styles.finalizedBadgeText
                              : styles.draftBadgeText,
                          ]}
                        >
                          {isFinalized ? 'FINALIZED' : 'DRAFT'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.reportMeta}>
                      {report.type.toUpperCase()} · {formatDate(report.startDate)} -{' '}
                      {formatDate(report.endDate)}
                    </Text>

                    {report.finalizedAt ? (
                      <Text style={styles.finalizedText}>
                        Finalized {formatDate(report.finalizedAt)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.reportDataBox}>
                  <Text style={styles.reportDataText}>
                    {stringifyReportData(report.data)}
                  </Text>
                </View>

                <View style={styles.reportActions}>
                  {!isFinalized ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isBusy}
                        onPress={() => handleRenameReport(report)}
                        style={({ pressed }) => [
                          styles.actionButton,
                          pressed && styles.buttonPressed,
                          isBusy && styles.buttonDisabled,
                        ]}
                      >
                        <Text style={styles.actionButtonText}>Rename</Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        disabled={isBusy}
                        onPress={() => handleFinalizeReport(report)}
                        style={({ pressed }) => [
                          styles.finalizeButton,
                          pressed && styles.buttonPressed,
                          isBusy && styles.buttonDisabled,
                        ]}
                      >
                        <Text style={styles.finalizeButtonText}>Finalize</Text>
                      </Pressable>
                    </>
                  ) : null}

                  {isFinalized ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={isBusy}
                      onPress={() => {
                        void handleDownloadReport(report);
                      }}
                      style={({ pressed }) => [
                        styles.downloadButton,
                        pressed && styles.buttonPressed,
                        isBusy && styles.buttonDisabled,
                      ]}
                    >
                      <Text style={styles.downloadButtonText}>Download PDF</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => handleDeleteReport(report)}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.buttonPressed,
                      isBusy && styles.buttonDisabled,
                    ]}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deleted reports</Text>
        <Text style={styles.reportCount}>
          {deletedReports.length}{' '}
          {deletedReports.length === 1 ? 'deleted report' : 'deleted reports'}
        </Text>

        {deletedReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No deleted reports</Text>
            <Text style={styles.emptyText}>
              Soft-deleted reports will appear here until they are restored or permanently
              deleted.
            </Text>
          </View>
        ) : (
          deletedReports.map((report) => {
            const isFinalized = report.status === 'finalized';
            const isBusy = busyReportId === report.reportId;

            return (
              <View key={report.reportId} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View style={styles.reportHeaderText}>
                    <View style={styles.titleRow}>
                      <Text style={styles.reportTitle}>{report.title}</Text>

                      <View
                        style={[
                          styles.statusBadge,
                          isFinalized ? styles.finalizedBadge : styles.draftBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isFinalized
                              ? styles.finalizedBadgeText
                              : styles.draftBadgeText,
                          ]}
                        >
                          {isFinalized ? 'FINALIZED' : 'DRAFT'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.reportMeta}>
                      {report.type.toUpperCase()} · {formatDate(report.startDate)} -{' '}
                      {formatDate(report.endDate)}
                    </Text>

                    {report.deletedAt ? (
                      <Text style={styles.deletedText}>
                        Deleted {formatDate(report.deletedAt)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.reportDataBox}>
                  <Text style={styles.reportDataText}>
                    {stringifyReportData(report.data)}
                  </Text>
                </View>

                <View style={styles.reportActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => handleRestoreReport(report)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      pressed && styles.buttonPressed,
                      isBusy && styles.buttonDisabled,
                    ]}
                  >
                    <Text style={styles.actionButtonText}>Restore</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => handlePermanentDeleteReport(report)}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.buttonPressed,
                      isBusy && styles.buttonDisabled,
                    ]}
                  >
                    <Text style={styles.deleteButtonText}>Delete permanently</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colours.background,
  },
  content: {
    padding: layout.screenPadding,
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
  },
  headerBlock: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
  },
  errorCard: {
    marginBottom: spacing.lg,
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
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
  },
  generatorCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  inputLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },
  input: {
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
    color: colours.textPrimary,
    fontSize: fontSize.secondary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  typeButton: {
    margin: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },
  typeButtonSelected: {
    borderColor: colours.accent,
    backgroundColor: colours.accent,
  },
  typeButtonText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },
  typeButtonTextSelected: {
    color: colours.textInverse,
  },
  dateHint: {
    marginTop: spacing.sm,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  generateButton: {
    minHeight: layout.controlHeight,
    marginTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius,
    backgroundColor: colours.accent,
  },
  generateButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textInverse,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyCard: {
    padding: spacing.lg,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },
  emptyTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  emptyText: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
  },
  reportCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reportHeaderText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  reportTitle: {
    marginRight: spacing.sm,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  reportMeta: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  finalizedText: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  deletedText: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.critical,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: layout.borderWidth,
    borderRadius: layout.radius,
  },
  draftBadge: {
    borderColor: colours.accent,
    backgroundColor: colours.background,
  },
  finalizedBadge: {
    borderColor: colours.accent,
    backgroundColor: colours.accent,
  },
  statusBadgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
  },
  draftBadgeText: {
    color: colours.accent,
  },
  finalizedBadgeText: {
    color: colours.textInverse,
  },
  reportActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    marginHorizontal: -spacing.xs,
  },
  actionButton: {
    margin: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },
  actionButtonText: {
    fontSize: fontSize.label,
    color: colours.textPrimary,
  },
  finalizeButton: {
    margin: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: layout.borderWidth,
    borderColor: colours.accent,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },
  finalizeButtonText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colours.accent,
  },
  downloadButton: {
    margin: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: layout.borderWidth,
    borderColor: colours.accent,
    borderRadius: layout.radius,
    backgroundColor: colours.accent,
  },
  downloadButtonText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colours.textInverse,
  },
  deleteButton: {
    margin: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: layout.borderWidth,
    borderColor: colours.critical,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },
  deleteButtonText: {
    fontSize: fontSize.label,
    color: colours.critical,
  },
  reportDataBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },
  reportDataText: {
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },

  reportCount: {
    marginTop: 2,
    marginBottom: spacing.sm,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },

  filterCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  filterLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },

  filterButton: {
    margin: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },

  filterButtonSelected: {
    borderColor: colours.accent,
    backgroundColor: colours.accent,
  },

  filterButtonText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },

  filterButtonTextSelected: {
    color: colours.textInverse,
  },

  clearFilterButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  clearFilterText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colours.accent,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  pageTitleContent: {
    flex: 1,
    marginRight: spacing.md,
  },

  createReportButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.radius,
    backgroundColor: colours.accent,
  },

  createReportButtonText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.textInverse,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: layout.screenPadding,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  modalCard: {
    width: '100%',
    padding: spacing.lg,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },

  modalDescription: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
  },

  modalCloseButton: {
    padding: spacing.xs,
  },

  modalCloseText: {
    fontSize: fontSize.body,
    color: colours.textSecondary,
  },

  periodBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },

  periodLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },

  periodValue: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },

  cancelButton: {
    minHeight: layout.controlHeight,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },

  cancelButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },

  modalGenerateButton: {
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius,
    backgroundColor: colours.accent,
  },
});
