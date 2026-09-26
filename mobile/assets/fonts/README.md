# Fonts

All three families are licensed under the SIL Open Font License 1.1, which allows bundling them in the app. Each licence sits next to its files (`OFL-*.txt`).

| Family                           | Files                             | Used for                                                                       |
| -------------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| **Fraunces** (SOFT 100, opsz 72) | `Fraunces-Soft-SemiBold`, `-Bold` | Display and headings. The soft, rounded serif gives the "Warm Community" feel. |
| **Plus Jakarta Sans**            | `-Regular` to `-ExtraBold`        | Body text, labels, numbers. Stays legible at small sizes.                      |
| **Noto Sans Sinhala**            | `-Regular` to `-Bold`             | All text when the app language is Sinhala.                                     |

## Why Sinhala has its own font

Neither Fraunces nor Plus Jakarta Sans contains Sinhala characters. Noto Sans Sinhala covers Sinhala, Latin letters and digits, so in Sinhala mode the whole app switches to it. Sinhala words, English names such as "Galle Face Grand Hotel" and quantities then all render in one consistent face, instead of Android mixing fonts glyph by glyph.

Fraunces has no bullet (•) or en dash (–) character, so keep those out of headings.

## Why static weights

These are static instances downloaded from the Google Fonts API, one file per weight, not the variable fonts. React Native on Android does not reliably apply variable font axes, so a single variable file would render every weight the same.
