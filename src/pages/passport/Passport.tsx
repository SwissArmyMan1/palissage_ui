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
import { formatCount, formatDate, isZeroHash } from '@/lib/format';
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
  const { passportId } = useParams();
  const parsed = /^\d+$/.test(passportId ?? '') ? BigInt(passportId!) : undefined;
  const { lot, exists, isLoading, isError } = useLot(parsed);

  if (parsed === undefined || (!isLoading && !isError && !exists)) {
    return <NotFound what={`the bottle code “${passportId ?? ''}”`} />;
  }

  return (
    <div className="min-h-dvh bg-page py-8">
      <a href="#passport-main" className="skip-link text-body-sm font-medium">
        Skip to this bottle’s record
      </a>
      <main id="passport-main" tabIndex={-1} className="mx-auto w-full max-w-[520px] px-4 outline-none">
        <div className="card overflow-hidden p-6 shadow-1">
          <div className="flex items-center justify-center gap-2">
            <BrandMark size={20} />
            <span
              className="font-display text-body-sm font-semibold tracking-[-0.02em]"
              style={{ fontVariationSettings: "'SOFT' 0, 'WONK' 0" }}
            >
              Palissage
            </span>
          </div>

          {isError && !lot ? (
            <Callout tone="danger" title="We could not read this bottle’s record." className="mt-8" role="alert">
              The Base Sepolia read did not answer. The code on the label is fine — this is a
              network read.{' '}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="font-medium underline underline-offset-4"
              >
                Try again
              </button>
            </Callout>
          ) : !lot ? (
            <LoadingRegion label="Reading this bottle's record…">
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

        <p className="mt-4 text-center text-body-sm text-ink-secondary">{PASSPORT.noWallet}</p>
      </main>
    </div>
  );
}

function PassportBody({ lot }: { lot: NonNullable<ReturnType<typeof useLot>['lot']> }) {
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
        {[content?.appellation ?? lot.region, content?.grapes, content?.alcohol]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <div className="mt-6 rounded-lg border border-edge-subtle p-4">
        <StatusBadge tone={verified ? 'success' : 'warning'}>
          {verified ? 'Verified' : 'Not verified'}
        </StatusBadge>
        <p className="mt-3 text-body-sm text-ink-secondary">
          {verified
            ? hasHash
              ? 'An operator reviewed the producer’s documents and recorded their hash on Base.'
              : 'An operator marked this lot verified on Base. No document hash was recorded with that decision.'
            : 'This lot has not been verified by an operator, so it cannot be sold on the platform.'}
        </p>
        <Link
          to={`/lots/${lot.id}`}
          className="mt-3 inline-block text-body-sm font-medium text-accent underline underline-offset-4"
        >
          See what was checked
        </Link>
      </div>

      <Callout tone="warning" className="mt-4">
        {PASSPORT.disclaimer}
      </Callout>

      <h2 className="mt-8 t-h3">Where this lot is</h2>
      <div className="mt-4">
        <TrellisLifecycle stage={lot.production} variant="static" label={`Production stage of ${lot.name}`} />
      </div>

      <h2 className="mt-8 t-caption text-ink-secondary">On the record</h2>
      <dl className="mt-3 divide-y divide-edge-subtle">
        <Row label="Bottles in this lot" value={formatCount(lot.totalBottles)} />
        <Row label="Minted so far" value={formatCount(lot.mintedBottles)} />
        <Row label="Delivered and burned" value={formatCount(lot.redeemedBottles)} />
        <Row label="Vintage" value={lot.vintage > 0 ? String(lot.vintage) : '—'} />
        <Row label="Lot id" value={`#${String(lot.id)}`} />
        <Row
          label="docsHash"
          value={hasHash ? <HashValue hash={lot.docsHash} label="document hash" /> : '— none recorded'}
        />
      </dl>

      <div className="mt-3">
        <a
          href={tokenUrl(lot.id)}
          target="_blank"
          rel="noreferrer noopener"
          className="text-body-sm font-medium text-accent underline underline-offset-4"
        >
          View this lot on Base
        </a>
      </div>

      <div className="mt-8 space-y-3">
        <LinkButton to={`/producers/${producer.slug}`} fullWidth>
          See the producer
        </LinkButton>
        <LinkButton to="/how-it-works" kind="secondary" fullWidth>
          How verification works
        </LinkButton>
      </div>

      <p className="mt-4 text-center text-body-sm text-ink-secondary">
        Read {formatDate(readAt)} from Base Sepolia.
      </p>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-2">
      <dt className="text-body-sm text-ink-secondary">{label}</dt>
      <dd className="text-body-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
