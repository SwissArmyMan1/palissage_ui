import { useAccount } from 'wagmi';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, DenseList, DenseRow, type Column } from '@/components/ui/DataTable';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
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
  const lots = useLotsOfWinery(address);

  if (!isConnected) {
    return (
      <CabinetPage>
        <PageHeader title="Lots" />
        <ConnectPrompt what="your lots" className="mt-8" />
      </CabinetPage>
    );
  }

  const columns: Column<LotView>[] = [
    { id: 'lot', header: 'Lot', cell: (lot) => lot.name },
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
        action={<LinkButton to="/app/winery/lots/new">Create a lot</LinkButton>}
      />

      <div className="mt-8">
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
          <DenseList>
            {lots.items.map((lot) => {
              const state = lotState(lot.status);
              return (
                <DenseRow key={String(lot.id)}>
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
      </div>
    </CabinetPage>
  );
}
