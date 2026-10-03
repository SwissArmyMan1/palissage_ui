import { useFormat } from '@/lib/i18n/useFormat';
import { useLocale } from '@/lib/i18n/context';
import { CircleMinus, CircleCheck } from 'lucide-react';
import { NetworkPicker } from '@/components/ui/NetworkPicker';
import { useDeploymentHealth } from '@/chain/health';
import { Section, SectionHead } from '@/components/layout/Section';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddressValue, ExplorerLink, Mono } from '@/components/ui/Mono';
import { useProtocol } from '@/chain/lens';
import { CHAIN_ID, CHAIN_LABEL, CONTRACTS, DEPLOYMENT_ID, DEPLOYMENT_READY, PAYMENT_TOKEN } from '@/chain/config';
import { formatCount } from '@/lib/format';
import { NETWORK } from '@/lib/content/copy';

/**
 * PUB-09. The page a the selected network reviewer reads. No overstatement, no omission.
 *
 * Every value below is read from `PalissageLens.protocol()` at the address this
 * build points at — never hand-typed. If the read fails, the page says the read
 * failed rather than printing a remembered value.
 */
export default function Network() {
  const { t } = useLocale();
  const { formatBps } = useFormat();
  const health = useDeploymentHealth();
  const { data, isLoading, isError } = useProtocol();

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Network',
      value: <Mono>{t('{network} · chain id {id}', { network: CHAIN_LABEL, id: CHAIN_ID })}</Mono>,
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
            ? t('{symbol} · {decimals} decimals · issued by {issuer}', {
                symbol: data.paymentSymbol,
                decimals: data.paymentDecimals,
                issuer: PAYMENT_TOKEN.issuer,
              })
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
              ? t('yes — primary and secondary')
              : t('no — check the allowlist')
            : '—'}
        </Mono>
      ),
    },
    {
      label: 'Protocol fee',
      value: (
        <Mono>
          {data
            ? t('{primary} primary · {secondary} secondary', {
                primary: formatBps(data.primaryFeeBps),
                secondary: formatBps(data.secondaryFeeBps),
              })
            : '—'}
        </Mono>
      ),
    },
    {
      label: 'Markets paused',
      value: (
        <Mono>
          {data ? (data.primaryPaused || data.secondaryPaused ? t('yes') : t('no')) : '—'}
        </Mono>
      ),
    },
    {
      label: 'Public sandbox open',
      value: (
        <Mono>{data ? (data.testMode ? t('yes — roles are self-service') : t('no')) : '—'}</Mono>
      ),
    },
    {
      label: 'Records on chain',
      value: (
        <Mono>
          {data
            ? t(
                '{lots} lots · {offers} offers · {allocations} allocations · {deliveries} deliveries',
                {
                  lots: formatCount(data.lotCount),
                  offers: formatCount(data.offerCount),
                  allocations: formatCount(data.allocationCount),
                  deliveries: formatCount(data.redemptionCount),
                },
              )
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
    { label: `${PAYMENT_TOKEN.symbol} (${PAYMENT_TOKEN.issuer})`, address: PAYMENT_TOKEN.address },
  ];

  return (
    <>
      <section className="bg-page py-12 md:py-16">
        <div className="shell max-w-reading">
          <h1 className="t-display text-[clamp(2rem,1.4rem+2.6vw,3.5rem)]">{t(NETWORK.title)}</h1>
          <p className="mt-6 text-body text-ink-secondary">{t(NETWORK.lede)}</p>
          <div className="mt-6"><NetworkPicker assets /></div>
          <p className="mt-3 text-body-sm">{!DEPLOYMENT_READY ? t('No verified deployment published yet.') : health.data?.ready ? t('Live deployment checks passed.') : health.error?.message ?? t('Checking the live deployment…')}</p>
        </div>
      </section>

      <Section tone="surface" labelledBy="split-heading">
        <h2 id="split-heading" className="sr-only">
          {t('What is on-chain and what is not')}
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="t-h2 text-chain">{t('On-chain')}</h3>
            <ul className="mt-4 space-y-3">
              {NETWORK.onChain.map((item) => (
                <li key={item} className="flex gap-3 text-body-sm">
                  <CircleCheck
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-chain"
                    strokeWidth={1.75}
                  />
                  {t(item)}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-edge-subtle bg-surface-sunken p-6">
            <h3 className="t-h2 text-ink-secondary">{t('Off-chain')}</h3>
            <ul className="mt-4 space-y-3">
              {NETWORK.offChain.map((item) => (
                <li key={item} className="flex gap-3 text-body-sm text-ink-secondary">
                  <CircleMinus aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                  {t(item)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section labelledBy="why-heading">
        <SectionHead id="why-heading" title={t(NETWORK.whyTitle)} />
        <p className="mt-6 max-w-reading text-body text-ink-secondary">{t(NETWORK.whyBody)}</p>
      </Section>

      <Section tone="surface" labelledBy="deployment-heading">
        <h2 id="deployment-heading" className="t-h3">
          {t('Deployment')}
        </h2>
        <p className="mt-2 text-body-sm text-ink-secondary">{t(NETWORK.deploymentNote)}</p>

        {isError ? (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-danger/25 bg-danger-subtle p-4 text-body-sm text-danger"
          >
            {t(
              'We could not read the deployment from the selected network just now, so nothing is shown here. This page never prints a remembered value.',
            )}
          </p>
        ) : (
          <dl className="mt-6 divide-y divide-edge-subtle">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-wrap items-baseline gap-4 py-3">
                <dt className="w-56 shrink-0 text-body-sm text-ink-secondary">{t(row.label)}</dt>
                <dd className="min-w-0">
                  {isLoading ? <Skeleton className="h-4 w-48" /> : row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <h3 className="mt-12 t-h3">{t('Contracts')}</h3>
        <p className="mt-2 text-body-sm text-ink-secondary">
          {t('Each address links to its record on the block explorer.')}
        </p>
        <ul className="mt-4 divide-y divide-edge-subtle">
          {contracts.map((contract) => (
            <li key={contract.label} className="flex flex-wrap items-center gap-4 py-3">
              <span className="w-56 shrink-0 text-body-sm">{t(contract.label)}</span>
              <AddressValue
                address={contract.address}
                label={t('{name} address', { name: contract.label })}
              />
              <ExplorerLink address={contract.address} className="ml-auto">
                {t('the block explorer')}
              </ExplorerLink>
            </li>
          ))}
        </ul>

        <p className="mt-8 max-w-reading text-body-sm text-ink-secondary">
          {t(NETWORK.historicalNote)}
        </p>
      </Section>
    </>
  );
}
