import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddressValue, Mono } from '@/components/ui/Mono';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ActionReview } from '@/components/patterns/ActionReview';
import { useProtocol } from '@/chain/lens';
import { useCapabilities } from '@/chain/roles';
import { primaryMarketAbi, roleGatewayAbi, secondaryMarketAbi } from '@/chain/abis';
import { CONTRACTS, PAYMENT_TOKEN } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatBps, formatCount } from '@/lib/format';

type Toggle =
  | { kind: 'testMode'; next: boolean }
  | { kind: 'pausePrimary'; next: boolean }
  | { kind: 'pauseSecondary'; next: boolean };

/**
 * ADM-09. Protocol settings, read from the chain.
 *
 * Two groups of controls, deliberately separated. The switches here — the public
 * sandbox and each market's pause — are single booleans with an obvious
 * consequence. Fees, treasuries and the payment-token allowlist change what
 * every future trade costs, so they are shown read-only in this release rather
 * than given a form; that is a scope decision, and the page says so.
 */
export default function AdminSettings() {
  const { data, isLoading } = useProtocol();
  const caps = useCapabilities();
  const [toggle, setToggle] = useState<Toggle | null>(null);

  return (
    <CabinetPage>
      <PageHeader
        title="Settings"
        lede="Everything below is read from the deployment. Nothing here is a local preference."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="switches-heading">
          <h2 id="switches-heading" className="t-h3">
            Switches
          </h2>

          <div className="mt-6 space-y-6">
            <Switch
              title="Public sandbox"
              state={data?.testMode ? 'Open' : 'Closed'}
              tone={data?.testMode ? 'warning' : 'neutral'}
              body="While the sandbox is open, any wallet can take the Winery, Shop or Collector role for itself in one transaction. Admin is never self-assignable."
              allowed={caps.ownsGateway}
              deniedNote="Only the gateway owner can change this."
              action={data?.testMode ? 'Close the sandbox' : 'Open the sandbox'}
              onAction={() => setToggle({ kind: 'testMode', next: !data?.testMode })}
              loading={isLoading}
            />

            <Switch
              title="Primary market"
              state={data?.primaryPaused ? 'Paused' : 'Running'}
              tone={data?.primaryPaused ? 'danger' : 'success'}
              body="Pausing stops new reservations, payments and withdrawals on the primary market. Existing allocations are not cancelled."
              allowed={caps.canAssignRoles || false}
              deniedNote="Pausing needs the pauser role on the primary market."
              action={data?.primaryPaused ? 'Resume the primary market' : 'Pause the primary market'}
              onAction={() => setToggle({ kind: 'pausePrimary', next: !data?.primaryPaused })}
              loading={isLoading}
            />

            <Switch
              title="Secondary market"
              state={data?.secondaryPaused ? 'Paused' : 'Running'}
              tone={data?.secondaryPaused ? 'danger' : 'success'}
              body="Pausing stops new listings and purchases. Listings already open stay recorded but cannot settle."
              allowed={caps.canAssignRoles || false}
              deniedNote="Pausing needs the pauser role on the secondary market."
              action={data?.secondaryPaused ? 'Resume the secondary market' : 'Pause the secondary market'}
              onAction={() => setToggle({ kind: 'pauseSecondary', next: !data?.secondaryPaused })}
              loading={isLoading}
            />
          </div>
        </section>

        <section className="card p-6" aria-labelledby="economics-heading">
          <h2 id="economics-heading" className="t-h3">
            Fees, treasuries and settlement
          </h2>
          <dl className="mt-4 space-y-3">
            <Row
              label="Primary fee"
              value={isLoading ? <Skeleton className="h-4 w-20" /> : <Mono>{formatBps(data?.primaryFeeBps ?? 0)}</Mono>}
            />
            <Row
              label="Secondary fee"
              value={
                isLoading ? <Skeleton className="h-4 w-20" /> : <Mono>{formatBps(data?.secondaryFeeBps ?? 0)}</Mono>
              }
            />
            <Row
              label="Primary treasury"
              value={data ? <AddressValue address={data.primaryTreasury} label="primary treasury" /> : '—'}
            />
            <Row
              label="Secondary treasury"
              value={data ? <AddressValue address={data.secondaryTreasury} label="secondary treasury" /> : '—'}
            />
            <Row
              label="Settlement asset"
              value={
                data ? (
                  <Mono>{`${data.paymentSymbol} · ${data.paymentDecimals} decimals`}</Mono>
                ) : (
                  '—'
                )
              }
            />
            <Row
              label="Allowed on"
              value={
                data ? (
                  <Mono>
                    {`primary ${data.paymentAllowedPrimary ? 'yes' : 'no'} · secondary ${
                      data.paymentAllowedSecondary ? 'yes' : 'no'
                    }`}
                  </Mono>
                ) : (
                  '—'
                )
              }
            />
            <Row
              label="Settlement contract"
              value={<AddressValue address={PAYMENT_TOKEN.address} label="settlement asset" />}
            />
          </dl>

          <Callout tone="info" className="mt-6 max-w-none">
            These change what every future trade costs, so they are read-only in this release. They
            are set with <code className="t-mono">setPrimaryFeeBps</code>,{' '}
            <code className="t-mono">setSecondaryFeeBps</code>,{' '}
            <code className="t-mono">setTreasury</code> and{' '}
            <code className="t-mono">setPaymentTokenAllowed</code> by the admin role on each
            market.
          </Callout>
        </section>

        <section className="card p-6 lg:col-span-2" aria-labelledby="counts-heading">
          <h2 id="counts-heading" className="t-h3">
            What is recorded
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Row label="Lots" value={<Mono>{data ? formatCount(data.lotCount) : '—'}</Mono>} />
            <Row label="Offers" value={<Mono>{data ? formatCount(data.offerCount) : '—'}</Mono>} />
            <Row
              label="Allocations"
              value={<Mono>{data ? formatCount(data.allocationCount) : '—'}</Mono>}
            />
            <Row label="Listings" value={<Mono>{data ? formatCount(data.listingCount) : '—'}</Mono>} />
            <Row
              label="Deliveries"
              value={<Mono>{data ? formatCount(data.redemptionCount) : '—'}</Mono>}
            />
            <Row label="Read model" value={<AddressValue address={CONTRACTS.palissageLens} label="lens" />} />
          </dl>
        </section>
      </div>

      {toggle ? <ToggleDialog toggle={toggle} onClose={() => setToggle(null)} /> : null}
    </CabinetPage>
  );
}

function ToggleDialog({ toggle, onClose }: { toggle: Toggle; onClose: () => void }) {
  const tx = useTx();

  const config =
    toggle.kind === 'testMode'
      ? {
          title: toggle.next ? 'Open the public sandbox' : 'Close the public sandbox',
          label: toggle.next ? 'Open the sandbox' : 'Close the sandbox',
          destructive: toggle.next,
          consequence: toggle.next
            ? 'Any wallet will be able to take the Winery, Shop or Collector role for itself. Use it for a public testnet, never for a live deployment.'
            : 'Roles can no longer be self-assigned. Existing roles and claims are untouched.',
          run: () =>
            tx.send({
              address: CONTRACTS.roleGateway,
              abi: roleGatewayAbi,
              functionName: 'setTestMode',
              args: [toggle.next],
            }),
        }
      : toggle.kind === 'pausePrimary'
        ? {
            title: toggle.next ? 'Pause the primary market' : 'Resume the primary market',
            label: toggle.next ? 'Pause the primary market' : 'Resume the primary market',
            destructive: toggle.next,
            consequence: toggle.next
              ? 'New reservations, balance payments and withdrawals stop immediately. Nothing already settled is reversed.'
              : 'Reservations, payments and withdrawals become possible again.',
            run: () =>
              tx.send({
                address: CONTRACTS.primaryMarket,
                abi: primaryMarketAbi,
                functionName: toggle.next ? 'pause' : 'unpause',
              }),
          }
        : {
            title: toggle.next ? 'Pause the secondary market' : 'Resume the secondary market',
            label: toggle.next ? 'Pause the secondary market' : 'Resume the secondary market',
            destructive: toggle.next,
            consequence: toggle.next
              ? 'New listings and purchases stop immediately. Open listings stay recorded but cannot settle.'
              : 'Listings and purchases become possible again.',
            run: () =>
              tx.send({
                address: CONTRACTS.secondaryMarket,
                abi: secondaryMarketAbi,
                functionName: toggle.next ? 'pause' : 'unpause',
              }),
          };

  return (
    <ActionReview
      open
      onClose={onClose}
      destructive={config.destructive}
      title={config.title}
      object={<p className="text-body">{config.title}</p>}
      consequence={<p>{config.consequence}</p>}
      steps={[{ id: 'toggle', label: config.label, required: true, run: config.run, tx }]}
    />
  );
}

function Switch({
  title,
  state,
  tone,
  body,
  allowed,
  deniedNote,
  action,
  onAction,
  loading,
}: {
  title: string;
  state: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  body: string;
  allowed: boolean;
  deniedNote: string;
  action: string;
  onAction: () => void;
  loading: boolean;
}) {
  return (
    <div className="border-b border-edge-subtle pb-6 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-body font-medium">{title}</h3>
        {loading ? <Skeleton className="h-6 w-24 rounded-full" /> : <StatusBadge tone={tone}>{state}</StatusBadge>}
      </div>
      <p className="mt-2 max-w-reading text-body-sm text-ink-secondary">{body}</p>
      <div className="mt-3">
        <Button size="sm" kind="secondary" disabled={!allowed || loading} onClick={onAction}>
          {action}
        </Button>
        {!allowed ? <p className="mt-2 text-body-sm text-ink-secondary">{deniedNote}</p> : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <dt className="w-44 shrink-0 text-body-sm text-ink-secondary">{label}</dt>
      <dd className="min-w-0">{value}</dd>
    </div>
  );
}
