import { useLocale } from '@/lib/i18n/context';
import { FileText } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HashValue } from '@/components/ui/Mono';
import { AddressValue } from '@/components/ui/Mono';
import { isZeroHash } from '@/lib/format';
import type { LotView } from '@/chain/types';

/**
 * What was verified.
 *
 * The chain holds exactly one value per lot: `docsHash`, set at verification,
 * together with the verifier's address. Individual documents live off-chain with
 * the operator and are not published — so this panel reports the record that
 * exists rather than inventing a document list.
 *
 * When a lot was verified without a document hash, that is stated plainly. It is
 * a real state of this deployment, not a loading state.
 */
export function EvidencePanel({ lot }: { lot: LotView }) {
  const { t } = useLocale();
  const verified = lot.status === 1;
  const hasHash = !isZeroHash(lot.docsHash);

  return (
    <section aria-labelledby="evidence-heading" className="space-y-4">
      <h2 id="evidence-heading" className="t-h3">
        {t('What was verified')}
      </h2>

      <p className="text-body-sm text-ink-secondary">
        {t(
          'Verification records the hash of the producer’s documents on the selected network together with the operator who checked them. It states what was checked; it is not a guarantee of quality or legal compliance.',
        )}
      </p>

      <ul className="space-y-3">
        <li className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <FileText
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-ink-secondary"
                strokeWidth={1.75}
              />
              <div className="min-w-0 space-y-1">
                <p className="text-body font-medium">{t('Production documents')}</p>
                <p className="text-body-sm text-ink-secondary">
                  {t('Held by the operator · hash recorded on the selected network · files not published')}
                </p>
                <p className="text-body-sm text-ink-secondary">
                  {t('docsHash')}{' '}
                  {hasHash ? (
                    <HashValue hash={lot.docsHash} label={t('document hash')} />
                  ) : (
                    <span>{t('— none recorded with this verification')}</span>
                  )}
                </p>
              </div>
            </div>
            {verified && hasHash ? (
              <StatusBadge tone="success">{t('Recorded')}</StatusBadge>
            ) : verified ? (
              <StatusBadge tone="warning">{t('No hash recorded')}</StatusBadge>
            ) : (
              <StatusBadge tone="neutral">{t('Not verified')}</StatusBadge>
            )}
          </div>
        </li>

        <li className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-body font-medium">{t('Checked by')}</p>
              <p className="text-body-sm text-ink-secondary">
                {verified ? (
                  <AddressValue address={lot.verifier} label={t('verifier address')} />
                ) : (
                  t('Awaiting an operator')
                )}
              </p>
            </div>
            {verified ? (
              <StatusBadge tone="success">{t('Verified')}</StatusBadge>
            ) : (
              <StatusBadge tone="warning">{t('In the queue')}</StatusBadge>
            )}
          </div>
        </li>
      </ul>
    </section>
  );
}
