import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { LogoMark } from './illustrations/Illustration';
import { makeStyles } from '../theme';

interface LogoProps {
  /** Height of the mark; the wordmark scales with it. */
  size?: number;
  /** White version for use on the terracotta hero. */
  inverse?: boolean;
  /** Mark only, no wordmark. */
  markOnly?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The EatMe logo: a bowl with a heart rising from it like steam, food shared
 * with care. The wordmark is Fraunces, with "Me" in the brand colour,
 * because the app is about the person on the other end of the meal.
 */
export function Logo({ size = 40, inverse = false, markOnly = false, style }: LogoProps) {
  const styles = useStyles();
  const fontSize = size * 0.72;

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="EatMe"
    >
      <LogoMark size={size} inverse={inverse} />
      {markOnly ? null : (
        <AppText
          variant="title"
          color={inverse ? '#FFFFFF' : 'text'}
          // The brand name is always set in Fraunces, even in Sinhala mode.
          style={{
            fontFamily: 'Fraunces-Bold',
            fontSize,
            lineHeight: fontSize * 1.2,
            letterSpacing: 0,
          }}
        >
          Eat
          <AppText
            variant="title"
            color={inverse ? '#FFE7C2' : 'brand'}
            style={{ fontFamily: 'Fraunces-Bold', fontSize, lineHeight: fontSize * 1.2 }}
          >
            Me
          </AppText>
        </AppText>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
}));
