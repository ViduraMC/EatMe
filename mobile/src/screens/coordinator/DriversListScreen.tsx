import React, { useCallback, useMemo, useState } from 'react';
import { Linking, RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  Badge,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  IconButton,
  LargeTitle,
  Screen,
  SearchBar,
  SkeletonList,
  TopBar,
  useScrollY,
} from '../../components';
import { fetchDrivers } from '../../api/assignments.api';
import { useI18n } from '../../i18n';
import { makeStyles, useTheme } from '../../theme';
import { enterListItem, useReducedMotion } from '../../theme/animations';
import type { DriverInfo } from '../../types/assignment';
import type { CoordinatorTabProps } from '../../navigation/types';

type Filter = 'all' | 'available' | 'busy';

/**
 * The driver roster: who is available right now, and a one-tap call for
 * each. Available drivers sort first, the same order the assign screen uses.
 */
export function DriversListScreen(_props: CoordinatorTabProps<'DriversList'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setDrivers(await fetchDrivers());
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

  const available = drivers.filter((d) => d.isAvailable).length;
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers
      .filter((d) =>
        filter === 'available'
          ? d.isAvailable
          : filter === 'busy'
            ? !d.isAvailable
            : true,
      )
      .filter((d) => !q || d.name.toLowerCase().includes(q) || d.phone.includes(q))
      .sort(
        (a, b) =>
          Number(b.isAvailable) - Number(a.isAvailable) || a.name.localeCompare(b.name),
      );
  }, [drivers, filter, search]);

  const header = (
    <View>
      <LargeTitle
        title={t('coordinator.driversTitle')}
        subtitle={t('coordinator.driversSubtitle')}
        scrollY={scrollY}
      />
      {!loading && !error && drivers.length > 0 ? (
        <>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={t('coordinator.searchDrivers')}
          />
          <ChipRow style={styles.chips}>
            <Chip
              label={t('common.all')}
              count={drivers.length}
              selected={filter === 'all'}
              onPress={() => setFilter('all')}
            />
            <Chip
              label={t('coordinator.filterAvailable')}
              count={available}
              tone="safe"
              selected={filter === 'available'}
              onPress={() => setFilter('available')}
            />
            <Chip
              label={t('coordinator.filterBusy')}
              count={drivers.length - available}
              tone="neutral"
              selected={filter === 'busy'}
              onPress={() => setFilter('busy')}
            />
          </ChipRow>
        </>
      ) : null}
    </View>
  );

  let empty: React.ReactElement;
  if (loading) empty = <SkeletonList count={4} />;
  else if (error) empty = <ErrorState error={error} onRetry={() => void load()} />;
  else if (drivers.length === 0)
    empty = (
      <EmptyState
        illustration="deliverFood"
        title={t('coordinator.noDrivers')}
        message={t('coordinator.noDriversBody')}
      />
    );
  else
    empty = (
      <EmptyState
        compact
        illustration="emptyBowl"
        title={t('coordinator.driversEmpty')}
      />
    );

  return (
    <Screen>
      <TopBar title={t('coordinator.driversTitle')} scrollY={scrollY} />
      <Animated.FlatList
        data={loading || error ? [] : visible}
        keyExtractor={(d) => String(d.userId)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={theme.colors.brand}
            colors={[theme.colors.brand]}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={enterListItem(index, reduced)}>
            <Card variant="flat" style={styles.row}>
              <View>
                <Avatar name={item.name} size={46} />
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: item.isAvailable
                        ? theme.colors.safe
                        : theme.colors.borderStrong,
                    },
                  ]}
                />
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{item.name}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {item.phone}
                </AppText>
                <Badge
                  size="sm"
                  label={
                    item.isAvailable ? t('settings.available') : t('settings.unavailable')
                  }
                  tone={item.isAvailable ? 'safe' : 'neutral'}
                  style={styles.badge}
                />
              </View>
              <IconButton
                icon="call"
                variant="tonal"
                tone="olive"
                onPress={() =>
                  void Linking.openURL(`tel:${item.phone.replace(/\s/g, '')}`)
                }
                accessibilityLabel={t('coordinator.callName', { name: item.name })}
              />
            </Card>
          </Animated.View>
        )}
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: {
    paddingHorizontal: t.layout.screenPadding,
    paddingBottom: t.spacing.xxl,
    flexGrow: 1,
  },
  chips: { marginTop: t.spacing.sm + 4, marginBottom: t.spacing.md },
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    marginBottom: t.spacing.sm + 2,
  },
  dot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: t.colors.surface,
  },
  badge: { marginTop: 4 },
}));
