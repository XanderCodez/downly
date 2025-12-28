import i18next from 'i18next';
import en from '../locales/en.json';

// Type helper to recursively get all keys in dot notation
type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`;

type DotNestedKeys<T> = (
  T extends object
  ? {
    [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DotNestedKeys<T[K]>>}`;
  }[Exclude<keyof T, symbol>]
  : ''
) extends infer D
  ? Extract<D, string>
  : never;

export type TranslationKey = DotNestedKeys<typeof en>;

/**
 * Strictly typed translation function.
 * Only accepts keys present in the default English locale file.
 */
export const t = (key: TranslationKey, options?: any): string => {
  return i18next.t(key, options);
};
