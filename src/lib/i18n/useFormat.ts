import * as format from '@/lib/format';
import { useLocale } from './context';

const frenchDate = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const frenchTime = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Presentation only: token arithmetic and form parsing retain their exact values. */
export function useFormat() {
  const { locale } = useLocale();
  const money = (value: string) =>
    locale === 'fr' ? `${value.replace('€', '').replace('.', ',')}\u00a0€` : value;
  const date = (value: bigint | number, deadline: boolean) => {
    if (locale === 'en') return deadline ? format.formatDeadline(value) : format.formatDate(value);
    const ms = Number(value) * 1000;
    if (!Number.isFinite(ms) || ms <= 0) return '—';
    const instant = new Date(ms);
    return (
      frenchDate.format(instant) + (deadline ? `, ${frenchTime.format(instant)} Europe/Paris` : '')
    );
  };
  return {
    formatMoney: (value: bigint, decimals: number) => money(format.formatMoney(value, decimals)),
    formatMoneyNumber: (value: number, fractionDigits = 2) =>
      money(format.formatMoneyNumber(value, fractionDigits)),
    formatBps: (value: bigint | number) =>
      locale === 'fr'
        ? format.formatBps(value).replace('.', ',').replace('%', '\u00a0%')
        : format.formatBps(value),
    formatDate: (value: bigint | number) => date(value, false),
    formatDeadline: (value: bigint | number) => date(value, true),
  };
}
