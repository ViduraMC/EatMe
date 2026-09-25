import { useMemo } from 'react';
import { useI18n, type TKey } from './index';
import type { Language } from './types';

/**
 * Language-aware formatting for dates, times, quantities and statuses.
 *
 * Month and weekday names come from the dictionaries rather than
 * Intl/toLocaleString. Hermes' Intl support varies by device and Android
 * version, and a missing Sinhala locale would silently fall back to English
 * month names inside a Sinhala sentence. Dictionary names render the same on
 * every phone.
 */

type T = (key: TKey, params?: Record<string, string | number>) => string;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "30.00" -> "30", "2.50" -> "2.5". Quantities arrive as Decimal strings. */
export function formatNumber(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function build(t: T, language: Language) {
  const list = (key: TKey) => t(key).split('|');
  const months = list('time.months');
  const monthsShort = list('time.monthsShort');
  const weekdays = list('time.weekdays');

  const time = (value: string | Date): string => {
    const d = toDate(value);
    const h24 = d.getHours();
    return t('time.clock', {
      h: h24 % 12 === 0 ? 12 : h24 % 12,
      m: String(d.getMinutes()).padStart(2, '0'),
      period: h24 < 12 ? t('time.am') : t('time.pm'),
    });
  };

  const dateShort = (value: string | Date): string => {
    const d = toDate(value);
    return t('time.dateShort', { d: d.getDate(), mon: monthsShort[d.getMonth()] ?? '' });
  };

  const dateMedium = (value: string | Date): string => {
    const d = toDate(value);
    return t('time.dateMedium', {
      d: d.getDate(),
      mon: monthsShort[d.getMonth()] ?? '',
      y: d.getFullYear(),
    });
  };

  const dateLong = (value: string | Date): string => {
    const d = toDate(value);
    return t('time.dateLong', {
      weekday: weekdays[d.getDay()] ?? '',
      d: d.getDate(),
      month: months[d.getMonth()] ?? '',
      y: d.getFullYear(),
    });
  };

  /** "Today", "Tomorrow", "Yesterday" or "13 Aug". */
  const day = (value: string | Date, now = new Date()): string => {
    const d = toDate(value);
    if (isSameDay(d, now)) return t('time.today');
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (isSameDay(d, tomorrow)) return t('time.tomorrow');
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(d, yesterday)) return t('time.yesterday');
    return d.getFullYear() === now.getFullYear() ? dateShort(d) : dateMedium(d);
  };

  /** "Today, 6:30 PM". */
  const dayTime = (value: string | Date): string =>
    t('time.dayAtTime', { day: day(value), time: time(value) });

  /** "Today, 6:00 PM to 9:00 PM", collapsing the second day when it is the same. */
  const window = (start: string | Date, end: string | Date): string => {
    const s = toDate(start);
    const e = toDate(end);
    const endLabel = isSameDay(s, e) ? time(e) : dayTime(e);
    return t('time.range', { start: dayTime(s), end: endLabel });
  };

  /** "in 3 hours" or "3 hours ago". */
  const relative = (value: string | Date, now = Date.now()): string => {
    const diff = toDate(value).getTime() - now;
    const abs = Math.abs(diff);
    if (abs < MINUTE) return t('time.now');
    const future = diff > 0;
    if (abs < HOUR) {
      const count = Math.round(abs / MINUTE);
      return t(future ? 'time.inMinutes' : 'time.minutesAgo', { count });
    }
    if (abs < DAY) {
      const count = Math.round(abs / HOUR);
      return t(future ? 'time.inHours' : 'time.hoursAgo', { count });
    }
    const count = Math.round(abs / DAY);
    return t(future ? 'time.inDays' : 'time.daysAgo', { count });
  };

  /** "3 hours left" or "Expired". */
  const timeLeft = (
    expiry: string | Date | null | undefined,
    now = Date.now(),
  ): string => {
    if (!expiry) return '';
    const diff = toDate(expiry).getTime() - now;
    if (diff <= 0) return t('time.expired');
    if (diff < HOUR)
      return t('time.leftMinutes', { count: Math.max(1, Math.floor(diff / MINUTE)) });
    if (diff < 2 * DAY) return t('time.leftHours', { count: Math.floor(diff / HOUR) });
    return t('time.leftDays', { count: Math.floor(diff / DAY) });
  };

  /** "60 servings" / "කොටස් 60". */
  const quantity = (value: string | number, unit: string): string => {
    const n = formatNumber(value);
    const unitKey = `units.${unit}` as TKey;
    const unitLabel = t(unitKey, { count: Number(n) });
    return t('common.quantity', { n, unit: unitLabel === unitKey ? unit : unitLabel });
  };

  const quantityOf = (
    remaining: string | number,
    total: string | number,
    unit: string,
  ) => {
    const unitKey = `units.${unit}` as TKey;
    const unitLabel = t(unitKey, { count: Number(total) });
    return t('common.quantityOf', {
      remaining: formatNumber(remaining),
      total: formatNumber(total),
      unit: unitLabel === unitKey ? unit : unitLabel,
    });
  };

  const status = (
    kind: 'listing' | 'request' | 'assignment' | 'user' | 'report',
    value: string,
  ): string => {
    const key = `status.${kind}.${value}` as TKey;
    const label = t(key);
    return label === key ? value.replace(/_/g, ' ') : label;
  };

  const greeting = (now = new Date()): string => {
    const h = now.getHours();
    if (h < 12) return t('time.greetingMorning');
    if (h < 17) return t('time.greetingAfternoon');
    return t('time.greetingEvening');
  };

  return {
    language,
    time,
    dateShort,
    dateMedium,
    dateLong,
    day,
    dayTime,
    window,
    relative,
    timeLeft,
    quantity,
    quantityOf,
    status,
    greeting,
    number: formatNumber,
  };
}

export type Formatters = ReturnType<typeof build>;

export function useFormat(): Formatters {
  const { t, language } = useI18n();
  return useMemo(() => build(t, language), [t, language]);
}
