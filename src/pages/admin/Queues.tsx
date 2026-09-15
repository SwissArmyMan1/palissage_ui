import { useMemo } from 'react';

import { LinkButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTiles } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { useLots, useOffers, useRedemptions, useSettlements } from '@/chain/lens';
import { useCapabilities } from '@/chain/roles';

/**
 * ADM-01. Four queues with counts, and what this wallet may actually act on.
 *
 * An empty board is a **success** state here, not an absence — muted, not sad,
 * and it says so in words.
 */
export default function AdminQueues() {
  const lots = useLots();
  const offers = useOffers();
  const redemptions = useRedemptions();
  const caps = useCapabilities();

  const settlements = useSettlements(offers.items.map((offer) => offer.id));

  const pendingMilestones = useMemo(() => {
    let count = 0;
    for (const settlement of settlements.items) {
      if (!settlement || settlement.settledFunds === 0n) continue;
      count += settlement.milestones.filter((milestone) => !milestone.released).length;
    }
    return count;
  }, [settlements.items]);

  const drafts = lots.items.filter((lot) => lot.status === 0);
  const suspended = lots.items.filter((lot) => lot.status === 2);
  const openRedemptions = redemptions.items.filter(
    (redemption) => redemption.state === 0 || redemption.state === 1,
  );

  // "All queues are clear" is a statement about the chain. It may only be made
  // once the chain has actually answered.
  const hasData = lots.hasData && offers.hasData && redemptions.hasData;
  const allClear =
    hasData && drafts.length === 0 && pendingMilestones === 0 && openRedemptions.length === 0;

  return (
    <CabinetPage>
      <PageHeader
        title="Queues"
        lede="What is waiting for a decision, and which of those decisions this wallet actually holds the role for."
      />

      <div data-tour="admin-queues-list" className="mt-8 space-y-8">
        {!caps.canVerifyLot && !caps.canConfirmMilestone && !caps.canResolveRedemption ? (
          <Callout tone="warning" title="You can read these queues but not act on them">
            Verifying a lot needs the verifier role on the token, confirming a milestone needs it
            on the primary market, and resolving a delivery needs it on the redemption manager.
            This wallet holds none of them, so every decision below is read-only.
          </Callout>
        ) : null}

        {!hasData ? (
          <SkeletonTiles count={4} />
        ) : allClear ? (
          <EmptyState
            variant="success"
            title="All queues are clear."
            body="Nothing is waiting for a decision."
          />
        ) : (
          <div className="enter-stagger grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Lots awaiting verification"
              value={String(drafts.length)}
              tone={drafts.length > 0 ? 'warning' : 'default'}
              footnote={
                drafts.length > 0
                  ? 'A draft cannot be sold until it is verified'
                  : 'Every lot has been reviewed'
              }
              action={
                <LinkButton to="/app/admin/lots" kind="secondary" size="sm">
                  Open the queue
                </LinkButton>
              }
            />
            <StatTile
              label="Milestones awaiting confirmation"
              value={String(pendingMilestones)}
              tone={pendingMilestones > 0 ? 'accent' : 'default'}
              footnote="Each confirmation releases a share of a producer's escrow"
              action={
                <LinkButton to="/app/admin/milestones" kind="secondary" size="sm">
                  Open the queue
                </LinkButton>
              }
            />
            <StatTile
              label="Deliveries in progress"
              value={String(openRedemptions.length)}
              footnote="Bottles held in escrow until a buyer confirms receipt"
              action={
                <LinkButton to="/app/admin/redemptions" kind="secondary" size="sm">
                  Open the queue
                </LinkButton>
              }
            />
            <StatTile
              label="Suspended lots"
              value={String(suspended.length)}
              tone={suspended.length > 0 ? 'danger' : 'default'}
              footnote={
                suspended.length > 0
                  ? 'Suspended lots cannot be traded until they are reinstated'
                  : 'No lot is suspended'
              }
              action={
                <LinkButton to="/app/admin/lots" kind="secondary" size="sm">
                  Review lots
                </LinkButton>
              }
            />
          </div>
        )}
      </div>
    </CabinetPage>
  );
}
