import { useState } from 'react';
import { useAccount } from 'wagmi';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, DenseList, DenseRow, type Column } from '@/components/ui/DataTable';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import { LotThumb } from '@/components/ui/LotThumb';
import { Pagination } from '@/components/ui/Pagination';
import { useLotsOfWinery } from '@/chain/lens';
import { formatCount } from '@/lib/format';
import { lotState, productionStage } from '@/lib/enums';
import type { LotView } from '@/chain/types';

/**
 * WIN-02. `Data table` above five rows; below five, the same data reads better
 * as a `Dense list`, which is what the table entry's own veto asks for.
 */
export default function WineryLots() {
  const { address, isConnected } = useAccount();
  // One read returns at most 50 rows. Without a way forward a producer past
  // that number simply stopped seeing their own lots.
  const [cursor, setCursor] = useState(0n);
  const lots = useLotsOfWinery(address, cursor);

  if (!isConnected) {
    return (
      <CabinetPage>
        <PageHeader title="Lots" />
        <ConnectPrompt what="your lots" className="mt-8" />
      </CabinetPage>
    );
  }

  const columns: Column<LotView>[] = [
    {
      id: 'lot',
      header: 'Lot',
      cell: (lot) => (
        <span className="flex items-center gap-3">
          <LotThumb lotId={lot.id} />
          {lot.name}
        </span>
      ),
    },
    { id: 'vintage', header: 'Vintage', numeric: true, cell: (lot) => String(lot.vintage) },
    {
      id: 'bottles',
      header: 'Bottles',
      numeric: true,
      cell: (lot) => formatCount(lot.totalBottles),
    },
    {
      id: 'offered',
      header: 'Offered',
      numeric: true,
      cell: (lot) => formatCount(lot.offeredBottles),
    },
    { id: 'production', header: 'Production', cell: (lot) => productionStage(lot.production) },
    {
      id: 'state',
      header: 'State',
      cell: (lot) => {
        const state = lotState(lot.status);
        return <StatusBadge tone={state.tone}>{state.label}</StatusBadge>;
      },
    },
  ];

  return (
    <CabinetPage>
      <PageHeader
        title="Lots"
        action={
          <LinkButton to="/app/winery/lots/new" data-tour="winery-lots-create">
            Create a lot
          </LinkButton>
        }
      />

      <div data-tour="winery-lots-table" className="mt-8">
        {!lots.hasData ? (
          <SkeletonRows count={4} label="Loading your lots…" />
        ) : lots.items.length === 0 ? (
          <EmptyState
            title="Publish your first lot."
            body="A lot is one batch of wine. Describe it, attach your production documents, and an operator verifies it before you can sell."
            action={{ label: 'Create a lot', to: '/app/winery/lots/new' }}
          />
        ) : lots.items.length > 5 ? (
          <DataTable
            caption="Your lots, with production stage and lot state"
            columns={columns}
            rows={lots.items}
            rowKey={(lot) => String(lot.id)}
            rowTitle={(lot) => lot.name}
            rowHref={(lot) => `/app/winery/lots/${lot.id}`}
          />
        ) : (
          <DenseList className="enter-stagger">
            {lots.items.map((lot) => {
              const state = lotState(lot.status);
              return (
                <DenseRow key={String(lot.id)}>
                  <LotThumb lotId={lot.id} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium">{lot.name}</p>
                    <p className="text-body-sm text-ink-secondary tabular-nums">
                      {lot.vintage} · {formatCount(lot.totalBottles)} bottles ·{' '}
                      {formatCount(lot.offeredBottles)} committed to offers ·{' '}
                      {productionStage(lot.production)}
                    </p>
                  </div>
                  <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                  <LinkButton to={`/app/winery/lots/${lot.id}`} kind="secondary" size="sm">
                    Manage
                  </LinkButton>
                </DenseRow>
              );
            })}
          </DenseList>
        )}

        {lots.items.length > 0 ? (
          <Pagination
            className="mt-8"
            shown={lots.items.length}
            hasNext={lots.nextCursor !== 0n}
            hasPrevious={cursor !== 0n}
            onNext={() => setCursor(lots.nextCursor)}
            onPrevious={() => setCursor(0n)}
          />
        ) : null}
      </div>
    </CabinetPage>
  );
}
