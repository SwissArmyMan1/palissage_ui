import { formatCount, formatDeadline, formatMoney } from '@/lib/format';
import { allocationState, redemptionState } from '@/lib/enums';
import type { AllocationView, ProtocolView, RedemptionView } from '@/chain/types';
import { tokenMeta } from '@/chain/tokens';

/**
 * Recent activity, built only from timestamps the read model actually returns:
 * `AllocationView.createdAt` and `RedemptionView.requestedAt`.
 *
 * This is deliberately not an event log. The interface runs no indexer, so it
 * cannot show a transfer history, and it does not invent one. What it can show
 * is when the records it holds were created, newest first.
 */
export interface ActivityItem {
  id: string;
  at: bigint;
  kind: 'allocation' | 'delivery';
  title: React.ReactNode;
  meta: string;
  amount?: string;
  to: string;
  lotId: bigint;
}

function amountLabel(
  value: bigint,
  token: AllocationView['paymentToken'],
  protocol?: ProtocolView,
): string {
  const meta = tokenMeta(token, protocol);
  if (!meta.known) return '—';
  const money = formatMoney(value, meta.decimals);
  return meta.settlement ? money : `${money} ${meta.symbol}`;
}

export function buildActivity(input: {
  allocations?: readonly AllocationView[];
  redemptions?: readonly RedemptionView[];
  lotName: (id: bigint) => string;
  protocol?: ProtocolView;
  allocationHref: (id: bigint) => string;
  deliveryHref: (id: bigint) => string;
}): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const allocation of input.allocations ?? []) {
    items.push({
      id: `a-${allocation.id}`,
      at: allocation.createdAt,
      kind: 'allocation',
      lotId: allocation.lotId,
      title: (
        <>
          {formatCount(allocation.quantity)} bottles reserved ·{' '}
          <span className="text-ink-secondary">{input.lotName(allocation.lotId)}</span>
        </>
      ),
      meta: `${allocationState(allocation.state).label} · ${formatDeadline(allocation.createdAt)}`,
      amount: amountLabel(allocation.totalDue, allocation.paymentToken, input.protocol),
      to: input.allocationHref(allocation.id),
    });
  }

  for (const redemption of input.redemptions ?? []) {
    items.push({
      id: `r-${redemption.id}`,
      at: redemption.requestedAt,
      kind: 'delivery',
      lotId: redemption.lotId,
      title: (
        <>
          Delivery of {formatCount(redemption.quantity)} bottles ·{' '}
          <span className="text-ink-secondary">{input.lotName(redemption.lotId)}</span>
        </>
      ),
      meta: `${redemptionState(redemption.state).label} · ${formatDeadline(redemption.requestedAt)}`,
      to: input.deliveryHref(redemption.id),
    });
  }

  return items.sort((a, b) => (b.at > a.at ? 1 : b.at < a.at ? -1 : 0));
}
