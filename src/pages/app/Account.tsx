import { useAccount } from 'wagmi';
import { CircleCheck, CircleMinus } from 'lucide-react';
import { Callout } from '@/components/ui/Callout';
import { LinkButton } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddressValue, ExplorerLink, Mono } from '@/components/ui/Mono';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import { useMyParticipant, usePaymentBalance, useProtocol } from '@/chain/lens';
import { CONTRACTS, PAYMENT_TOKEN } from '@/chain/config';
import { useTheme } from '@/lib/theme';
import { formatMoney } from '@/lib/format';
import { GATEWAY_ROLE } from '@/lib/enums';

/**
 * WIN-10 / SHO-14 / ADM-10 — one screen, because the content is identical: what
 * this wallet is, what it may do, and how the interface looks.
 *
 * Every capability line is read from `ParticipantView` rather than inferred from
 * the cabinet the reader happens to be in.
 */
export default function Account() {
  const { address, isConnected } = useAccount();
  const participant = useMyParticipant();
  const protocol = useProtocol();
  const balance = usePaymentBalance(address);
  const { choice, setChoice } = useTheme();

  const p = participant.data;
  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;
  const symbol = protocol.data?.paymentSymbol ?? PAYMENT_TOKEN.symbol;

  return (
    <CabinetPage>
      <PageHeader
        title="Account"
        lede="What this wallet is on the selected network, and what the contracts will let it do."
      />

      {!isConnected ? (
        <ConnectPrompt what="this wallet's identity and capabilities" className="mt-8" />
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="card p-6" aria-labelledby="identity-heading">
            <h2 id="identity-heading" className="t-h3">
              Identity
            </h2>
            <dl className="mt-4 space-y-3">
              <Row label="Wallet" value={<AddressValue address={address!} label="your wallet" />} />
              <Row
                label="Identity contract"
                value={
                  p?.identity && p.identity !== '0x0000000000000000000000000000000000000000' ? (
                    <AddressValue address={p.identity} label="identity contract" />
                  ) : (
                    <Mono>none</Mono>
                  )
                }
              />
              <Row label="Registered" value={<Mono>{p?.registered ? 'yes' : 'no'}</Mono>} />
              <Row label="Verified by the registry" value={<Mono>{p?.isVerified ? 'yes' : 'no'}</Mono>} />
              <Row label="Gateway role" value={<Mono>{GATEWAY_ROLE[p?.gatewayRole ?? 0]}</Mono>} />
              <Row
                label={`${symbol} balance`}
                value={<Mono>{balance.data === undefined ? '—' : formatMoney(balance.data, decimals)}</Mono>}
              />
            </dl>
            <ExplorerLink address={address!} className="mt-4">
              This wallet on the selected network
            </ExplorerLink>
          </section>

          <section className="card p-6" aria-labelledby="claims-heading">
            <h2 id="claims-heading" className="t-h3">
              Claims
            </h2>
            <p className="mt-2 text-body-sm text-ink-secondary">
              Claims are what the contracts check. A cabinet you can open is not a claim.
            </p>
            <ul className="mt-4 space-y-3">
              <Claim
                held={Boolean(p?.kyc)}
                title="KYC"
                note="Required by the registry before any bottle can move to this wallet."
              />
              <Claim
                held={Boolean(p?.b2bClaim)}
                title="B2B buyer"
                note="Required by the primary market to reserve, and by the secondary market to buy."
              />
              <Claim
                held={Boolean(p?.wineryClaim)}
                title="Winery"
                note="Required by the token to create a lot and by the market to publish an offer."
              />
              <Claim
                held={Boolean(p?.kyb)}
                title="KYB"
                note="An operator attestation. The read model reports it; no contract requires it."
                advisory
              />
            </ul>
          </section>

          <section className="card p-6" aria-labelledby="caps-heading">
            <h2 id="caps-heading" className="t-h3">
              Capabilities, per contract
            </h2>
            <p className="mt-2 text-body-sm text-ink-secondary">
              Read from the roles each contract actually grants.
            </p>
            <dl className="mt-4 space-y-3">
              <Row label="Token verifier" value={<Yes value={p?.tokenVerifier} />} />
              <Row label="Token enforcer" value={<Yes value={p?.tokenEnforcer} />} />
              <Row label="Token admin" value={<Yes value={p?.tokenAdmin} />} />
              <Row label="Primary market verifier" value={<Yes value={p?.primaryVerifier} />} />
              <Row label="Primary market admin" value={<Yes value={p?.primaryAdmin} />} />
              <Row label="Redemption verifier" value={<Yes value={p?.redemptionVerifier} />} />
              <Row label="Primary market pauser" value={<Yes value={p?.primaryPauser} />} />
              <Row label="Secondary market pauser" value={<Yes value={p?.secondaryPauser} />} />
              <Row label="Gateway admin" value={<Yes value={p?.gatewayAdmin} />} />
              <Row label="Gateway owner" value={<Yes value={p?.gatewayOwner} />} />
            </dl>
            {p?.tokenEnforcer ? (
              <Callout tone="warning" className="mt-4 max-w-none">
                This wallet can freeze balances and force transfers on the token. That authority
                exists for regulatory enforcement and is disclosed on the network page rather than
                hidden here.
              </Callout>
            ) : null}
          </section>

          <section className="card p-6" aria-labelledby="appearance-heading">
            <h2 id="appearance-heading" className="t-h3">
              Appearance
            </h2>
            <fieldset className="mt-4 space-y-2">
              <legend className="text-body-sm font-medium">Theme</legend>
              {(['system', 'light', 'dark'] as const).map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 rounded-md border border-edge-subtle px-3 py-2 text-body-sm"
                >
                  <input
                    type="radio"
                    name="theme"
                    checked={choice === option}
                    onChange={() => setChoice(option)}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  {option === 'system' ? 'Follow the system' : option === 'light' ? 'Light' : 'Dark'}
                </label>
              ))}
            </fieldset>

            <div className="mt-6">
              <p className="text-body-sm font-medium">Language</p>
              <p className="mt-1 text-body-sm text-ink-secondary">
                English only for now. A French translation is in preparation; the interface will
                not offer a half-translated locale.
              </p>
            </div>

            <div className="mt-6">
              <p className="text-body-sm font-medium">Deployment</p>
              <p className="mt-1 text-body-sm text-ink-secondary">
                Reading <Mono>PalissageLens</Mono> at{' '}
                <AddressValue address={CONTRACTS.palissageLens} label="lens address" />.
              </p>
              <LinkButton to="/app/testnet" kind="secondary" size="sm" className="mt-3">
                Check your readiness
              </LinkButton>
            </div>
          </section>
        </div>
      )}
    </CabinetPage>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <dt className="w-52 shrink-0 text-body-sm text-ink-secondary">{label}</dt>
      <dd className="min-w-0">{value}</dd>
    </div>
  );
}

function Yes({ value }: { value?: boolean }) {
  return <Mono className={value ? 'text-success' : 'text-ink-secondary'}>{value ? 'yes' : 'no'}</Mono>;
}

function Claim({
  held,
  title,
  note,
  advisory,
}: {
  held: boolean;
  title: string;
  note: string;
  advisory?: boolean;
}) {
  return (
    <li className="flex gap-3">
      {held ? (
        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.75} />
      ) : (
        <CircleMinus aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-secondary" strokeWidth={1.75} />
      )}
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-body-sm font-medium">
          {title}
          {advisory ? <StatusBadge tone="neutral">Not enforced</StatusBadge> : null}
        </p>
        <p className="text-body-sm text-ink-secondary">{note}</p>
      </div>
    </li>
  );
}
