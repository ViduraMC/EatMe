import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Input, ScreenContainer, StatusPill } from '../../components';
import { createListing } from '../../api/donations.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import {
  DATE_HINT,
  DATE_TIME_HINT,
  formatDateTime,
  formatTimeUntil,
  parseLocalDateTime,
  toInputValue,
} from '../../utils/datetime';
import type {
  DraftItem,
  ItemCategory,
  ItemUnit,
  StorageType,
} from '../../types/donation';
import type { DonorStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DonorStackParamList, 'AddItems'>;

const UNITS: ItemUnit[] = ['kg', 'servings', 'loaves', 'packets', 'cans', 'litres'];
const STORAGE: StorageType[] = ['ambient', 'chilled', 'frozen'];

/** A small selectable chip. Used for unit and storage type. */
function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Step 2 of 2: the food items, then publish.
 *
 * The category toggle is the important control on this screen. Packaged food
 * takes an expiry date; prepared food takes the time it was cooked plus a safe
 * window, and its expiry is derived. Showing the wrong pair of fields is how a
 * donor ends up submitting an item the API rejects, so only one pair is ever
 * on screen.
 */
export function AddItemsScreen({ navigation, route }: Props) {
  const details = route.params;

  const [items, setItems] = useState<DraftItem[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [category, setCategory] = useState<ItemCategory>('packaged');
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<ItemUnit>('kg');
  const [storageType, setStorageType] = useState<StorageType>('ambient');
  const [expiryDate, setExpiryDate] = useState('');
  const [preparedAt, setPreparedAt] = useState(toInputValue(new Date()));
  const [safeWindowHours, setSafeWindowHours] = useState('');

  /**
   * Live preview of when prepared food stops being safe.
   *
   * Only the arithmetic, prepared_at + safe_window_hours, is repeated here.
   * The urgency thresholds are not: those stay on the server and come back on
   * the response, so the two cannot drift.
   */
  const computedExpiry = useMemo(() => {
    if (category !== 'prepared') return null;
    const prepared = parseLocalDateTime(preparedAt);
    const hours = Number(safeWindowHours);
    if (!prepared || !Number.isFinite(hours) || hours <= 0) return null;
    return new Date(prepared.getTime() + hours * 3600_000);
  }, [category, preparedAt, safeWindowHours]);

  function resetForm() {
    setFoodName('');
    setQuantity('');
    setExpiryDate('');
    setSafeWindowHours('');
    setPreparedAt(toInputValue(new Date()));
    setErrors({});
  }

  function handleAddItem() {
    const next: Record<string, string> = {};

    if (foodName.trim().length < 2) next.foodName = 'Enter the food name';

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0)
      next.quantity = 'Quantity must be more than zero';

    const draft: DraftItem = {
      foodName: foodName.trim(),
      category,
      quantity: qty,
      unit,
      storageType,
    };

    if (category === 'packaged') {
      const expiry = parseLocalDateTime(expiryDate);
      if (!expiry) {
        next.expiryDate = `Use the format ${DATE_HINT}`;
      } else if (expiry.getTime() <= Date.now()) {
        next.expiryDate = 'That date has already passed';
      } else {
        draft.expiryDate = expiry.toISOString();
      }
    } else {
      const prepared = parseLocalDateTime(preparedAt);
      const hours = Number(safeWindowHours);

      if (!prepared) {
        next.preparedAt = `Use the format ${DATE_TIME_HINT}`;
      } else if (prepared.getTime() > Date.now() + 60_000) {
        next.preparedAt = 'Food cannot be prepared in the future';
      }
      if (!Number.isFinite(hours) || hours <= 0) {
        next.safeWindowHours = 'Enter how many hours it stays safe';
      }
      if (prepared && hours > 0) {
        if (prepared.getTime() + hours * 3600_000 <= Date.now()) {
          next.safeWindowHours = 'That window has already closed';
        } else {
          draft.preparedAt = prepared.toISOString();
          draft.safeWindowHours = hours;
        }
      }
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setItems((current) => [...current, draft]);
    resetForm();
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function handlePublish() {
    if (items.length === 0) {
      setFormError('Add at least one food item before publishing');
      return;
    }

    setFormError(null);
    setPublishing(true);
    try {
      const listing = await createListing({
        title: details.title,
        description: details.description || null,
        pickupAddress: details.pickupAddress,
        pickupWindowStart: details.pickupWindowStart,
        pickupWindowEnd: details.pickupWindowEnd,
        items,
      });

      const urgentCount = listing.items.filter((i) => i.isUrgent).length;
      Alert.alert(
        'Listing published',
        urgentCount > 0
          ? `${listing.items.length} item${listing.items.length === 1 ? '' : 's'} published. ${urgentCount} marked urgent, so recipients will see it first.`
          : `${listing.items.length} item${listing.items.length === 1 ? '' : 's'} published.`,
      );

      // Back to the list, which reloads on focus and shows the new listing.
      navigation.navigate('MyListings');
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <ScreenContainer scroll avoidKeyboard>
      <Text style={styles.step}>Step 2 of 2</Text>
      <Text style={styles.heading}>Add food items</Text>
      <Text style={styles.listingTitle} numberOfLines={1}>
        {details.title}
      </Text>

      {/* Category toggle. Decides which expiry fields appear below. */}
      <View style={styles.toggle}>
        {(['packaged', 'prepared'] as ItemCategory[]).map((value) => (
          <Pressable
            key={value}
            onPress={() => {
              setCategory(value);
              setErrors({});
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: category === value }}
            style={[styles.toggleHalf, category === value && styles.toggleHalfActive]}
          >
            <Text
              style={[styles.toggleText, category === value && styles.toggleTextActive]}
            >
              {value === 'packaged' ? 'Packaged' : 'Prepared'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>
        {category === 'packaged'
          ? 'Sealed food with a printed expiry date.'
          : 'Cooked food. Its expiry is worked out from when it was made, and it always counts as urgent.'}
      </Text>

      <Input
        label="Food name"
        value={foodName}
        onChangeText={setFoodName}
        placeholder={
          category === 'packaged' ? 'Sliced bread loaves' : 'Chicken fried rice'
        }
        error={errors.foodName}
      />

      <Input
        label="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        placeholder="25"
        keyboardType="numeric"
        error={errors.quantity}
      />

      <Text style={styles.fieldLabel}>Unit</Text>
      <View style={styles.chipRow}>
        {UNITS.map((u) => (
          <Chip key={u} label={u} selected={unit === u} onPress={() => setUnit(u)} />
        ))}
      </View>

      <Text style={styles.fieldLabel}>Storage</Text>
      <View style={styles.chipRow}>
        {STORAGE.map((s) => (
          <Chip
            key={s}
            label={s}
            selected={storageType === s}
            onPress={() => setStorageType(s)}
          />
        ))}
      </View>

      {category === 'packaged' ? (
        <Input
          label="Expiry date"
          value={expiryDate}
          onChangeText={setExpiryDate}
          placeholder={DATE_HINT}
          autoCapitalize="none"
          error={errors.expiryDate}
        />
      ) : (
        <>
          <Input
            label="Prepared at"
            value={preparedAt}
            onChangeText={setPreparedAt}
            placeholder={DATE_TIME_HINT}
            autoCapitalize="none"
            error={errors.preparedAt}
          />
          <Button
            label="Just now"
            variant="secondary"
            onPress={() => setPreparedAt(toInputValue(new Date()))}
            style={styles.nowButton}
          />
          <Input
            label="Stays safe for (hours)"
            value={safeWindowHours}
            onChangeText={setSafeWindowHours}
            placeholder="4"
            keyboardType="numeric"
            error={errors.safeWindowHours}
          />

          <View style={styles.calculated}>
            <Text style={styles.calculatedLabel}>Calculated expiry</Text>
            <Text style={styles.calculatedValue}>
              {computedExpiry
                ? `${formatDateTime(computedExpiry)}  (${formatTimeUntil(computedExpiry)})`
                : 'Enter a preparation time and a safe window'}
            </Text>
          </View>
        </>
      )}

      <Button label="Add to listing" variant="secondary" onPress={handleAddItem} />

      {items.length > 0 && (
        <View style={styles.added}>
          <Text style={styles.addedHeading}>Items added ({items.length})</Text>
          {items.map((item, index) => (
            <Card key={`${item.foodName}-${index}`}>
              <View style={styles.addedTop}>
                <Text style={styles.addedName} numberOfLines={1}>
                  {item.foodName}
                </Text>
                <StatusPill
                  label={item.category}
                  tone={item.category === 'prepared' ? 'urgent' : 'neutral'}
                />
              </View>
              <Text style={styles.addedMeta}>
                {item.quantity} {item.unit} · {item.storageType}
              </Text>
              <Text style={styles.addedMeta}>
                {item.category === 'packaged'
                  ? `Expires ${formatDateTime(item.expiryDate)}`
                  : `Safe for ${item.safeWindowHours}h from ${formatDateTime(item.preparedAt)}`}
              </Text>
              <Button
                label="Remove"
                variant="secondary"
                onPress={() => removeItem(index)}
                style={styles.removeButton}
              />
            </Card>
          ))}
        </View>
      )}

      {!!formError && <Text style={styles.error}>{formError}</Text>}

      <Button
        label={items.length === 0 ? 'Publish' : `Publish listing (${items.length})`}
        onPress={handlePublish}
        loading={publishing}
        disabled={items.length === 0}
        style={styles.publish}
      />
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
  },
  listingTitle: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginBottom: spacing.lg,
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  toggleHalf: {
    flex: 1,
    height: layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.background,
  },
  toggleHalfActive: { backgroundColor: colours.accent },
  toggleText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textSecondary,
  },
  toggleTextActive: { color: colours.textInverse },
  hint: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.radius,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    backgroundColor: colours.background,
  },
  chipSelected: { borderColor: colours.accent, backgroundColor: colours.surface },
  chipText: { fontSize: fontSize.secondary, color: colours.textSecondary },
  chipTextSelected: { color: colours.accent, fontWeight: fontWeight.semibold },
  nowButton: { marginBottom: spacing.md },
  calculated: {
    backgroundColor: colours.surface,
    borderRadius: layout.radius,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  calculatedLabel: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    marginBottom: spacing.xs,
  },
  calculatedValue: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },
  added: { marginTop: spacing.lg },
  addedHeading: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    marginBottom: spacing.sm,
  },
  addedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  addedName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  addedMeta: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    lineHeight: 20,
  },
  removeButton: { marginTop: spacing.sm },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginTop: spacing.md,
  },
  publish: { marginTop: spacing.lg },
});
