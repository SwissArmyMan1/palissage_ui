import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import { useLots, useRedemptionsOfWinery } from '@/chain/lens';
import { truncateAddress, formatCount, formatDate } from '@/lib/format';
import { redemptionState } from '@/lib/enums';
import type { RedemptionView } from '@/chain/types';

interface Row {
  redemption: RedemptionView;
  lotName: string;
}

/** WIN-08. The redemption queue for this producer's lots. */
export default function WineryDeliveries() {
  const { address, isConnected } = useAccount();
  const redemptions = useRedemptionsOfWinery(address);
  const lots = useLots();

  const rows = useMemo<Row[]>(() => {
    const byId = new Map(lots.items.map((lot) => [String(lot.id), lot.name]));
    return redemptions.items.map((redemption) => ({
      redemption,
      lotName: byId.get(String(redemption.lotId)) ?? `Lot #${String(redemption.lotId)}`,
    }));
  }, [redemptions.items, lots.items]);

  if (!isConnected) {
    return (
      <CabinetPage>
        <PageHeader title="Deliveries" />
        <ConnectPrompt what="delivery requests against your lots" className="mt-8" />
      </CabinetPage>
    );
  }

  const columns: Column<Row>[] = [
    { id: 'request', header: 'Request', cell: (row) => `#${String(row.redemption.id)}` },
    { id: 'lot', header: 'Lot', cell: (row) => row.lotName },
    {
      id: 'buyer',
      header: 'Buyer',
      cell: (row) => truncateAddress(row.redemption.buyer),
    },
    {
      id: 'bottles',
      header: 'Bottles',
      numeric: true,
      cell: (row) => formatCount(row.redemption.quantity),
    },
    {
      id: 'requested',
      header: 'Requested',
      cell: (row) => formatDate(row.redemption.requestedAt),
    },
    {
      id: 'state',
      header: 'State',
      cell: (row) => {
        const state = redemptionState(row.redemption.state);
        return <StatusBadge tone={state.tone}>{state.label}</StatusBadge>;
      },
    },
  ];

  return (
    <CabinetPage>
      <PageHeader
        title="Deliveries"
        lede="Redemption requests against your lots. Bottles are held in escrow from the moment a buyer requests delivery until they confirm receipt — at which point the matching bottles are burned."
      />

      <div className="mt-8">
        {redemptions.isLoading ? (
          <SkeletonRows count={3} label="Loading delivery requests…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No delivery has been requested."
            body="A holder can only request delivery once you mark a lot Ready for delivery."
            action={{ label: 'See your lots', to: '/app/winery/lots' }}
          />
        ) : (
          <DataTable
            caption="Delivery requests against your lots"
            columns={columns}
            rows={rows}
            rowKey={(row) => String(row.redemption.id)}
            rowTitle={(row) => `#${String(row.redemption.id)} · ${row.lotName}`}
            rowHref={(row) => `/app/winery/deliveries/${row.redemption.id}`}
            density="compact"
          />
        )}
      </div>
    </CabinetPage>
  );
}
