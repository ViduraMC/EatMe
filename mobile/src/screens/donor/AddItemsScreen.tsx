import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, View, type TextInput } from 'react-native';
import Animated from 'react-native-reanimated';
import { CommonActions } from '@react-navigation/native';
import {
  AppText,
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  ChipRow,
  DateTimeField,
  Icon,
  IconButton,
  Illustration,
  InfoBanner,
  ProgressBar,
  QuantityStepper,
  Screen,
  SectionHeader,
  SegmentedControl,
  TextField,
  useToast,
  type DatePreset,
} from '../../components';
import { createListing } from '../../api/donations.api';
import { useI18n, type TKey } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat } from '../../i18n/format';
import { makeStyles } from '../../theme';
import {
  enterListItem,
  enterSection,
  exitFade,
  layoutTransition,
  useReducedMotion,
} from '../../theme/animations';
import { haptics } from '../../utils/haptics';
import { itemIcon } from '../../utils/listing';
import type {
  DraftItem,
  ItemCategory,
  ItemUnit,
  StorageType,
} from '../../types/donation';
import type { DonorStackProps } from '../../navigation/types';

const HOUR = 3_600_000;
const MAX_ITEMS = 20;
const UNITS: ItemUnit[] = ['servings', 'packets', 'kg', 'loaves', 'cans', 'litres'];
const WINDOWS = [2, 4, 6, 12, 24];

type Field = 'foodName' | 'quantity' | 'expiryDate' | 'preparedAt' | 'safeWindow';
type Errors = Partial<Record<Field, TKey>>;

interface Keyed extends DraftItem {
  key: number;
}

/**
 * Step 2 of 2: the food itself.
 *
 * Each type of food is added separately (rice, curry, bread), because a
 * recipient requests per item and each has its own expiry. The form shows
 * only the fields that apply to the chosen type: packaged food needs its
 * printed date; cooked food needs when it was cooked and how long it stays
 * safe, with a live "Safe until..." preview so the donor can check the
 * maths before publishing.
 *
 * Removing an item offers Undo instead of asking "Are you sure?", which is
 * faster when the tap was deliberate and still safe when it wasn't.
 */
export function AddItemsScreen({ navigation, route }: DonorStackProps<'AddItems'>) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const toast = useToast();
  const reduced = useReducedMotion();
  const details = route.params;
  const nameRef = useRef<TextInput>(null);
  const keySeq = useRef(0);

  const [items, setItems] = useState<Keyed[]>([]);
  const [category, setCategory] = useState<ItemCategory>('prepared');
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<ItemUnit>('servings');
  const [storage, setStorage] = useState<StorageType>('ambient');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [preparedAt, setPreparedAt] = useState<Date | null>(() => new Date());
  const [safeHours, setSafeHours] = useState(4);
  const [errors, setErrors] = useState<Errors>({});
  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [published, setPublished] = useState<{
    listingId: number;
    urgent: number;
  } | null>(null);

  // Arithmetic only: the urgency thresholds stay on the server.
  const safeUntil = useMemo(
    () =>
      category === 'prepared' && preparedAt
        ? new Date(preparedAt.getTime() + safeHours * HOUR)
        : null,
    [category, preparedAt, safeHours],
  );

  function switchCategory(next: ItemCategory) {
    setCategory(next);
    setUnit(next === 'prepared' ? 'servings' : 'packets');
    setErrors({});
  }

  function resetForm() {
    setFoodName('');
    setQuantity('');
    setExpiryDate(null);
    setPreparedAt(new Date());
    setErrors({});
  }

  function addItem() {
    const e: Errors = {};
    if (foodName.trim().length < 2) e.foodName = 'donor.foodShort';
    const qty = Number(quantity.replace(',', '.'));
    if (!Number.isFinite(qty) || qty <= 0) e.quantity = 'donor.quantityInvalid';

    const draft: DraftItem = {
      foodName: foodName.trim(),
      category,
      quantity: qty,
      unit,
      storageType: storage,
    };
    if (category === 'packaged') {
      if (!expiryDate) e.expiryDate = 'donor.expiryRequired';
      else if (expiryDate.getTime() <= Date.now()) e.expiryDate = 'donor.expiryPast';
      else draft.expiryDate = expiryDate.toISOString();
    } else {
      if (!preparedAt) e.preparedAt = 'donor.expiryRequired';
      else if (preparedAt.getTime() > Date.now() + 60_000)
        e.preparedAt = 'donor.preparedFuture';
      else if (preparedAt.getTime() + safeHours * HOUR <= Date.now())
        e.safeWindow = 'donor.alreadyExpired';
      else {
        draft.preparedAt = preparedAt.toISOString();
        draft.safeWindowHours = safeHours;
      }
    }

    setErrors(e);
    if (Object.keys(e).length > 0) {
      haptics.error();
      return;
    }
    keySeq.current += 1;
    setItems((current) => [...current, { ...draft, key: keySeq.current }]);
    haptics.success();
    resetForm();
  }

  function removeItem(key: number) {
    const index = items.findIndex((i) => i.key === key);
    const removed = items[index];
    if (!removed) return;
    setItems((current) => current.filter((i) => i.key !== key));
    toast.show({
      type: 'info',
      title: t('donor.itemRemoved', { name: removed.foodName }),
      actionLabel: t('donor.undo'),
      onAction: () =>
        setItems((current) => {
          const next = [...current];
          next.splice(Math.min(index, next.length), 0, removed);
          return next;
        }),
    });
  }

  async function publish() {
    if (items.length === 0) {
      setFormError(t('donor.noItemsHint'));
      haptics.error();
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
        items: items.map(({ key: _key, ...draft }) => draft),
      });
      haptics.success();
      setPublished({
        listingId: listing.listingId,
        urgent: listing.items.filter((i) => i.isUrgent).length,
      });
    } catch (err) {
      setFormError(describeError(err, t).message);
    } finally {
      setPublishing(false);
    }
  }

  /** Leave the create flow entirely, so Back does not return to a spent form. */
  function finish(openListing: boolean) {
    const listingId = published?.listingId;
    setPublished(null);
    navigation.dispatch(
      CommonActions.reset({
        index: openListing ? 1 : 0,
        routes: [
          { name: 'DonorTabs', params: { screen: 'MyListings' } },
          ...(openListing && listingId
            ? [{ name: 'ListingDetail', params: { listingId } }]
            : []),
        ],
      }),
    );
  }

  const preparedPresets: DatePreset[] = [
    { label: t('time.now'), value: () => new Date() },
    { label: t('time.hoursAgo', { count: 1 }), value: () => new Date(Date.now() - HOUR) },
    {
      label: t('time.hoursAgo', { count: 2 }),
      value: () => new Date(Date.now() - 2 * HOUR),
    },
  ];

  const err = (field: Field) => (errors[field] ? t(errors[field]!) : undefined);
  const full = items.length >= MAX_ITEMS;

  return (
    <Screen
      edges={['left', 'right']}
      avoidKeyboard
      footer={
        <Button
          label={
            items.length > 0
              ? `${t('donor.publish')} · ${t('common.items', { count: items.length })}`
              : t('donor.publish')
          }
          icon="paper-plane-outline"
          size="lg"
          onPress={() => void publish()}
          loading={publishing}
          disabled={items.length === 0}
        />
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progress}>
          <AppText variant="caption" color="textSecondary">
            {t('auth.stepOf', { step: 2, total: 2 })}
          </AppText>
          <ProgressBar value={1} height={6} />
        </View>

        <Animated.View entering={enterSection(0, reduced)}>
          <AppText variant="title" accessibilityRole="header">
            {t('donor.itemsTitle')}
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.subtitle}>
            {t('donor.itemsSubtitle')}
          </AppText>
          <Card variant="tinted" style={styles.summary}>
            <Icon name="mc:basket-outline" size={22} color="brandText" />
            <View style={styles.flex}>
              <AppText variant="secondaryStrong" numberOfLines={1}>
                {details.title}
              </AppText>
              <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                {f.window(details.pickupWindowStart, details.pickupWindowEnd)}
              </AppText>
            </View>
          </Card>
        </Animated.View>

        <SectionHeader
          title={t('donor.inThisListing')}
          meta={items.length > 0 ? String(items.length) : undefined}
        />
        {items.length === 0 ? (
          <View style={styles.placeholder}>
            <Icon name="mc:food-outline" size={26} color="textTertiary" />
            <AppText variant="secondary" color="textSecondary" align="center">
              {t('donor.noItemsYet')}
            </AppText>
          </View>
        ) : (
          items.map((item, index) => (
            <Animated.View
              key={item.key}
              entering={enterListItem(index > 0 ? 1 : 0, reduced)}
              exiting={exitFade()}
              layout={layoutTransition(reduced)}
            >
              <Card variant="flat" style={styles.itemRow}>
                <View style={styles.itemIcon}>
                  <Icon name={itemIcon(item)} size={20} color="brandText" />
                </View>
                <View style={styles.flex}>
                  <AppText variant="secondaryStrong" numberOfLines={1}>
                    {item.foodName}
                  </AppText>
                  <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                    {`${f.quantity(item.quantity, item.unit)} · ${t(`storage.${item.storageType}`)}`}
                  </AppText>
                  <View style={styles.itemBadges}>
                    <Badge
                      size="sm"
                      label={t(`categories.${item.category}`)}
                      tone={item.category === 'prepared' ? 'urgent' : 'olive'}
                    />
                    <AppText variant="caption" color="textSecondary">
                      {item.category === 'packaged' && item.expiryDate
                        ? t('donor.expires', { when: f.dateShort(item.expiryDate) })
                        : item.preparedAt && item.safeWindowHours
                          ? t('donor.safeUntil', {
                              when: f.dayTime(
                                new Date(
                                  new Date(item.preparedAt).getTime() +
                                    item.safeWindowHours * HOUR,
                                ),
                              ),
                            })
                          : ''}
                    </AppText>
                  </View>
                </View>
                <IconButton
                  icon="trash-outline"
                  tone="critical"
                  variant="tonal"
                  size="sm"
                  onPress={() => removeItem(item.key)}
                  accessibilityLabel={t('donor.removeItem', { name: item.foodName })}
                />
              </Card>
            </Animated.View>
          ))
        )}

        <SectionHeader title={t('donor.newItem')} />
        {full ? (
          <InfoBanner tone="urgent" message={t('donor.maxItems')} />
        ) : (
          <Card variant="flat" style={styles.form}>
            <AppText variant="secondaryStrong" style={styles.label}>
              {t('donor.typeLabel')}
            </AppText>
            <SegmentedControl<ItemCategory>
              accessibilityLabel={t('donor.typeLabel')}
              value={category}
              onChange={switchCategory}
              segments={[
                {
                  value: 'prepared',
                  label: t('categories.prepared'),
                  icon: 'mc:pot-steam-outline',
                },
                {
                  value: 'packaged',
                  label: t('categories.packaged'),
                  icon: 'mc:package-variant-closed',
                },
              ]}
              style={styles.segment}
            />
            <AppText variant="caption" color="textSecondary" style={styles.categoryHint}>
              {t(
                category === 'prepared'
                  ? 'categories.preparedHint'
                  : 'categories.packagedHint',
              )}
            </AppText>

            <TextField
              ref={nameRef}
              label={t('donor.foodName')}
              value={foodName}
              onChangeText={(v) => {
                setFoodName(v);
                if (errors.foodName) setErrors((e) => ({ ...e, foodName: undefined }));
              }}
              error={err('foodName')}
              placeholder={t(
                category === 'prepared'
                  ? 'donor.foodPlaceholderPrepared'
                  : 'donor.foodPlaceholderPackaged',
              )}
              maxLength={120}
              autoCapitalize="sentences"
            />

            <TextField
              label={t('donor.quantity')}
              value={quantity}
              onChangeText={(v) => {
                setQuantity(v.replace(/[^0-9.,]/g, ''));
                if (errors.quantity) setErrors((e) => ({ ...e, quantity: undefined }));
              }}
              error={err('quantity')}
              placeholder={t('donor.quantityPlaceholder')}
              keyboardType="decimal-pad"
              trailing={
                <AppText variant="secondaryStrong" color="textSecondary">
                  {t(`units.${unit}`, { count: Number(quantity) || 2 })}
                </AppText>
              }
            />
            <ChipRow style={styles.units}>
              {UNITS.map((u) => (
                <Chip
                  key={u}
                  label={t(`units.${u}`, { count: 2 })}
                  selected={unit === u}
                  onPress={() => setUnit(u)}
                />
              ))}
            </ChipRow>

            <AppText variant="secondaryStrong" style={styles.label}>
              {t('donor.storageLabel')}
            </AppText>
            <SegmentedControl<StorageType>
              accessibilityLabel={t('donor.storageLabel')}
              value={storage}
              onChange={setStorage}
              segments={[
                { value: 'ambient', label: t('storage.ambient'), icon: 'sunny-outline' },
                {
                  value: 'chilled',
                  label: t('storage.chilled'),
                  icon: 'mc:fridge-outline',
                },
                { value: 'frozen', label: t('storage.frozen'), icon: 'snow-outline' },
              ]}
              style={styles.segment}
            />

            {category === 'packaged' ? (
              <DateTimeField
                label={t('donor.expiryDate')}
                mode="date"
                value={expiryDate}
                minimum={new Date()}
                helper={t('donor.expiryHelp')}
                error={err('expiryDate')}
                onChange={(d) => {
                  setExpiryDate(d);
                  setErrors((e) => ({ ...e, expiryDate: undefined }));
                }}
              />
            ) : (
              <>
                <DateTimeField
                  label={t('donor.preparedAt')}
                  value={preparedAt}
                  maximum={new Date(Date.now() + 60_000)}
                  presets={preparedPresets}
                  error={err('preparedAt')}
                  onChange={(d) => {
                    setPreparedAt(d);
                    setErrors((e) => ({
                      ...e,
                      preparedAt: undefined,
                      safeWindow: undefined,
                    }));
                  }}
                />
                <View style={styles.windowRow}>
                  <View style={styles.flex}>
                    <AppText variant="secondaryStrong">{t('donor.safeWindow')}</AppText>
                    <AppText variant="caption" color="textSecondary">
                      {t('donor.safeWindowHelp')}
                    </AppText>
                  </View>
                  <QuantityStepper
                    value={safeHours}
                    onChange={(v) => {
                      setSafeHours(v);
                      setErrors((e) => ({ ...e, safeWindow: undefined }));
                    }}
                    min={1}
                    max={72}
                    unit={t('donor.hoursUnit', { count: safeHours })}
                    label={t('donor.safeWindow')}
                  />
                </View>
                <ChipRow style={styles.units}>
                  {WINDOWS.map((h) => (
                    <Chip
                      key={h}
                      label={t('donor.hours', { count: h })}
                      selected={safeHours === h}
                      onPress={() => setSafeHours(h)}
                    />
                  ))}
                </ChipRow>
                {safeUntil ? (
                  <InfoBanner
                    tone={err('safeWindow') ? 'critical' : 'urgent'}
                    icon="time-outline"
                    title={t('donor.safeUntil', { when: f.dayTime(safeUntil) })}
                    message={err('safeWindow') ?? t('donor.cookedFirst')}
                  />
                ) : null}
              </>
            )}

            <Button
              label={t('donor.addItem')}
              variant="tonal"
              icon="add"
              onPress={addItem}
            />
          </Card>
        )}

        {formError ? (
          <InfoBanner tone="critical" message={formError} style={styles.formError} />
        ) : null}
      </ScrollView>

      <BottomSheet visible={!!published} onClose={() => finish(false)} dismissible>
        <View style={styles.success}>
          <Illustration name="success" width={200} />
          <AppText variant="title" align="center" accessibilityRole="header">
            {t('donor.publishedTitle')}
          </AppText>
          <AppText variant="body" color="textSecondary" align="center">
            {t('donor.publishedBody')}
            {published && published.urgent > 0
              ? ` ${t('donor.publishedUrgent', { count: published.urgent })}`
              : ''}
          </AppText>
          <View style={styles.successActions}>
            <Button
              label={t('donor.viewListing')}
              icon="eye-outline"
              onPress={() => finish(true)}
            />
            <Button
              label={t('donor.backToListings')}
              variant="ghost"
              onPress={() => finish(false)}
            />
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: t.layout.screenPadding, paddingBottom: t.spacing.xxl },
  flex: { flex: 1 },
  progress: { gap: t.spacing.xs + 2, marginBottom: t.spacing.lg },
  subtitle: { marginTop: t.spacing.xs, marginBottom: t.spacing.md },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    marginBottom: 0,
  },
  placeholder: {
    alignItems: 'center',
    gap: t.spacing.xs,
    paddingVertical: t.spacing.lg,
    borderRadius: t.radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: t.colors.borderStrong,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    marginBottom: t.spacing.sm,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    marginTop: 4,
  },
  form: { paddingTop: t.spacing.md },
  label: { marginBottom: t.spacing.sm },
  segment: { marginBottom: t.spacing.sm },
  categoryHint: { marginBottom: t.spacing.md },
  units: { marginTop: -t.spacing.sm, marginBottom: t.spacing.md },
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    marginBottom: t.spacing.md,
  },
  formError: { marginTop: t.spacing.md },
  success: { alignItems: 'center', gap: t.spacing.sm, paddingBottom: t.spacing.sm },
  successActions: { alignSelf: 'stretch', gap: t.spacing.xs, marginTop: t.spacing.md },
}));
