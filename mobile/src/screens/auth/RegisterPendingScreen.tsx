import React from 'react';
import { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText, Button, Card, Illustration, Screen, Timeline } from '../../components';
import { useT } from '../../i18n';
import { makeStyles } from '../../theme';
import { enterSection, useReducedMotion } from '../../theme/animations';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterPending'>;

/**
 * Shown to a recipient right after they register.
 *
 * Recipient accounts need an administrator's approval, so donated food only
 * goes to genuine organisations. Rather than a bare "awaiting approval"
 * alert, this explains why, and lays out exactly what happens next as a
 * timeline, so the wait feels like progress instead of a dead end.
 */
export function RegisterPendingScreen({ navigation, route }: Props) {
  const styles = useStyles();
  const t = useT();
  const reduced = useReducedMotion();
  const { name, organisation } = route.params;

  return (
    <Screen
      edges={['top', 'left', 'right']}
      footer={
        <Button
          label={t('auth.backToSignIn')}
          size="lg"
          onPress={() => navigation.popTo('Login')}
        />
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={enterSection(0, reduced)} style={styles.art}>
          <Illustration name="waiting" width={240} />
        </Animated.View>
        <Animated.View entering={enterSection(1, reduced)}>
          <AppText variant="title" align="center" accessibilityRole="header">
            {t('auth.pendingTitle', { name })}
          </AppText>
          <AppText
            variant="body"
            color="textSecondary"
            align="center"
            style={styles.body}
          >
            {t('auth.pendingBody', { org: organisation })}
          </AppText>
        </Animated.View>
        <Animated.View entering={enterSection(2, reduced)}>
          <Card variant="flat" style={styles.card}>
            <AppText variant="overline" color="textSecondary" style={styles.overline}>
              {t('auth.pendingNext')}
            </AppText>
            <Timeline
              steps={[
                { key: 'created', title: t('auth.pendingStep1'), state: 'done' },
                {
                  key: 'verify',
                  title: t('auth.pendingStep2'),
                  state: 'current',
                  icon: 'shield-checkmark',
                },
                { key: 'use', title: t('auth.pendingStep3'), state: 'upcoming' },
              ]}
            />
          </Card>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: t.layout.screenPadding, paddingBottom: t.spacing.xl },
  art: { alignItems: 'center', marginTop: t.spacing.lg, marginBottom: t.spacing.md },
  body: { marginTop: t.spacing.sm, marginBottom: t.spacing.lg },
  card: { marginTop: t.spacing.sm },
  overline: { marginBottom: t.spacing.md },
}));
