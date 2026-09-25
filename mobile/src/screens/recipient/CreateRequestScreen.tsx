import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  BottomSheet,
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  FreshnessRing,
  Illustration,
  InfoBanner,
  QuantityStepper,
  Screen,
  SkeletonList,
  TextField,
} from '../../components';
import { fetchListing } from '../../api/donations.api';
import { createRequest } from '../../api/requests.api';
import { useNow } from '../../hooks/useNow';
import { useI18n } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat } from '../../i18n/format';
import { makeStyles } from '../../theme';
import { enterListItem, enterSection, useReducedMotion } from '../../theme/animations';
import { haptics } from '../../utils/haptics';
import type { DonationListing } from '../../types/donation';
import { freshnessFraction } from '../../utils/freshness';
import type { RecipientStackProps } from '../../navigation/types';

/**
 * Choosing how much of each food to ask for.
 *
 * Every item has its own stepper, capped at what is actually left, so an
 * impossible request cannot be made. "All" takes the whole of an item in one
 * tap. The subtitle nudges recipients to ask only for what they can use,
 * because anything left stays available to someone else.
 */
export function CreateRequestScreen({
  navigation,
  route,
}: RecipientStackProps<'CreateRequest'>) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const now = useNow();
  const reduced = useReducedMotion();
  const { listingId } = route.params;

  const [listing, setListing] = useState<DonationListing | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    try {
      setListing(await fetchListing(listingId));
      setLoadError(null);
    } catch (err) {
      setLoadError(err);
    }
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const selected = Object.values(quantities).filter((q) => q > 0).length;

  async function submit() {
    const items = Object.entries(quantities)
      .map(([itemId, quantityRequested]) => ({
        itemId: Number(itemId),
        quantityRequested,
      }))
      .filter((i) => i.quantityRequested > 0);
    if (items.length === 0) {
      setFormError(t('recipient.nothingSelected'));
      haptics.error();
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await createRequest({ listingId, message: message.trim() || null, items });
      haptics.success();
      setSent(true);
    } catch (err) {
      setFormError(describeError(err, t).message);
    } finally {
      setSubmitting(false);
    }
  }

  function finish() {
    setSent(false);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'RecipientTabs', params: { screen: 'MyRequests' } }],
      }),
    );
  }

  if (loadError && !listing) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState error={loadError} onRetry={() => void load()} />
      </Screen>
    );
  }
  if (!listing) {
    return (
      <Screen edges={['left', 'right']}>
        <View style={styles.content}>
          <SkeletonList count={3} />
        </View>
      </Screen>
    );
  }

  const available = listing.items.filter(
    (i) => Math.floor(Number(i.quantityRemaining)) > 0,
  );
  if (available.length === 0) {
    return (
      <Screen edges={['left', 'right']}>
        <EmptyState illustration="emptyBowl" title={t('recipient.noneAvailable')} />
      </Screen>
    );
  }

  const ideas = [
    t('recipient.messageIdea1'),
    t('recipient.messageIdea2'),
    t('recipient.messageIdea3', { count: 30 }),
  ];

  return (
    <Screen
      edges={['left', 'right']}
      avoidKeyboard
      footer={
        <>
          <AppText variant="caption" color="textSecondary" align="center">
            {selected > 0
              ? t('recipient.selectedCount', { count: selected })
              : t('recipient.nothingSelected')}
          </AppText>
          <Button
            label={t('recipient.sendRequest')}
            icon="paper-plane-outline"
            size="lg"
            onPress={() => void submit()}
            loading={submitting}
            disabled={selected === 0}
          />
        </>
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={enterSection(0, reduced)}>
          <AppText variant="title" accessibilityRole="header">
            {t('recipient.requestTitle')}
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.subtitle}>
            {t('recipient.requestSubtitle')}
          </AppText>
        </Animated.View>

        {available.map((item, index) => {
          const max = Math.floor(Number(item.quantityRemaining));
          const value = quantities[item.itemId] ?? 0;
          const set = (v: number) => setQuantities((q) => ({ ...q, [item.itemId]: v }));
          return (
            <Animated.View key={item.itemId} entering={enterListItem(index, reduced)}>
              <Card variant={value > 0 ? 'tinted' : 'raised'}>
                <View style={styles.itemHead}>
                  <FreshnessRing
                    fraction={freshnessFraction(item, now)}
                    level={item.urgencyLevel}
                    size={42}
                  />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={2}>
                      {item.foodName}
                    </AppText>
                    <AppText variant="caption" color="textSecondary">
                      {`${t('recipient.available', { qty: f.quantity(max, item.unit) })} · ${f.timeLeft(item.effectiveExpiry, now)}`}
                    </AppText>
                  </View>
                </View>
                <View style={styles.stepRow}>
                  <QuantityStepper
                    value={value}
                    onChange={set}
                    min={0}
                    max={max}
                    unit={t(`units.${item.unit}`, { count: value })}
                    label={item.foodName}
                  />
                  <Chip
                    label={t('recipient.takeAll')}
                    icon="checkmark-done"
                    selected={value === max}
                    onPress={() => set(value === max ? 0 : max)}
                  />
                </View>
              </Card>
            </Animated.View>
          );
        })}

        <TextField
          label={t('recipient.messageLabel')}
          optional
          value={message}
          onChangeText={setMessage}
          placeholder={t('recipient.messagePlaceholder')}
          multiline
          maxLength={500}
          showCount
          containerStyle={styles.message}
        />
        <ChipRow>
          {ideas.map((idea) => (
            <Chip
              key={idea}
              label={idea}
              icon="chatbubble-outline"
              tone="olive"
              selected={message === idea}
              onPress={() => setMessage(idea)}
            />
          ))}
        </ChipRow>

        {formError ? (
          <InfoBanner tone="critical" message={formError} style={styles.error} />
        ) : null}
      </ScrollView>

      <BottomSheet visible={sent} onClose={finish}>
        <View style={styles.success}>
          <Illustration name="success" width={200} />
          <AppText variant="title" align="center" accessibilityRole="header">
            {t('recipient.sentTitle')}
          </AppText>
          <AppText variant="body" color="textSecondary" align="center">
            {t('recipient.sentBody')}
          </AppText>
          <Button
            label={t('recipient.viewMyRequests')}
            icon="mc:clipboard-list-outline"
            onPress={finish}
            style={styles.successBtn}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: t.layout.screenPadding, paddingBottom: t.spacing.xxl },
  flex: { flex: 1 },
  subtitle: { marginTop: t.spacing.xs, marginBottom: t.spacing.lg },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: t.spacing.md,
  },
  message: { marginTop: t.spacing.md, marginBottom: t.spacing.sm },
  error: { marginTop: t.spacing.md },
  success: { alignItems: 'center', gap: t.spacing.sm, paddingBottom: t.spacing.sm },
  successBtn: { alignSelf: 'stretch', marginTop: t.spacing.md },
}));
