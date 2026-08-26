import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Input, ScreenContainer, StatusPill } from '../../components';
import { fetchListing } from '../../api/donations.api';
import { createRequest } from '../../api/requests.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import { formatTimeUntil } from '../../utils/datetime';
import type { DonationListing } from '../../types/donation';
import type { RecipientStackParamList } from '../../navigation/types';

type CreateRequestParamList = RecipientStackParamList & {
  CreateRequest: { listingId: number };
  MyRequests: undefined;
};

type Props = NativeStackScreenProps<CreateRequestParamList, 'CreateRequest'>;

/**
 * A quantity stepper capped at what is actually left.
 *
 * Capping in the UI rather than only validating on submit means a recipient
 * cannot enter a number the server is going to reject.
 */
function Stepper({
  value,
  max,
  unit,
  onChange,
}: {
  value: number;
  max: number;
  unit: string;
  onChange: (next: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        style={[styles.stepButton, value <= 0 && styles.stepButtonOff]}
      >
        <Text style={styles.stepText}>−</Text>
      </Pressable>

      <Text style={styles.stepValue}>
        {value} {unit}
      </Text>

      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        style={[styles.stepButton, value >= max && styles.stepButtonOff]}
      >
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

/**
 * US-R02: choose what you need from a listing and submit a request.
 *
 * Nothing is reserved by submitting. Stock only moves when the Donation
 * Coordinator accepts, so another recipient can still ask for the same food
 * while this request is pending.
 */
export function CreateRequestScreen({ navigation, route }: Props) {
  const { listingId } = route.params;

  const [listing, setListing] = useState<DonationListing | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setListing(await fetchListing(listingId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const chosen = useMemo(
    () =>
      Object.entries(quantities)
        .map(([itemId, quantityRequested]) => ({
          itemId: Number(itemId),
          quantityRequested,
        }))
        .filter((i) => i.quantityRequested > 0),
    [quantities],
  );

  async function handleSubmit() {
    if (chosen.length === 0) {
      setError('Choose at least one item before submitting');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createRequest({
        listingId,
        message: message.trim() || null,
        items: chosen,
      });

      Alert.alert(
        'Request sent',
        'The Donation Coordinator will review it. You can follow its status under My Requests.',
      );
      navigation.navigate('MyRequests');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      </ScreenContainer>
    );
  }

  if (!listing) {
    return (
      <ScreenContainer>
        <Text style={styles.error}>{error ?? 'That listing could not be loaded'}</Text>
        <Button label="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const available = listing.items.filter((i) => Number(i.quantityRemaining) > 0);

  return (
    <ScreenContainer scroll avoidKeyboard>
      <Text style={styles.heading}>Choose what you need</Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {listing.title}
      </Text>

      {available.map((item) => {
        const max = Math.floor(Number(item.quantityRemaining));
        const value = quantities[item.itemId] ?? 0;

        return (
          <Card key={item.itemId}>
            <View style={styles.itemTop}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.foodName}
              </Text>
              <StatusPill label={item.urgencyLevel} tone={item.urgencyLevel} />
            </View>

            <Text style={styles.meta}>
              {item.quantityRemaining} {item.unit} available · expires{' '}
              {formatTimeUntil(item.effectiveExpiry)}
            </Text>

            <Stepper
              value={value}
              max={max}
              unit={item.unit}
              onChange={(next) => setQuantities((q) => ({ ...q, [item.itemId]: next }))}
            />
          </Card>
        );
      })}

      <Input
        label="Message to the donor (optional)"
        value={message}
        onChangeText={setMessage}
        placeholder="We can collect this evening for 30 children."
        multiline
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.note}>
        Submitting does not reserve the food. The Donation Coordinator reviews every
        request.
      </Text>

      <Button
        label={
          chosen.length === 0
            ? 'Submit Request'
            : `Submit Request (${chosen.length} item${chosen.length === 1 ? '' : 's'})`
        }
        onPress={handleSubmit}
        loading={submitting}
        disabled={chosen.length === 0}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  itemName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  meta: { fontSize: fontSize.secondary, color: colours.textSecondary, lineHeight: 20 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: layout.radius,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonOff: { opacity: 0.4 },
  stepText: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  stepValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },
  note: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.sm,
  },
});
