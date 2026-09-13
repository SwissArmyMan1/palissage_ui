import { useMemo, useState, useTransition } from 'react';
import { LinkButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterToolbar } from '@/components/ui/FilterToolbar';
import { SkeletonCardGrid } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Plate } from '@/components/ui/Plate';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { useLots, useMyParticipant, useOffers, useProtocol } from '@/chain/lens';
import { openOffers } from '@/chain/select';
import { PAYMENT_TOKEN } from '@/chain/config';
import { lotContent, lotProducer } from '@/lib/content/lots';
import { formatBps, formatCount, formatDeadline, formatMoney } from '@/lib/format';

/**
 * SHO-02. The catalogue as a buyer sees it inside the cabinet: only offers that
 * can actually be paid in the configured settlement asset, and only those that
 * are open, because this screen exists to be acted on.
 */
export default function Market() {
  // The Lens returns at most 50 offers per read; past that a buyer needs a way
  // to the next page rather than a catalogue that quietly stops.
  const [cursor, setCursor] = useState(0n);
  const offers = useOffers(cursor);
  const lots = useLots();
  const protocol = useProtocol();
  const participant = useMyParticipant();
  const [search, setSearch] = useState('');
  const [, startTransition] = useTransition();

  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;
  const symbol = protocol.data?.paymentSymbol ?? PAYMENT_TOKEN.symbol;

  const rows = useMemo(() => {
    const byLot = new Map(lots.items.map((lot) => [String(lot.id), lot]));
    const needle = search.trim().toLowerCase();
    return openOffers(offers.items)
      .map((offer) => ({ offer, lot: byLot.get(String(offer.lotId)) }))
      .filter((row) => row.lot !== undefined)
      .filter((row) =>
        needle
          ? [row.lot!.name, lotProducer(row.lot!.id).name, row.lot!.region]
              .join(' ')
              .toLowerCase()
              .includes(needle)
          : true,
      );
  }, [offers.items, lots.items, search]);

  const eligible = Boolean(participant.data?.b2bClaim);

  return (
    <CabinetPage>
      <PageHeader
        title="Market"
        lede={`Offers open now, settled in ${symbol}. Prices are per bottle with the protocol fee shown before you commit.`}
      />

      {!eligible ? (
        <Callout tone="warning" title="This wallet cannot reserve yet" className="mt-8">
          The primary market checks the B2B buyer claim before it accepts a reservation. You can
          read every offer here.{' '}
          <LinkButton to="/app/testnet" kind="ghost" size="sm">
            See what this needs
          </LinkButton>
        </Callout>
      ) : null}

      <div className="mt-8 space-y-8">
        <FilterToolbar
          search={search}
          onSearch={(value) => startTransition(() => setSearch(value))}
          count={rows.length}
          countNoun="open offers"
          showFilters={false}
        />

        {!offers.hasData || !lots.hasData ? (
          <SkeletonCardGrid count={3} />
        ) : rows.length === 0 && search ? (
          <EmptyState
            variant="filtered"
            title="No offers match."
            onClear={() => setSearch('')}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No offers are open right now."
            body="When a producer publishes an offer it appears here. Verified lots with no open offer are still readable in the catalogue."
            action={{ label: 'Browse every lot', to: '/lots' }}
          />
        ) : (
          <ul className="enter-stagger grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ offer, lot }) => {
              const content = lotContent(lot!.id);
              return (
                <li key={String(offer.id)} className="card flex flex-col overflow-hidden shadow-1">
                  <Plate
                    asset={content?.image ?? null}
                    alt=""
                    ratio="4 / 3"
                    className="rounded-none"
                    sizes="(min-width: 1280px) 360px, (min-width: 640px) 45vw, 92vw"
                    fit="contain"
                  />
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={offer.kind === 1 ? 'info' : 'success'}>
                        {offer.kind === 1 ? 'En Primeur' : 'Current release'}
                      </StatusBadge>
                      <span className="text-body-sm text-ink-secondary">
                        Offer #{String(offer.id)}
                      </span>
                    </div>
                    <div>
                      <p className="text-body-sm text-ink-secondary">{lotProducer(lot!.id).name}</p>
                      <h2 className="t-h3">{lot!.name}</h2>
                    </div>
                    <dl className="space-y-2 text-body-sm">
                      <Row label="Price per bottle" value={formatMoney(offer.pricePerBottle, decimals)} />
                      <Row
                        label="Available"
                        value={`${formatCount(offer.available)} of ${formatCount(offer.quantity)}`}
                      />
                      <Row
                        label="Payment"
                        value={
                          offer.depositBps > 0
                            ? `${formatBps(offer.depositBps)} deposit, or in full`
                            : 'In full at reservation'
                        }
                      />
                      <Row label="Closes" value={formatDeadline(offer.endTime)} />
                    </dl>
                    <div className="mt-auto flex gap-3 pt-2">
                      <LinkButton to={`/app/shop/reserve/${offer.id}`} size="sm">
                        Reserve bottles
                      </LinkButton>
                      <LinkButton to={`/lots/${lot!.id}`} kind="secondary" size="sm">
                        The lot
                      </LinkButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {offers.items.length > 0 ? (
          <Pagination
            shown={rows.length}
            noun="open offers"
            hasNext={offers.nextCursor !== 0n}
            hasPrevious={cursor !== 0n}
            onNext={() => setCursor(offers.nextCursor)}
            onPrevious={() => setCursor(0n)}
          />
        ) : null}
      </div>
    </CabinetPage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
