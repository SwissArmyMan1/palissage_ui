import { CircleMinus, CircleCheck } from 'lucide-react';
import { Section, SectionHead } from '@/components/layout/Section';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddressValue, ExplorerLink, Mono } from '@/components/ui/Mono';
import { useProtocol } from '@/chain/lens';
import { CHAIN_ID, CHAIN_LABEL, CONTRACTS, DEPLOYMENT_ID, PAYMENT_TOKEN } from '@/chain/config';
import { formatBps, formatCount } from '@/lib/format';
import { NETWORK } from '@/lib/content/copy';

/**
 * PUB-09. The page a Base reviewer reads. No overstatement, no omission.
 *
 * Every value below is read from `PalissageLens.protocol()` at the address this
 * build points at — never hand-typed. If the read fails, the page says the read
 * failed rather than printing a remembered value.
 */
export default function Network() {
  const { data, isLoading, isError } = useProtocol();

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Network',
      value: <Mono>{`${CHAIN_LABEL} · chain id ${CHAIN_ID}`}</Mono>,
    },
    {
      label: 'Protocol version',
      value: <Mono>{data ? data.version : '—'}</Mono>,
    },
    {
      label: 'Settlement asset',
      value: (
        <Mono>
          {data
            ? `${data.paymentSymbol} · ${data.paymentDecimals} decimals · issued by ${PAYMENT_TOKEN.issuer}`
            : '—'}
        </Mono>
      ),
    },
    {
      label: 'Accepted on both markets',
      value: (
        <Mono>
          {data
            ? data.paymentAllowedPrimary && data.paymentAllowedSecondary
              ? 'yes — primary and secondary'
              : 'no — check the allowlist'
            : '—'}
        </Mono>
      ),
    },
    {
      label: 'Protocol fee',
      value: (
        <Mono>
          {data
            ? `${formatBps(data.primaryFeeBps)} primary · ${formatBps(data.secondaryFeeBps)} secondary`
            : '—'}
        </Mono>
      ),
    },
    {
      label: 'Markets paused',
      value: (
        <Mono>
          {data ? (data.primaryPaused || data.secondaryPaused ? 'yes' : 'no') : '—'}
        </Mono>
      ),
    },
    {
      label: 'Public sandbox open',
      value: <Mono>{data ? (data.testMode ? 'yes — roles are self-service' : 'no') : '—'}</Mono>,
    },
    {
      label: 'Records on chain',
      value: (
        <Mono>
          {data
            ? `${formatCount(data.lotCount)} lots · ${formatCount(data.offerCount)} offers · ${formatCount(
                data.allocationCount,
              )} allocations · ${formatCount(data.redemptionCount)} deliveries`
            : '—'}
        </Mono>
      ),
    },
    { label: 'Deployment id', value: <Mono>{DEPLOYMENT_ID}</Mono> },
  ];

  const contracts: { label: string; address: string }[] = [
    { label: 'WineLotToken', address: CONTRACTS.wineLotToken },
    { label: 'PrimaryMarket', address: CONTRACTS.primaryMarket },
    { label: 'SecondaryMarket', address: CONTRACTS.secondaryMarket },
    { label: 'RedemptionManager', address: CONTRACTS.redemptionManager },
    { label: 'IdentityRegistry', address: CONTRACTS.identityRegistry },
    { label: 'TrustedIssuersRegistry', address: CONTRACTS.trustedIssuersRegistry },
    { label: 'ClaimIssuer', address: CONTRACTS.claimIssuer },
    { label: 'RoleGateway', address: CONTRACTS.roleGateway },
    { label: 'PalissageLens', address: CONTRACTS.palissageLens },
    { label: `${PAYMENT_TOKEN.symbol} (Circle)`, address: PAYMENT_TOKEN.address },
  ];

  return (
    <>
      <section className="bg-page py-12 md:py-16">
        <div className="shell max-w-reading">
          <h1 className="t-display text-[clamp(2rem,1.4rem+2.6vw,3.5rem)]">{NETWORK.title}</h1>
          <p className="mt-6 text-body text-ink-secondary">{NETWORK.lede}</p>
        </div>
      </section>

      <Section tone="surface" labelledBy="split-heading">
        <h2 id="split-heading" className="sr-only">
          What is on-chain and what is not
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="t-h2 text-chain">On-chain</h3>
            <ul className="mt-4 space-y-3">
              {NETWORK.onChain.map((item) => (
                <li key={item} className="flex gap-3 text-body-sm">
                  <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-chain" strokeWidth={1.75} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-edge-subtle bg-surface-sunken p-6">
            <h3 className="t-h2 text-ink-secondary">Off-chain</h3>
            <ul className="mt-4 space-y-3">
              {NETWORK.offChain.map((item) => (
                <li key={item} className="flex gap-3 text-body-sm text-ink-secondary">
                  <CircleMinus aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section labelledBy="why-heading">
        <SectionHead id="why-heading" title={NETWORK.whyTitle} />
        <p className="mt-6 max-w-reading text-body text-ink-secondary">{NETWORK.whyBody}</p>
      </Section>

      <Section tone="surface" labelledBy="deployment-heading">
        <h2 id="deployment-heading" className="t-h3">
          Deployment
        </h2>
        <p className="mt-2 text-body-sm text-ink-secondary">{NETWORK.deploymentNote}</p>

        {isError ? (
          <p role="alert" className="mt-6 rounded-lg border border-danger/25 bg-danger-subtle p-4 text-body-sm text-danger">
            We could not read the deployment from Base just now, so nothing is shown here. This
            page never prints a remembered value.
          </p>
        ) : (
          <dl className="mt-6 divide-y divide-edge-subtle">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-wrap items-baseline gap-4 py-3">
                <dt className="w-56 shrink-0 text-body-sm text-ink-secondary">{row.label}</dt>
                <dd className="min-w-0">{isLoading ? <Skeleton className="h-4 w-48" /> : row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <h3 className="mt-12 t-h3">Contracts</h3>
        <p className="mt-2 text-body-sm text-ink-secondary">
          Each address links to its verified source on Basescan.
        </p>
        <ul className="mt-4 divide-y divide-edge-subtle">
          {contracts.map((contract) => (
            <li key={contract.label} className="flex flex-wrap items-center gap-4 py-3">
              <span className="w-56 shrink-0 text-body-sm">{contract.label}</span>
              <AddressValue address={contract.address} label={`${contract.label} address`} />
              <ExplorerLink address={contract.address} className="ml-auto">
                Basescan
              </ExplorerLink>
            </li>
          ))}
        </ul>

        <p className="mt-8 max-w-reading text-body-sm text-ink-secondary">{NETWORK.historicalNote}</p>
      </Section>
    </>
  );
}
