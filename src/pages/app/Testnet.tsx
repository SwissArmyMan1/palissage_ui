import { Link } from 'react-router-dom';
import { useAccount, useBalance, useDisconnect, useSwitchChain } from 'wagmi';
import { CircleCheck, CircleX, Clock, ExternalLink, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { BrandMark } from '@/components/ui/Logo';
import { Button, ExternalButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { NetworkChip } from '@/components/ui/NetworkChip';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddressValue, ExplorerLink, Mono } from '@/components/ui/Mono';
import { WalletChip } from '@/components/layout/WalletChip';
import { TxStatus } from '@/components/patterns/TxStatus';
import { useMyParticipant, usePaymentBalance, useProtocol } from '@/chain/lens';
import { roleGatewayAbi } from '@/chain/abis';
import { CHAIN_ID, CHAIN_LABEL, CONTRACTS, PAYMENT_TOKEN } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatAmount, formatMoney } from '@/lib/format';
import { GATEWAY_ROLE } from '@/lib/enums';

/**
 * APP-02. Three independent checks, shown separately on purpose: a wallet with
 * no settlement asset must still be able to reach the faucet, and a green tick
 * on the deployment says nothing about this wallet.
 *
 * This screen only reads. It never assumes a role or claims from the faucet on
 * your behalf — a check that changes what it checks proves nothing. The role
 * buttons below are separate, explicit actions.
 *
 * Doc 10 M5 is fixed here: the eligibility lines name the claims that actually
 * gate an action (`TOPIC_B2B_BUYER` to buy, `TOPIC_WINERY` to publish). KYB is
 * read by the read model but required by no contract, so it is reported as an
 * operator attestation and kept out of the gating line.
 */
export default function Testnet() {
  const { address, isConnected, chainId } = useAccount();
  const protocol = useProtocol();
  const participant = useMyParticipant();
  const payment = usePaymentBalance(address);
  const gas = useBalance({ address, chainId: CHAIN_ID, query: { enabled: Boolean(address) } });
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const tx = useTx();

  const p = participant.data;
  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;
  const symbol = protocol.data?.paymentSymbol ?? PAYMENT_TOKEN.symbol;
  const testMode = Boolean(protocol.data?.testMode);

  const deploymentOk =
    !protocol.isError &&
    protocol.data !== undefined &&
    Number(protocol.data.chainId) === CHAIN_ID &&
    protocol.data.paymentAllowedPrimary &&
    protocol.data.paymentMetadataOk;

  const hasGas = (gas.data?.value ?? 0n) > 0n;
  const hasPayment = (payment.data ?? 0n) > 0n;

  return (
    <div className="min-h-dvh bg-page py-12">
      <a href="#readiness-main" className="skip-link text-body-sm font-medium">
        Skip to the checks
      </a>
      <main id="readiness-main" tabIndex={-1} className="mx-auto w-full max-w-5xl px-4 outline-none">
        <div className="flex flex-col items-center">
          <Link to="/" aria-label="Palissage home">
            <BrandMark size={24} />
          </Link>
        </div>

        <header className="mt-8">
          <h1 className="t-h1">Testnet readiness</h1>
          <NetworkChip className="mt-4" />
          <p className="mt-4 max-w-reading text-body text-ink-secondary">
            Three independent checks. They are shown separately on purpose: a wallet with no{' '}
            {symbol} must still be able to reach the faucet.
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* ---- 1. Deployment ------------------------------------------- */}
          <Check
            className="lg:col-span-2"
            columns
            title="Deployment"
            ok={deploymentOk}
            pending={protocol.isLoading}
            badge={
              protocol.isError
                ? 'Read failed'
                : deploymentOk
                  ? 'Reading the live deployment'
                  : 'Not ready'
            }
          >
            <Row label="Chain" value={<Mono>{`${CHAIN_LABEL} · ${CHAIN_ID}`}</Mono>} />
            <Row
              label="Protocol version"
              value={<Mono>{protocol.data?.version ?? '—'}</Mono>}
            />
            <Row
              label="Read model"
              value={
                <span className="flex flex-wrap items-center gap-2">
                  <Mono>PalissageLens</Mono>
                  <AddressValue address={CONTRACTS.palissageLens} label="lens address" />
                </span>
              }
            />
            <Row
              label="Settlement asset"
              value={
                <Mono>
                  {protocol.data
                    ? `${protocol.data.paymentSymbol} · ${protocol.data.paymentDecimals} decimals`
                    : '—'}
                </Mono>
              }
            />
            <Row
              label="Accepted by the markets"
              value={
                <Mono>
                  {protocol.data
                    ? `primary ${protocol.data.paymentAllowedPrimary ? 'yes' : 'no'} · secondary ${
                        protocol.data.paymentAllowedSecondary ? 'yes' : 'no'
                      }`
                    : '—'}
                </Mono>
              }
            />
            <Row
              label="Public sandbox"
              value={<Mono>{testMode ? 'open — roles are self-service' : 'closed'}</Mono>}
            />
            <div className="pt-2">
              <Button kind="secondary" size="sm" onClick={() => void protocol.refetch()}>
                Re-check the deployment
              </Button>
            </div>
          </Check>

          {/* ---- 2. Wallet ----------------------------------------------- */}
          <Check
            title="Wallet"
            ok={isConnected && chainId === CHAIN_ID && hasGas && hasPayment}
            pending={!isConnected}
            badge={
              !isConnected
                ? 'Not connected'
                : chainId !== CHAIN_ID
                  ? 'Wrong network'
                  : !hasPayment
                    ? 'Connected, not yet funded'
                    : 'Funded'
            }
          >
            {!isConnected ? (
              <div className="flex flex-wrap items-center gap-3 py-2">
                <p className="text-body-sm text-ink-secondary">
                  Connect a wallet to check the rest.
                </p>
                <WalletChip />
              </div>
            ) : (
              <>
                <Row label="Address" value={<AddressValue address={address!} label="your address" />} />
                <Row
                  label="Network"
                  value={
                    <Mono className={chainId === CHAIN_ID ? undefined : 'text-danger'}>
                      {chainId === CHAIN_ID
                        ? `${CHAIN_LABEL} · correct`
                        : `${chainName(chainId)} · wrong network`}
                    </Mono>
                  }
                />

                {chainId !== CHAIN_ID ? (
                  <Callout tone="danger" className="my-2" role="alert">
                    <p>
                      Your wallet is on {chainName(chainId)}. Palissage runs on {CHAIN_LABEL} for
                      this release. The switch was offered when you connected and declined, so any
                      action you take will ask again before it signs.
                    </p>
                    <p className="mt-2">
                      The balances below are still correct: this interface reads them from{' '}
                      {CHAIN_LABEL} directly, not from whichever network your wallet is pointed at.
                      That is why they show even while the network is wrong.
                    </p>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        pending={isSwitching}
                        onClick={() => switchChain({ chainId: CHAIN_ID })}
                      >
                        Switch to {CHAIN_LABEL}
                      </Button>
                    </div>
                  </Callout>
                ) : null}
                <Row
                  label={symbol}
                  value={
                    <Mono className={hasPayment ? undefined : 'text-warning'}>
                      {payment.data === undefined
                        ? '—'
                        : `${formatMoney(payment.data, decimals)}${hasPayment ? '' : ' — get some from the faucet'}`}
                    </Mono>
                  }
                />
                <Row
                  label="Gas"
                  value={
                    <Mono className={hasGas ? undefined : 'text-warning'}>
                      {gas.data ? `${formatAmount(gas.data.value, 18, 4)} ETH` : '—'}
                    </Mono>
                  }
                />
                <div className="flex flex-wrap gap-3 pt-2">
                  <ExternalButton href={PAYMENT_TOKEN.faucetUrl} size="sm">
                    Get test {symbol} from Circle
                    <ExternalLink aria-hidden className="size-4" strokeWidth={1.75} />
                  </ExternalButton>
                  <ExternalButton href="https://portal.cdp.coinbase.com/products/faucet" size="sm">
                    Get Base Sepolia ETH
                    <ExternalLink aria-hidden className="size-4" strokeWidth={1.75} />
                  </ExternalButton>
                  <Button size="sm" kind="ghost" onClick={() => disconnect()}>
                    <LogOut aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
                    Disconnect this wallet
                  </Button>
                </div>
              </>
            )}
          </Check>

          {/* ---- 3. Permissions ------------------------------------------ */}
          <Check
            title="Your permissions"
            ok={Boolean(p?.b2bClaim || p?.wineryClaim)}
            pending={!isConnected || participant.isLoading}
            badge={
              !isConnected
                ? 'Connect a wallet'
                : p?.b2bClaim
                  ? 'Qualified as a B2B buyer'
                  : p?.wineryClaim
                    ? 'Qualified as a winery'
                    : 'No trading claim yet'
            }
          >
            {!isConnected ? (
              <p className="py-2 text-body-sm text-ink-secondary">
                Permissions are per wallet, so there is nothing to read yet.
              </p>
            ) : (
              <>
                <Row label="Registered identity" value={<Mono>{p?.registered ? 'yes' : 'no'}</Mono>} />
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
                <Row label="Gateway role" value={<Mono>{GATEWAY_ROLE[p?.gatewayRole ?? 0]}</Mono>} />
                <Row
                  label="Required to buy"
                  value={
                    <Mono className={p?.b2bClaim ? 'text-success' : 'text-warning'}>
                      {`B2B buyer claim · ${p?.b2bClaim ? 'issued' : 'missing'}`}
                    </Mono>
                  }
                />
                <Row
                  label="Required to publish"
                  value={
                    <Mono className={p?.wineryClaim ? 'text-success' : 'text-warning'}>
                      {`Winery claim · ${p?.wineryClaim ? 'issued' : 'missing'}`}
                    </Mono>
                  }
                />
                <Row
                  label="canReceive"
                  value={
                    <Mono>
                      {p?.canReceive ? 'true — bottles can be minted to this wallet' : 'false'}
                    </Mono>
                  }
                />
                <Row label="canSend" value={<Mono>{p?.canSend ? 'true' : 'false'}</Mono>} />
                <Row
                  label="KYB attestation"
                  value={
                    <Mono className="text-ink-secondary">
                      {`${p?.kyb ? 'issued' : 'not issued'} — read by the interface, required by no contract`}
                    </Mono>
                  }
                />

                {testMode ? (
                  <div className="space-y-3 border-t border-edge-subtle pt-4">
                    <p className="text-body-sm text-ink-secondary">
                      The sandbox is open, so you can take a role yourself. One role at a time:
                      taking a new one removes the previous role’s claims.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        size="sm"
                        kind="secondary"
                        pending={tx.busy}
                        onClick={() =>
                          tx.send({
                            address: CONTRACTS.roleGateway,
                            abi: roleGatewayAbi,
                            functionName: 'assumeRole',
                            args: [2],
                          })
                        }
                      >
                        Take the Winery role
                      </Button>
                      <Button
                        size="sm"
                        kind="secondary"
                        pending={tx.busy}
                        onClick={() =>
                          tx.send({
                            address: CONTRACTS.roleGateway,
                            abi: roleGatewayAbi,
                            functionName: 'assumeRole',
                            args: [3],
                          })
                        }
                      >
                        Take the Shop role
                      </Button>
                      <Button
                        size="sm"
                        kind="ghost"
                        pending={tx.busy}
                        onClick={() =>
                          tx.send({
                            address: CONTRACTS.roleGateway,
                            abi: roleGatewayAbi,
                            functionName: 'assumeRole',
                            args: [4],
                          })
                        }
                      >
                        Take the Collector role
                      </Button>
                    </div>
                    <p className="text-body-sm text-ink-secondary">
                      Operations cannot be self-assigned: it carries the verifier role on the
                      token, so a self-service operator could suspend a live lot. A gateway admin
                      grants it instead.
                    </p>
                    <TxStatus tx={tx} />
                  </div>
                ) : (
                  <p className="border-t border-edge-subtle pt-4 text-body-sm text-ink-secondary">
                    The sandbox is closed, so roles are granted by an operator rather than taken.
                  </p>
                )}
              </>
            )}
          </Check>
        </div>

        <p className="mt-8 max-w-reading text-body-sm text-ink-secondary">
          This screen reads. The role buttons above are the one exception, and they are separate,
          explicit actions —{' '}
          <ExplorerLink address={CONTRACTS.roleGateway}>the gateway is on Base</ExplorerLink>.
        </p>
      </main>
    </div>
  );
}

function Check({
  title,
  ok,
  pending,
  badge,
  children,
  className,
  columns = false,
}: {
  title: string;
  ok: boolean;
  pending: boolean;
  badge: string;
  children: React.ReactNode;
  className?: string;
  /** Wide cards read better with their rows in two columns on a desktop. */
  columns?: boolean;
}) {
  const Icon = pending ? Clock : ok ? CircleCheck : CircleX;
  return (
    <section className={cn('card p-6', className)} aria-labelledby={`check-${title}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`check-${title}`} className="flex items-center gap-2 t-h3">
          <Icon
            aria-hidden
            className={cn(
              'size-5',
              pending ? 'text-warning' : ok ? 'text-success' : 'text-danger',
            )}
            strokeWidth={1.75}
          />
          {title}
        </h2>
        <StatusBadge tone={pending ? 'warning' : ok ? 'success' : 'danger'}>{badge}</StatusBadge>
      </div>
      <dl className={cn('mt-4', columns ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3')}>{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <dt className="w-44 shrink-0 text-body-sm text-ink-secondary">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

/** A chain id alone tells the reader nothing; the common ones get their name. */
function chainName(id?: number): string {
  if (id === undefined) return 'an unknown network';
  const known: Record<number, string> = {
    1: 'Ethereum Mainnet',
    8453: 'Base',
    84532: 'Base Sepolia',
    10: 'OP Mainnet',
    42161: 'Arbitrum One',
    421614: 'Arbitrum Sepolia',
    137: 'Polygon',
    11155111: 'Sepolia',
  };
  return known[id] ? `${known[id]} (chain ${id})` : `chain ${id}`;
}
