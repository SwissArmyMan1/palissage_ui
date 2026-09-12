import { useFormat } from '@/lib/i18n/useFormat';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useLocale } from '@/lib/i18n/context';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '@/components/ui/Logo';
import { Callout } from '@/components/ui/Callout';
import { LinkButton } from '@/components/ui/Button';
import { Plate } from '@/components/ui/Plate';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { HashValue } from '@/components/ui/Mono';
import { TrellisLifecycle } from '@/components/patterns/TrellisLifecycle';
import { useLot } from '@/chain/lens';
import { tokenUrl } from '@/chain/config';
import { lotContent, lotProducer } from '@/lib/content/lots';
import { formatCount, isZeroHash } from '@/lib/format';
import { PASSPORT } from '@/lib/content/copy';
import { NotFound } from '../public/NotFound';

/**
 * PAS-01. Reached by a camera, by a stranger, with no wallet and no account.
 *
 * `Content page template`, single column, mobile-first: no app shell, no
 * sidebar, no wallet prompt — a shell here would add chrome that competes with
 * the content. This screen carries the tightest performance budget in the
 * project (LCP under 1.8 s), so it renders one column, one image and one chain
 * read.
 *
 * The disclaimer is not optional: the passport identifies the lot, never the
 * individual bottle.
 */
export default function Passport() {
  const { t } = useLocale();
  const { passportId } = useParams();
  const parsed = /^\d+$/.test(passportId ?? '') ? BigInt(passportId!) : undefined;
  const { lot, exists, isLoading, isError } = useLot(parsed);

  if (parsed === undefined || (!isLoading && !isError && !exists)) {
    return <NotFound what={t('the bottle code “{id}”', { id: passportId ?? '' })} />;
  }

  return (
    <div className="min-h-dvh bg-page py-8">
      <a href="#passport-main" className="skip-link text-body-sm font-medium">
        {t('Skip to this bottle’s record')}
      </a>
      <main
        id="passport-main"
        tabIndex={-1}
        className="mx-auto w-full max-w-[520px] px-4 outline-none"
      >
        <div className="mb-4 flex justify-end">
          <LanguageToggle />
        </div>
        <div className="card overflow-hidden p-6 shadow-1">
          <div className="flex items-center justify-center gap-2">
            <BrandMark size={20} />
            <span
              className="font-display text-body-sm font-semibold tracking-[-0.02em]"
              style={{ fontVariationSettings: "'SOFT' 0, 'WONK' 0" }}
            >
              {t('Palissage')}
            </span>
          </div>

          {isError && !lot ? (
            <Callout
              tone="danger"
              title={t('We could not read this bottle’s record.')}
              className="mt-8"
              role="alert"
            >
              {t(
                'The Base Sepolia read did not answer. The code on the label is fine — this is a network read.',
              )}{' '}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="font-medium underline underline-offset-4"
              >
                {t('Try again')}
              </button>
            </Callout>
          ) : !lot ? (
            <LoadingRegion label={t("Reading this bottle's record…")}>
              <div className="mt-8 space-y-4">
                <Skeleton className="mx-auto aspect-[3/4] w-40" />
                <Skeleton className="mx-auto h-8 w-56" />
                <Skeleton className="mx-auto h-4 w-40" />
                <Skeleton className="h-24 w-full" />
              </div>
            </LoadingRegion>
          ) : (
            <PassportBody lot={lot} />
          )}
        </div>

        <p className="mt-4 text-center text-body-sm text-ink-secondary">{t(PASSPORT.noWallet)}</p>
      </main>
    </div>
  );
}

function PassportBody({ lot }: { lot: NonNullable<ReturnType<typeof useLot>['lot']> }) {
  const { t } = useLocale();
  const { formatDate } = useFormat();
  // Captured once: the time the record was read, not the time of a re-render.
  const [readAt] = useState(() => Math.floor(Date.now() / 1000));
  const content = lotContent(lot.id);
  const producer = lotProducer(lot.id);
  const verified = lot.status === 1;
  const hasHash = !isZeroHash(lot.docsHash);

  return (
    <>
      <Plate
        asset={content?.image ?? null}
        alt={`${lot.name} — ${producer.name}`}
        ratio="3 / 4"
        priority
        className="mx-auto mt-6 w-44"
        sizes="176px"
        fit="contain"
      />

      <h1 className="mt-6 text-center t-h2">{lot.name}</h1>
      <p className="mt-1 text-center text-body-sm text-ink-secondary">{producer.name}</p>
      <p className="mt-1 text-center text-body-sm text-ink-secondary">
        {[t(content?.appellation ?? lot.region), content?.grapes, content?.alcohol]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <div className="mt-6 rounded-lg border border-edge-subtle p-4">
        <StatusBadge tone={verified ? 'success' : 'warning'}>
          {verified ? t('Verified') : t('Not verified')}
        </StatusBadge>
        <p className="mt-3 text-body-sm text-ink-secondary">
          {verified
            ? hasHash
              ? t('An operator reviewed the producer’s documents and recorded their hash on Base.')
              : t(
                  'An operator marked this lot verified on Base. No document hash was recorded with that decision.',
                )
            : t(
                'This lot has not been verified by an operator, so it cannot be sold on the platform.',
              )}
        </p>
        <Link
          to={`/lots/${lot.id}`}
          className="mt-3 inline-block text-body-sm font-medium text-accent underline underline-offset-4"
        >
          {t('See what was checked')}
        </Link>
      </div>

      <Callout tone="warning" className="mt-4">
        {t(PASSPORT.disclaimer)}
      </Callout>

      <h2 className="mt-8 t-h3">{t('Where this lot is')}</h2>
      <div className="mt-4">
        <TrellisLifecycle
          stage={lot.production}
          variant="static"
          label={t('Production stage of {name}', { name: lot.name })}
        />
      </div>

      <h2 className="mt-8 t-caption text-ink-secondary">{t('On the record')}</h2>
      <dl className="mt-3 divide-y divide-edge-subtle">
        <Row label={t('Bottles in this lot')} value={formatCount(lot.totalBottles)} />
        <Row label={t('Minted so far')} value={formatCount(lot.mintedBottles)} />
        <Row label={t('Delivered and burned')} value={formatCount(lot.redeemedBottles)} />
        <Row label={t('Vintage')} value={lot.vintage > 0 ? String(lot.vintage) : '—'} />
        <Row label={t('Lot id')} value={`#${String(lot.id)}`} />
        <Row
          label={t('docsHash')}
          value={
            hasHash ? (
              <HashValue hash={lot.docsHash} label={t('document hash')} />
            ) : (
              '— none recorded'
            )
          }
        />
      </dl>

      <div className="mt-3">
        <a
          href={tokenUrl(lot.id)}
          target="_blank"
          rel="noreferrer noopener"
          className="text-body-sm font-medium text-accent underline underline-offset-4"
        >
          {t('View this lot on Base')}
        </a>
      </div>

      <div className="mt-8 space-y-3">
        <LinkButton to={`/producers/${producer.slug}`} fullWidth>
          {t('See the producer')}
        </LinkButton>
        <LinkButton to="/how-it-works" kind="secondary" fullWidth>
          {t('How verification works')}
        </LinkButton>
      </div>

      <p className="mt-4 text-center text-body-sm text-ink-secondary">
        {t('Read {date} from Base Sepolia.', { date: formatDate(readAt) })}
      </p>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-2">
      <dt className="text-body-sm text-ink-secondary">{label}</dt>
      <dd className="text-body-sm font-medium tabular-nums">
        {typeof value === 'string' ? t(value) : value}
      </dd>
    </div>
  );
}
