import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Input, ScreenContainer } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import { DATE_TIME_HINT, parseLocalDateTime, toInputValue } from '../../utils/datetime';
import type { DonorStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DonorStackParamList, 'CreateListing'>;

/** Rounds up to the next half hour, so the prefilled window looks deliberate. */
function nextHalfHour(offsetHours: number): Date {
  const d = new Date(Date.now() + offsetHours * 3600_000);
  d.setMinutes(d.getMinutes() > 30 ? 60 : 30, 0, 0);
  return d;
}

/**
 * Step 1 of 2: the listing's own details.
 *
 * Nothing is sent to the API here. The details are handed to AddItems, which
 * publishes the listing and its items together, because a listing with no
 * items is not something a recipient can act on.
 */
export function CreateListingScreen({ navigation }: Props) {
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Prefilled from the donor's registered address, which is right most of the
  // time and saves retyping. Still editable: a hotel may collect from a
  // different entrance.
  const [pickupAddress, setPickupAddress] = useState(user?.address ?? '');
  const [windowStart, setWindowStart] = useState(toInputValue(nextHalfHour(1)));
  const [windowEnd, setWindowEnd] = useState(toInputValue(nextHalfHour(4)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleNext() {
    const next: Record<string, string> = {};

    if (title.trim().length < 3) next.title = 'Title must be at least 3 characters';
    if (pickupAddress.trim().length < 5)
      next.pickupAddress = 'Enter a full pickup address';

    const start = parseLocalDateTime(windowStart);
    const end = parseLocalDateTime(windowEnd);

    if (!start) next.windowStart = `Use the format ${DATE_TIME_HINT}`;
    if (!end) next.windowEnd = `Use the format ${DATE_TIME_HINT}`;
    if (start && end && end.getTime() <= start.getTime()) {
      next.windowEnd = 'The window must end after it starts';
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    navigation.navigate('AddItems', {
      title: title.trim(),
      description: description.trim(),
      pickupAddress: pickupAddress.trim(),
      pickupWindowStart: start!.toISOString(),
      pickupWindowEnd: end!.toISOString(),
    });
  }

  return (
    <ScreenContainer scroll avoidKeyboard>
      <Text style={styles.step}>Step 1 of 2</Text>
      <Text style={styles.heading}>Listing details</Text>

      <Input
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="End of day bread and buns"
        error={errors.title}
      />

      <Input
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Unsold stock from today, still good tomorrow morning"
        multiline
      />

      <Input
        label="Pickup address"
        value={pickupAddress}
        onChangeText={setPickupAddress}
        placeholder="134 Main Street, Colombo 11"
        multiline
        error={errors.pickupAddress}
      />

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Pickup window. Use the format {DATE_TIME_HINT}, for example{' '}
          {toInputValue(nextHalfHour(2))}.
        </Text>
      </View>

      <Input
        label="Collect from"
        value={windowStart}
        onChangeText={setWindowStart}
        placeholder={DATE_TIME_HINT}
        autoCapitalize="none"
        error={errors.windowStart}
      />

      <Input
        label="Collect until"
        value={windowEnd}
        onChangeText={setWindowEnd}
        placeholder={DATE_TIME_HINT}
        autoCapitalize="none"
        error={errors.windowEnd}
      />

      <Button label="Next: Add Items" onPress={handleNext} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  step: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.accent,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
    marginBottom: spacing.lg,
  },
  note: {
    backgroundColor: colours.surface,
    borderRadius: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  noteText: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    lineHeight: 18,
  },
});
