import React from 'react';
import { TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { MAX_FONT_SCALE, makeStyles, useTheme } from '../theme';
import { useT } from '../i18n';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Show a filter button with a count of active filters. */
  onFilterPress?: () => void;
  activeFilters?: number;
  style?: StyleProp<ViewStyle>;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onFilterPress,
  activeFilters = 0,
  style,
}: SearchBarProps) {
  const theme = useTheme();
  const styles = useStyles();
  const t = useT();

  return (
    <View style={[styles.row, style]}>
      <View style={styles.field}>
        <Icon name="search" size={20} color="textSecondary" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          returnKeyType="search"
          autoCorrect={false}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          selectionColor={theme.colors.brand}
          accessibilityLabel={placeholder}
          style={[
            styles.input,
            { fontFamily: theme.fonts.regular, color: theme.colors.text },
          ]}
        />
        {value.length > 0 ? (
          <Animated.View entering={ZoomIn.duration(150)} exiting={ZoomOut.duration(120)}>
            <PressableScale
              onPress={() => onChangeText('')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.clearText')}
            >
              <Icon name="close-circle" size={20} color="textTertiary" />
            </PressableScale>
          </Animated.View>
        ) : null}
      </View>
      {onFilterPress ? (
        <PressableScale
          onPress={onFilterPress}
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel={
            activeFilters > 0
              ? `${t('common.filters')}, ${activeFilters}`
              : t('common.filters')
          }
          style={[styles.filter, activeFilters > 0 && styles.filterActive]}
        >
          <Icon
            name="options-outline"
            size={22}
            color={activeFilters > 0 ? theme.colors.onBrand : 'text'}
          />
          {activeFilters > 0 ? (
            <View style={styles.badge}>
              <AppText variant="caption" color="onBrand" style={styles.badgeText}>
                {String(activeFilters)}
              </AppText>
            </View>
          ) : null}
        </PressableScale>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  field: {
    flex: 1,
    height: t.layout.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  filter: {
    width: t.layout.controlHeight,
    height: t.layout.controlHeight,
    borderRadius: t.layout.controlHeight / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  filterActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: t.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, color: t.colors.background },
}));
