import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Chip, ChipRow } from './Chip';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { PressableScale } from './PressableScale';
import { makeStyles, useTheme } from '../theme';
import { useI18n } from '../i18n';
import { useFormat } from '../i18n/format';
import { haptics } from '../utils/haptics';

type Mode = 'datetime' | 'date';

export interface DatePreset {
  label: string;
  value: () => Date;
}

interface DateTimeFieldProps {
  label: string;
  value: Date | null;
  onChange: (value: Date) => void;
  mode?: Mode;
  /** Earliest selectable moment. Days and times before it are greyed out. */
  minimum?: Date;
  maximum?: Date;
  /** One-tap choices shown above the calendar. Defaults suit a pickup time. */
  presets?: DatePreset[];
  helper?: string;
  error?: string;
  optional?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SLOT_MINUTES = 30;

function atTime(base: Date, hours: number, minutes = 0): Date {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  return atTime(d, 0, 0);
}

/** The next half-hour slot at or after `d`. */
function roundUp(d: Date): Date {
  const r = new Date(d);
  r.setSeconds(0, 0);
  const m = r.getMinutes();
  const add = m % SLOT_MINUTES === 0 ? 0 : SLOT_MINUTES - (m % SLOT_MINUTES);
  r.setMinutes(m + add);
  return r;
}

/**
 * Date and time without typing.
 *
 * The old form asked donors to type "2026-08-20 18:30". That was error-prone
 * (format, 24-hour clock, UTC traps) and slow on a phone keyboard. This
 * field opens a sheet with one-tap shortcuts for the common cases ("This
 * evening"), a calendar, and half-hourly time slots. Anything before the
 * minimum is greyed out rather than rejected after the fact, so an invalid
 * pickup time cannot be chosen in the first place.
 *
 * Date-only mode stores 23:59 on the chosen day: food "best before 20
 * August" is good all through the 20th.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'datetime',
  minimum,
  maximum,
  presets,
  helper,
  error,
  optional,
  style,
}: DateTimeFieldProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const [open, setOpen] = useState(false);

  const display = value
    ? mode === 'date'
      ? f.day(value) === f.dateShort(value)
        ? f.dateMedium(value)
        : `${f.day(value)} · ${f.dateMedium(value)}`
      : f.dayTime(value)
    : null;

  const defaultPresets: DatePreset[] = useMemo(() => {
    if (mode === 'date') {
      return [
        { label: t('time.today'), value: () => atTime(new Date(), 23, 59) },
        {
          label: t('time.tomorrow'),
          value: () => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            return atTime(d, 23, 59);
          },
        },
        {
          label: t('picker.inOneWeek'),
          value: () => {
            const d = new Date();
            d.setDate(d.getDate() + 7);
            return atTime(d, 23, 59);
          },
        },
      ];
    }
    return [
      {
        label: t('picker.inOneHour'),
        value: () => roundUp(new Date(Date.now() + 3_600_000)),
      },
      { label: t('picker.thisEvening'), value: () => atTime(new Date(), 18, 0) },
      {
        label: t('picker.tomorrowMorning'),
        value: () => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          return atTime(d, 9, 0);
        },
      },
      {
        label: t('picker.tomorrowEvening'),
        value: () => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          return atTime(d, 18, 0);
        },
      },
    ];
  }, [mode, t]);

  const hint = error ?? helper;

  return (
    <View style={[styles.wrapper, style]}>
      <AppText variant="secondaryStrong" style={styles.label}>
        {label}
        {optional ? (
          <AppText variant="secondary" color="textSecondary">
            {`  (${t('common.optional').toLowerCase()})`}
          </AppText>
        ) : null}
      </AppText>
      <PressableScale
        onPress={() => setOpen(true)}
        scaleTo={0.99}
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display ?? t(mode === 'date' ? 'picker.placeholderDate' : 'picker.placeholder')}`}
        accessibilityHint={hint}
        style={[styles.field, !!error && { borderColor: theme.colors.critical }]}
      >
        <Icon
          name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
          size={20}
          color="textSecondary"
        />
        <AppText
          variant="body"
          color={display ? 'text' : 'textTertiary'}
          style={styles.flex}
          numberOfLines={1}
        >
          {display ??
            t(mode === 'date' ? 'picker.placeholderDate' : 'picker.placeholder')}
        </AppText>
        <Icon name="chevron-down" size={18} color="textTertiary" />
      </PressableScale>
      {hint ? (
        <View style={styles.hintRow}>
          {error ? <Icon name="alert-circle" size={15} color="criticalText" /> : null}
          <AppText
            variant="caption"
            color={error ? 'criticalText' : 'textSecondary'}
            style={styles.flex}
          >
            {hint}
          </AppText>
        </View>
      ) : null}

      {open ? (
        <PickerSheet
          title={label}
          mode={mode}
          initial={value}
          minimum={minimum}
          maximum={maximum}
          presets={presets ?? defaultPresets}
          onCancel={() => setOpen(false)}
          onDone={(next) => {
            setOpen(false);
            onChange(next);
          }}
        />
      ) : null}
    </View>
  );
}

function PickerSheet({
  title,
  mode,
  initial,
  minimum,
  maximum,
  presets,
  onCancel,
  onDone,
}: {
  title: string;
  mode: Mode;
  initial: Date | null;
  minimum?: Date;
  maximum?: Date;
  presets: DatePreset[];
  onCancel: () => void;
  onDone: (d: Date) => void;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const [visible, setVisible] = useState(true);
  const [draft, setDraft] = useState<Date>(() => {
    const start =
      initial ??
      (mode === 'date'
        ? atTime(new Date(), 23, 59)
        : roundUp(new Date(Date.now() + 3_600_000)));
    return minimum && start < minimum ? roundUp(minimum) : start;
  });
  const [cursor, setCursor] = useState(
    () => new Date(draft.getFullYear(), draft.getMonth(), 1),
  );
  const slotScroll = useRef<ScrollView>(null);

  const months = t('time.months').split('|');
  const weekdays = t('time.weekdaysMin').split('|');

  const minDay = minimum ? startOfDay(minimum) : null;
  const maxDay = maximum ? startOfDay(maximum) : null;

  const weeks = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
    ).getDate();
    const cells: (Date | null)[] = Array.from({ length: first.getDay() }, () => null);
    for (let d = 1; d <= daysInMonth; d++)
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [cursor]);

  const slots = useMemo(
    () =>
      Array.from({ length: (24 * 60) / SLOT_MINUTES }, (_, i) =>
        atTime(draft, Math.floor((i * SLOT_MINUTES) / 60), (i * SLOT_MINUTES) % 60),
      ),
    [draft],
  );

  const selectedSlot = slots.findIndex(
    (s) => s.getHours() === draft.getHours() && s.getMinutes() === draft.getMinutes(),
  );

  // Bring the selected time into view whenever the day changes.
  useEffect(() => {
    if (mode !== 'datetime' || selectedSlot < 0) return;
    const id = setTimeout(() => {
      slotScroll.current?.scrollTo({
        x: Math.max(0, selectedSlot * 96 - 120),
        animated: true,
      });
    }, 250);
    return () => clearTimeout(id);
  }, [mode, selectedSlot, draft]);

  const dayDisabled = (d: Date) =>
    (minDay !== null && d < minDay) || (maxDay !== null && d > maxDay);
  const slotDisabled = (s: Date) =>
    (minimum !== undefined && s < minimum) || (maximum !== undefined && s > maximum);

  function pickDay(d: Date) {
    haptics.selection();
    let next =
      mode === 'date'
        ? atTime(d, 23, 59)
        : atTime(d, draft.getHours(), draft.getMinutes());
    if (mode === 'datetime' && minimum && next < minimum) next = roundUp(minimum);
    setDraft(next);
  }

  const prevDisabled =
    minDay !== null && new Date(cursor.getFullYear(), cursor.getMonth(), 0) < minDay;

  const close = (then: () => void) => {
    setVisible(false);
    setTimeout(then, 230);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={() => close(onCancel)}
      title={title}
      subtitle={
        mode === 'date' ? f.dateLong(draft) : `${f.dateLong(draft)} · ${f.time(draft)}`
      }
      scrollable
      footer={
        <View style={styles.actions}>
          <Button
            label={t('common.cancel')}
            variant="secondary"
            onPress={() => close(onCancel)}
            style={styles.flex}
          />
          <Button
            label={t('common.done')}
            onPress={() => close(() => onDone(draft))}
            style={styles.flex}
          />
        </View>
      }
    >
      <ChipRow style={styles.presets}>
        {presets.map((p) => {
          const v = p.value();
          const disabled = slotDisabled(v);
          return (
            <Chip
              key={p.label}
              label={p.label}
              icon="flash-outline"
              selected={v.getTime() === draft.getTime()}
              onPress={
                disabled
                  ? undefined
                  : () => {
                      setDraft(v);
                      setCursor(new Date(v.getFullYear(), v.getMonth(), 1));
                    }
              }
              style={disabled ? styles.disabledChip : undefined}
            />
          );
        })}
      </ChipRow>

      <View style={styles.monthRow}>
        <IconButton
          icon="chevron-back"
          size="sm"
          variant="tonal"
          disabled={prevDisabled}
          onPress={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
          accessibilityLabel={t('picker.previousMonth')}
        />
        <Animated.View key={cursor.toISOString()} entering={FadeIn.duration(180)}>
          <AppText variant="subtitle" accessibilityRole="header">
            {`${months[cursor.getMonth()] ?? ''} ${cursor.getFullYear()}`}
          </AppText>
        </Animated.View>
        <IconButton
          icon="chevron-forward"
          size="sm"
          variant="tonal"
          onPress={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
          accessibilityLabel={t('picker.nextMonth')}
        />
      </View>

      <View style={styles.weekRow}>
        {weekdays.map((w, i) => (
          <AppText
            key={`${w}-${i}`}
            variant="caption"
            color="textTertiary"
            align="center"
            style={styles.cell}
          >
            {w}
          </AppText>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((d, di) => {
            if (!d) return <View key={di} style={styles.cell} />;
            const selected = sameDay(d, draft);
            const today = sameDay(d, new Date());
            const disabled = dayDisabled(d);
            return (
              <PressableScale
                key={di}
                onPress={() => pickDay(d)}
                disabled={disabled}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel={f.dateLong(d)}
                accessibilityState={{ selected, disabled }}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.day,
                    today &&
                      !selected && { borderWidth: 1.5, borderColor: theme.colors.brand },
                    selected && { backgroundColor: theme.colors.brand },
                  ]}
                >
                  <AppText
                    variant={selected || today ? 'secondaryStrong' : 'secondary'}
                    color={selected ? 'onBrand' : disabled ? 'textTertiary' : 'text'}
                    style={disabled ? styles.struck : undefined}
                  >
                    {String(d.getDate())}
                  </AppText>
                </View>
              </PressableScale>
            );
          })}
        </View>
      ))}

      {mode === 'datetime' ? (
        <>
          <AppText variant="secondaryStrong" style={styles.timeLabel}>
            {t('picker.time')}
          </AppText>
          <ScrollView
            ref={slotScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slots}
            style={styles.slotStrip}
          >
            {slots.map((s, i) => {
              const disabled = slotDisabled(s);
              const selected = i === selectedSlot;
              return (
                <PressableScale
                  key={i}
                  onPress={() => {
                    haptics.selection();
                    setDraft(s);
                  }}
                  disabled={disabled}
                  scaleTo={0.94}
                  accessibilityRole="button"
                  accessibilityLabel={
                    disabled ? `${f.time(s)}, ${t('picker.unavailable')}` : f.time(s)
                  }
                  accessibilityState={{ selected, disabled }}
                  style={[
                    styles.slot,
                    selected && {
                      backgroundColor: theme.colors.brand,
                      borderColor: theme.colors.brand,
                    },
                    disabled && styles.slotDisabled,
                  ]}
                >
                  <AppText
                    variant="secondaryStrong"
                    color={selected ? 'onBrand' : disabled ? 'textTertiary' : 'text'}
                  >
                    {f.time(s)}
                  </AppText>
                </PressableScale>
              );
            })}
          </ScrollView>
        </>
      ) : null}
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { marginBottom: t.spacing.md + 4 },
  label: { marginBottom: t.spacing.sm },
  field: {
    minHeight: t.layout.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 2,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
  },
  flex: { flex: 1 },
  hintRow: { flexDirection: 'row', gap: t.spacing.xs, marginTop: t.spacing.xs + 2 },
  actions: { flexDirection: 'row', gap: t.spacing.sm + 4 },
  presets: { marginBottom: t.spacing.md },
  disabledChip: { opacity: 0.4 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: t.spacing.sm,
  },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 44 },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  struck: { textDecorationLine: 'line-through' },
  timeLabel: { marginTop: t.spacing.md, marginBottom: t.spacing.sm },
  slotStrip: { marginHorizontal: -t.layout.screenPadding, flexGrow: 0 },
  slots: {
    paddingHorizontal: t.layout.screenPadding,
    gap: t.spacing.sm,
    paddingBottom: t.spacing.sm,
  },
  slot: {
    width: 88,
    height: 44,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotDisabled: { opacity: 0.4 },
}));
