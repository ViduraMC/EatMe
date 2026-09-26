import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { makeStyles } from '../theme';

interface SectionHeaderProps {
  title: string;
  /** Small count or context after the title, e.g. "3". */
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  meta,
  actionLabel,
  onAction,
  style,
}: SectionHeaderProps) {
  const styles = useStyles();
  return (
    <View style={[styles.row, style]}>
      <View style={styles.titleWrap}>
        <AppText variant="subtitle" accessibilityRole="header">
          {title}
        </AppText>
        {meta ? (
          <View style={styles.meta}>
            <AppText variant="caption" color="textSecondary">
              {meta}
            </AppText>
          </View>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <PressableScale
          onPress={onAction}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <AppText variant="secondaryStrong" color="brandText">
            {actionLabel}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm + 4,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  meta: {
    backgroundColor: t.colors.surfaceMuted,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 1,
  },
}));
