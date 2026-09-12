# Public website languages

`LocaleProvider` owns `en` / `fr`. `LanguageToggle` changes the context without
remounting routes, forms or chain providers. English is the initial default;
an explicit choice is saved in the functional `palissage-language` cookie for
one year. If cookies are blocked, switching still works in the current tab.

The translation covers the public website and `/p/:passportId`. Transaction
cabinet workflows under `/app` retain their existing English copy.

Use `const { t } = useLocale()` in a component and `t('English source text')` at
the render site. Add the French equivalent to `fr.ts`. Dynamic copy uses named
values, for example `t('Production stage of {name}', { name: lot.name })`.
Keep whole sentences together so French can use a different word order.
Missing entries fall back to the source. Do not translate identifiers, URLs,
form values, addresses, contract enums or source data in place.

`useFormat()` localizes monetary amounts, percentages and dates for public
views. It keeps the existing bigint amount calculations and Europe/Paris
timezone. Parsing and transaction amounts do not depend on the display locale.

When changing copy, check both languages at 320px and desktop widths. Verify
reload persistence, direct links, mobile menu, email dialog, and preservation
of search, sort and the selected lot tab while switching. The document language,
title and description follow the selected locale.
