export type Language = 'en' | 'si';

/** A string that changes with a count: "1 item" / "3 items". */
export interface Plural {
  one: string;
  other: string;
}

/**
 * Every dotted key in a dictionary, e.g. "donor.myListings.title".
 *
 * Plural objects ({ one, other }) count as a single key, so t() accepts
 * "common.items" and picks the form from the count.
 */
export type TranslationKey<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends Plural
      ? `${P}${K}`
      : TranslationKey<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Same shape as the English dictionary, with every value a plain string. */
export type Widen<T> = {
  [K in keyof T]: T[K] extends string ? string : Widen<T[K]>;
};

export type TranslateParams = Record<string, string | number>;
