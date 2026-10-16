import React, { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  AppText,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  Divider,
  LargeTitle,
  ListRow,
  Logo,
  Screen,
  SectionHeader,
  SegmentedControl,
  TextField,
  TopBar,
  useConfirm,
  useScrollY,
  useToast,
} from '../../components';
import { deleteAccountRequest } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { describeError } from '../../i18n/errors';
import { useOnboarding } from '../../context/OnboardingContext';
import { LANGUAGES, translate, useI18n, type Language } from '../../i18n';
import { makeStyles, useThemePreference, type ThemePreference } from '../../theme';
import { enterSection, useReducedMotion } from '../../theme/animations';

// The version shown under About comes straight from app.json.
const APP_VERSION: string = require('../../../app.json').expo.version;

const ROLE_ICON = {
  donor: 'mc:hand-heart-outline',
  recipient: 'mc:home-heart',
  coordinator: 'mc:clipboard-flow-outline',
  driver: 'mc:truck-delivery-outline',
  admin: 'shield-checkmark-outline',
} as const;

/**
 * Profile and settings, shared by every role.
 *
 * Appearance and language are segmented controls rather than sub-screens:
 * each is a single choice between two or three options, so showing them all
 * at once and applying the change instantly is faster than drilling in and
 * out, and the user sees the effect straight away.
 */
export function ProfileScreen() {
  const styles = useStyles();
  const { t, language, setLanguage } = useI18n();
  const { user, logout } = useAuth();
  const { replay } = useOnboarding();
  const confirm = useConfirm();
  const [preference, setPreference] = useThemePreference();
  const { scrollY, onScroll } = useScrollY();
  const reduced = useReducedMotion();
  const [aboutOpen, setAboutOpen] = useState(false);
  const toast = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  // Only people who sign themselves up can close their own account (a Google
  // Play rule). Staff accounts are removed by an administrator.
  const canDeleteAccount = user.role === 'donor' || user.role === 'recipient';

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteAccountRequest(deletePassword);
      setDeleteOpen(false);
      toast.show({ type: 'success', title: t('settings.deleteAccountDone') });
      await logout();
    } catch (err) {
      setDeleteError(describeError(err, t).message);
    } finally {
      setDeleting(false);
    }
  }

  const displayName = user.organisationName ?? user.name;

  async function signOut() {
    const ok = await confirm({
      title: t('settings.signOutConfirmTitle'),
      message: t('settings.signOutConfirmBody'),
      confirmLabel: t('settings.signOut'),
      icon: 'log-out-outline',
      tone: 'critical',
    });
    if (ok) await logout();
  }

  return (
    <Screen>
      <TopBar title={t('settings.title')} scrollY={scrollY} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LargeTitle title={t('settings.title')} scrollY={scrollY} />

        <Animated.View entering={enterSection(0, reduced)}>
          <Card style={styles.hero}>
            <Avatar
              name={displayName}
              size={64}
              icon={user.organisationName ? 'business' : undefined}
            />
            <View style={styles.heroText}>
              <AppText variant="headline" numberOfLines={2}>
                {displayName}
              </AppText>
              {user.organisationName ? (
                <AppText variant="secondary" color="textSecondary">
                  {user.name}
                </AppText>
              ) : null}
              <View style={styles.badges}>
                <Badge
                  label={t(`roles.${user.role}`)}
                  tone="brand"
                  icon={ROLE_ICON[user.role]}
                  size="sm"
                />
                {user.role === 'driver' ? (
                  <Badge
                    label={
                      user.isAvailable
                        ? t('settings.available')
                        : t('settings.unavailable')
                    }
                    tone={user.isAvailable ? 'safe' : 'neutral'}
                    dot
                    size="sm"
                  />
                ) : null}
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={enterSection(1, reduced)}>
          <SectionHeader title={t('settings.account')} />
          <Card variant="flat" style={styles.group}>
            <ListRow
              icon="mail-outline"
              title={t('settings.email')}
              subtitle={user.email}
              chevron={false}
            />
            <Divider inset={48} />
            <ListRow
              icon="call-outline"
              title={t('settings.phone')}
              subtitle={user.phone}
              chevron={false}
            />
            <Divider inset={48} />
            <ListRow
              icon="location-outline"
              title={t('settings.address')}
              subtitle={user.address}
              chevron={false}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enterSection(2, reduced)}>
          <SectionHeader title={t('settings.preferences')} />
          <Card variant="flat" style={styles.group}>
            <View style={styles.prefBlock}>
              <View style={styles.prefHead}>
                <AppText variant="callout">{t('settings.appearance')}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {t('settings.appearanceHint')}
                </AppText>
              </View>
              <SegmentedControl<ThemePreference>
                accessibilityLabel={t('settings.appearance')}
                value={preference}
                onChange={setPreference}
                segments={[
                  {
                    value: 'system',
                    label: t('settings.appearanceSystem'),
                    icon: 'phone-portrait-outline',
                  },
                  {
                    value: 'light',
                    label: t('settings.appearanceLight'),
                    icon: 'sunny-outline',
                  },
                  {
                    value: 'dark',
                    label: t('settings.appearanceDark'),
                    icon: 'moon-outline',
                  },
                ]}
              />
            </View>
            <Divider />
            <View style={styles.prefBlock}>
              <View style={styles.prefHead}>
                <AppText variant="callout">{t('settings.language')}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {t('settings.languageHint')}
                </AppText>
              </View>
              <SegmentedControl<Language>
                accessibilityLabel={t('settings.language')}
                value={language}
                onChange={setLanguage}
                segments={LANGUAGES.map((lang) => ({
                  value: lang,
                  label: translate(lang, `languageNames.${lang}`),
                }))}
              />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={enterSection(3, reduced)}>
          <SectionHeader title={t('settings.about')} />
          <Card variant="flat" style={styles.group}>
            <ListRow
              icon="heart-outline"
              iconTone="brand"
              title={t('settings.about')}
              onPress={() => setAboutOpen(true)}
            />
            <Divider inset={48} />
            <ListRow
              icon="play-circle-outline"
              iconTone="olive"
              title={t('settings.replayIntro')}
              onPress={replay}
            />
          </Card>

          <Button
            label={t('settings.signOut')}
            variant="secondary"
            icon="log-out-outline"
            onPress={() => void signOut()}
            style={styles.signOut}
          />
          {canDeleteAccount ? (
            <Button
              label={t('settings.deleteAccount')}
              variant="dangerGhost"
              icon="trash-outline"
              onPress={() => {
                setDeletePassword('');
                setDeleteError(undefined);
                setDeleteOpen(true);
              }}
              style={styles.deleteAccount}
            />
          ) : null}
          <AppText variant="caption" color="textTertiary" align="center">
            {t('settings.version', { version: APP_VERSION })}
          </AppText>
        </Animated.View>
      </Animated.ScrollView>

      <BottomSheet visible={aboutOpen} onClose={() => setAboutOpen(false)}>
        <View style={styles.about}>
          <Logo size={52} />
          <AppText variant="body" color="textSecondary" align="center">
            {t('settings.aboutBody')}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {t('settings.version', { version: APP_VERSION })}
          </AppText>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={deleteOpen}
        onClose={() => (deleting ? undefined : setDeleteOpen(false))}
        title={t('settings.deleteAccountTitle')}
      >
        <View style={styles.deleteSheet}>
          <AppText variant="body" color="textSecondary">
            {t('settings.deleteAccountBody')}
          </AppText>
          <TextField
            label={t('settings.deleteAccountPassword')}
            value={deletePassword}
            onChangeText={setDeletePassword}
            secure
            autoCapitalize="none"
            autoComplete="current-password"
            error={deleteError}
          />
          <Button
            label={t('settings.deleteAccountConfirm')}
            variant="danger"
            icon="trash-outline"
            onPress={() => void deleteAccount()}
            disabled={!deletePassword || deleting}
            loading={deleting}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { paddingHorizontal: t.layout.screenPadding, paddingBottom: t.spacing.xxl },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    padding: t.spacing.lg,
  },
  heroText: { flex: 1, gap: 2 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.xs + 2,
    marginTop: t.spacing.sm,
  },
  group: { paddingVertical: t.spacing.xs },
  prefBlock: { paddingVertical: t.spacing.md, gap: t.spacing.sm + 4 },
  prefHead: { gap: 2 },
  signOut: { marginTop: t.spacing.xl, marginBottom: t.spacing.sm },
  deleteAccount: { marginBottom: t.spacing.md },
  deleteSheet: { gap: t.spacing.md, paddingBottom: t.spacing.md },
  about: { alignItems: 'center', gap: t.spacing.md, paddingVertical: t.spacing.md },
}));
