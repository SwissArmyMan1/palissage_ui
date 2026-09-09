/**
 * Every user-visible number and date passes through here.
 *
 * Rules from specifications/ui-v2/00-brief.md section 4 and 07-content-and-copy.md:
 *  - thousands separator is a narrow no-break space, decimal separator a dot
 *  - money always shows 2 decimal places, never raw base units
 *  - dates are absolute with an explicit timezone; relative dates are forbidden
 *    on anything that is a payment deadline
 *  - bottles are integers, never fractional
 */

/** U+202F narrow no-break space. */
const NNBSP = ' ';
const PARIS = 'Europe/Paris';

function groupInteger(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
}

/** Formats a base-unit amount (bigint) of a token with `decimals` places. */
export function formatAmount(value: bigint, decimals: number, fractionDigits = 2): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const remainder = abs % base;

  let fraction = '';
  if (fractionDigits > 0) {
    let digits: bigint;
    if (decimals >= fractionDigits) {
      digits = remainder / 10n ** BigInt(decimals - fractionDigits);
    } else {
      digits = remainder * 10n ** BigInt(fractionDigits - decimals);
    }
    fraction = '.' + digits.toString().padStart(fractionDigits, '0');
  }
  return `${negative ? '-' : ''}${groupInteger(whole.toString())}${fraction}`;
}

/** `€14 640.00` — the money format used everywhere a price appears. */
export function formatMoney(value: bigint, decimals: number): string {
  return `€${formatAmount(value, decimals, 2)}`;
}

/**
 * Money from a plain number, for locally computed illustrations only.
 * The marketing figures are round euros, so they print without a decimal tail.
 */
export function formatMoneyNumber(value: number, fractionDigits = 2): string {
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [whole, fraction] = fixed.split('.');
  const sign = value < 0 ? '-' : '';
  return fraction ? `${sign}€${groupInteger(whole)}.${fraction}` : `${sign}€${groupInteger(whole)}`;
}

/** `2 400` — bottles, lots, counts. Always integers. */
export function formatCount(value: bigint | number): string {
  const n = typeof value === 'bigint' ? value : Math.round(value);
  return groupInteger(n.toString());
}

/** `2.50%` from 250 basis points. */
export function formatBps(bps: number | bigint): string {
  return `${(Number(bps) / 100).toFixed(2)}%`;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: PARIS,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: PARIS,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** `28 February 2027, 23:59 Europe/Paris` — the deadline format. */
export function formatDeadline(unixSeconds: bigint | number): string {
  const ms = Number(unixSeconds) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const date = new Date(ms);
  return `${dateFmt.format(date)}, ${timeFmt.format(date)} ${PARIS}`;
}

/** `18 March 2026` — a date with no time component. */
export function formatDate(unixSeconds: bigint | number): string {
  const ms = Number(unixSeconds) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  return dateFmt.format(new Date(ms));
}

/** `0xDCf0…0A85`. The full value belongs in a copy action or a title attribute. */
export function truncateAddress(address?: string | null): string {
  if (!address || address.length < 12) return address ?? '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** `0x9f2c…1e77` — docsHash, tx hash, any 32-byte value. */
export function truncateHash(hash?: string | null): string {
  if (!hash || hash.length < 14) return hash ?? '—';
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

export function isZeroHash(hash?: string | null): boolean {
  return !hash || hash === ZERO_HASH;
}

/**
 * Parses a decimal string the user typed into base units. Returns null when the
 * input is not a valid amount so the caller can show a field-level error rather
 * than submitting a silently wrong number.
 */
export function parseAmount(input: string, decimals: number): bigint | null {
  const trimmed = input.trim().replace(/[\s\u202f\u00a0]/g, '').replace(',', '.');
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === '' || trimmed === '.') return null;
  const [whole = '0', fraction = ''] = trimmed.split('.');
  if (fraction.length > decimals) return null;
  const padded = fraction.padEnd(decimals, '0');
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0');
}

/** Bottle volume in millilitres, as the catalogue prints it. */
export function formatBottleSize(ml: number | bigint): string {
  const n = Number(ml);
  return n > 0 ? `${formatCount(n)} ml` : '—';
}

/** Whole-bottle integer parse for the quantity field. */
export function parseBottles(input: string): number | null {
  const trimmed = input.trim().replace(/[\s\u202f\u00a0]/g, '');
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) ? n : null;
}
