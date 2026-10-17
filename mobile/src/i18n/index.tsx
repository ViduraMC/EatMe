import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { en, type Dictionary } from './en';
import { si } from './si';
import type { Language, Plural, TranslateParams, TranslationKey, Widen } from './types';
import { writePref } from '../utils/preferences';

export type { Language } from './types';
export type TKey = TranslationKey<Dictionary>;

const dictionaries: Record<Language, Widen<Dictionary>> = { en, si };

export const LANGUAGES: readonly Language[] = ['en', 'si'];

function lookup(dictionary: unknown, key: string): unknown {
  let node: unknown = dictionary;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return node;
}

function isPlural(value: unknown): value is Plural {
  return !!value && typeof value === 'object' && 'one' in value && 'other' in value;
}

/**
 * Resolves a key to a string in the given language.
 *
 * Falls back to English, then to the key itself, so a gap in a dictionary
 * degrades to readable English instead of a crash or a blank label.
 */
export function translate(
  language: Language,
  key: TKey,
  params?: TranslateParams,
): string {
  let value = lookup(dictionaries[language], key);
  if (value === undefined) value = lookup(en, key);

  if (isPlural(value)) {
    value = params?.count === 1 ? value.one : value.other;
  }
  if (typeof value !== 'string') return key;

  if (!params) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TKey, params?: TranslateParams) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

/**
 * Provides the current language.
 *
 * The saved language is read before the first render (App.tsx does it while
 * the splash screen is up), so a Sinhala user never sees a flash of English.
 */
export function LanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: Language;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    void writePref('language', next);
  }, []);

  const t = useCallback(
    (key: TKey, params?: TranslateParams) => translate(language, key, params),
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside LanguageProvider');
  }
  return context;
}

/** Shorthand for components that only need t(). */
export function useT(): I18nContextValue['t'] {
  return useI18n().t;
}

export function isLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'si';
}
