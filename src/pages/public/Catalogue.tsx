import { useLocale } from '@/lib/i18n/context';
import { useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterToolbar } from '@/components/ui/FilterToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Field';
import { SkeletonCardGrid } from '@/components/ui/Skeleton';
import { Callout } from '@/components/ui/Callout';
import { LotCard } from '@/components/patterns/LotCard';
import { useLots, useOffers, useProtocol } from '@/chain/lens';
import { primaryOffer } from '@/chain/select';
import { lotProducer, lotContent } from '@/lib/content/lots';
import { CATALOGUE } from '@/lib/content/copy';
import { PAYMENT_TOKEN } from '@/chain/config';

type Sort = 'price-asc' | 'price-desc' | 'available' | 'vintage';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'price-asc', label: 'Price, lowest first' },
  { id: 'price-desc', label: 'Price, highest first' },
  { id: 'available', label: 'Most available' },
  { id: 'vintage', label: 'Newest vintage' },
];

/**
 * PUB-02. `Responsive card grid` plus `Filter and search toolbar`.
 *
 * The toolbar's own veto applies below 12 items: filters are not offered for a
 * short list, so the launch state renders search and sort only (doc 03). The
 * filter rail returns automatically once the catalogue passes twelve lots.
 *
 * Filtering is local and never debounced — it runs inside a transition so
 * typing never blocks (doc 06 §4).
 */
export default function Catalogue() {
  const { t } = useLocale();
  const [params, setParams] = useSearchParams();
  const [cursor, setCursor] = useState(0n);
  const [, startTransition] = useTransition();

  const protocol = useProtocol();
  const lots = useLots(cursor);
  const offers = useOffers();

  const search = params.get('q') ?? '';
  const sort = (params.get('sort') as Sort | null) ?? 'price-asc';

  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;

  const rows = useMemo(() => {
    const joined = lots.items.map((lot) => ({
      lot,
      offer: primaryOffer(offers.items, lot.id),
      producer: lotProducer(lot.id),
      content: lotContent(lot.id),
    }));

    const needle = search.trim().toLowerCase();
    const filtered = needle
      ? joined.filter((row) =>
          [
            row.lot.name,
            row.producer.name,
            row.content?.appellation ?? row.lot.region,
            row.content?.grapes,
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(needle)),
        )
      : joined;

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'price-desc':
          return Number((b.offer?.pricePerBottle ?? 0n) - (a.offer?.pricePerBottle ?? 0n));
        case 'available':
          return (b.offer?.available ?? 0) - (a.offer?.available ?? 0);
        case 'vintage':
          return b.lot.vintage - a.lot.vintage;
        case 'price-asc':
        default:
          return Number((a.offer?.pricePerBottle ?? 0n) - (b.offer?.pricePerBottle ?? 0n));
      }
    });
  }, [lots.items, offers.items, search, sort]);

  // "Nothing has answered yet" and "there is nothing" are different facts.
  // React Query clears isLoading on a failed read, so branching on it would
  // let a blocked RPC render as an empty catalogue.
  const hasData = lots.hasData && offers.hasData;
  const failed = lots.isError || offers.isError;

  return (
    <div className="shell py-12 md:py-16">
      <header className="max-w-reading">
        <h1 className="t-h1">{t(CATALOGUE.title)}</h1>
        <p className="mt-4 text-body text-ink-secondary">{t(CATALOGUE.lede)}</p>
      </header>

      <div className="mt-12 space-y-8">
        <FilterToolbar
          search={search}
          onSearch={(value) =>
            startTransition(() => {
              const next = new URLSearchParams(params);
              if (value) next.set('q', value);
              else next.delete('q');
              setParams(next, { replace: true });
            })
          }
          count={rows.length}
          onClear={search ? () => setParams(new URLSearchParams(), { replace: true }) : undefined}
          chips={
            search
              ? [
                  {
                    id: 'q',
                    label: `“${search}”`,
                    onRemove: () => {
                      const next = new URLSearchParams(params);
                      next.delete('q');
                      setParams(next, { replace: true });
                    },
                  },
                ]
              : undefined
          }
          // Under twelve lots the filter rail is deliberately absent.
          showFilters={lots.items.length >= 12}
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          <label
            htmlFor="catalogue-sort"
            className="whitespace-nowrap text-body-sm text-ink-secondary"
          >
            {t('Sort by')}
          </label>
          <Select
            id="catalogue-sort"
            value={sort}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              next.set('sort', event.target.value);
              setParams(next, { replace: true });
            }}
            className="!w-auto min-w-52"
          >
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.label)}
              </option>
            ))}
          </Select>
        </div>

        {!hasData && failed ? (
          <Callout
            tone="danger"
            title={t('We could not read the catalogue from the selected network.')}
            role="alert"
          >
            {t(
              'The read model did not answer, so this page cannot say what is published. Nothing is wrong with your wallet — this is a network read, and a VPN or a blocked endpoint will stop it.',
            )}{' '}
            <button
              type="button"
              onClick={() => {
                void lots.refetch();
                void offers.refetch();
              }}
              className="font-medium underline underline-offset-4"
            >
              {t('Try the read again')}
            </button>
          </Callout>
        ) : !hasData ? (
          <SkeletonCardGrid count={6} />
        ) : rows.length === 0 && lots.items.length === 0 ? (
          <EmptyState
            title={t(CATALOGUE.emptyFirstRunTitle)}
            body={t(CATALOGUE.emptyFirstRunBody)}
            action={{ label: CATALOGUE.emptyFirstRunCta, to: '/for-wineries' }}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            variant="filtered"
            title={t(CATALOGUE.emptyFilteredTitle)}
            onClear={() => setParams(new URLSearchParams(), { replace: true })}
          />
        ) : (
          <>
            {failed ? (
              <Callout tone="warning" role="status">
                {t(
                  'These lots are the last successful read from the selected network. The most recent re-read did not answer, so the figures may have moved.',
                )}{' '}
                <button
                  type="button"
                  onClick={() => {
                    void lots.refetch();
                    void offers.refetch();
                  }}
                  className="font-medium underline underline-offset-4"
                >
                  {t('Read again')}
                </button>
              </Callout>
            ) : null}
            <div className="reveal-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((row) => (
                <LotCard
                  key={String(row.lot.id)}
                  lot={row.lot}
                  offer={row.offer}
                  paymentDecimals={decimals}
                />
              ))}
            </div>

            <Pagination
              shown={rows.length}
              hasNext={lots.nextCursor !== 0n}
              hasPrevious={cursor !== 0n}
              onNext={() => setCursor(lots.nextCursor)}
              onPrevious={() => setCursor(0n)}
            />
          </>
        )}
      </div>
    </div>
  );
}
