import React from 'react';
import { Linking, View } from 'react-native';
import { AppText, Icon, IconButton } from '../../../components';
import { useI18n } from '../../../i18n';
import { makeStyles, useTheme } from '../../../theme';

export interface Stop {
  name: string;
  detail?: string;
  phone: string;
}

interface RouteStopsProps {
  from: Stop;
  to: Stop;
  /** Which leg is happening now; it is drawn in colour, the other one quieter. */
  active?: 'from' | 'to';
}

/**
 * Pickup and drop-off as a vertical route: a filled dot for where the food
 * is, a pin for where it is going, joined by a line. Each stop has a call
 * button, because at the kerb the question is usually "which gate?".
 */
export function RouteStops({ from, to, active }: RouteStopsProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();

  const call = (phone: string) => void Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  const dimFrom = active === 'to';
  const dimTo = active === 'from';

  return (
    <View>
      <View style={[styles.stop, dimFrom && styles.dim]}>
        <View style={styles.rail}>
          <View style={[styles.dot, { backgroundColor: theme.colors.brand }]} />
          <View style={styles.line} />
        </View>
        <View style={styles.body}>
          <AppText variant="caption" color="textSecondary">
            {t('driver.collectFrom')}
          </AppText>
          <AppText variant="bodyStrong">{from.name}</AppText>
          {from.detail ? (
            <AppText variant="secondary" color="textSecondary">
              {from.detail}
            </AppText>
          ) : null}
        </View>
        <IconButton
          icon="call-outline"
          variant="tonal"
          tone="brand"
          size="sm"
          onPress={() => call(from.phone)}
          accessibilityLabel={t('driver.call', { name: from.name })}
        />
      </View>
      <View style={[styles.stop, dimTo && styles.dim]}>
        <View style={styles.rail}>
          <Icon name="location" size={20} color="olive" />
        </View>
        <View style={styles.body}>
          <AppText variant="caption" color="textSecondary">
            {t('driver.deliverTo')}
          </AppText>
          <AppText variant="bodyStrong">{to.name}</AppText>
          {to.detail ? (
            <AppText variant="secondary" color="textSecondary">
              {to.detail}
            </AppText>
          ) : null}
        </View>
        <IconButton
          icon="call-outline"
          variant="tonal"
          tone="olive"
          size="sm"
          onPress={() => call(to.phone)}
          accessibilityLabel={t('driver.call', { name: to.name })}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  stop: { flexDirection: 'row', gap: t.spacing.sm + 4, alignItems: 'flex-start' },
  dim: { opacity: 0.5 },
  rail: { width: 20, alignItems: 'center', alignSelf: 'stretch', paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: t.colors.border,
    marginVertical: 4,
    minHeight: 20,
  },
  body: { flex: 1, paddingBottom: t.spacing.md, gap: 1 },
}));
