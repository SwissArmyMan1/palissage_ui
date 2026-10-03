import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount,  useDisconnect, useSwitchChain } from 'wagmi';
import { CircleCheck, CircleX, Clock, ExternalLink, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { BrandSeal } from '@/components/ui/Logo';
import { Button, ExternalButton, LinkButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { NetworkPicker } from '@/components/ui/NetworkPicker';
import { NetworkChip } from '@/components/ui/NetworkChip';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddressValue, ExplorerLink, Mono } from '@/components/ui/Mono';
import { WalletChip } from '@/components/layout/WalletChip';
import { SimulationBar } from '@/sandbox/SimulationBar';
import { TxStatus } from '@/components/patterns/TxStatus';
import { useMyParticipant, usePaymentBalance, useProtocol } from '@/chain/lens';
import { useDeploymentHealth } from '@/chain/health';
import { PendingTransactionBar } from '@/chain/pending';
import { erc20Abi, roleGatewayAbi } from '@/chain/abis';
import { useGasBalance } from '@/chain/balance';
import { CHAIN_ID, CHAIN_LABEL, CONTRACTS, DEPLOYMENT_READY, GAS_FAUCET_URL, PAYMENT_TOKEN } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatAmount, formatMoney } from '@/lib/format';
import { GATEWAY_ROLE } from '@/lib/enums';
import { ROLE_BASE, ROLE_TITLE } from '@/lib/nav';

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
  const health = useDeploymentHealth();
  const faucetTx = useTx();
  const participant = useMyParticipant();
  const payment = usePaymentBalance(address);
  const gas = useGasBalance(address);
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const tx = useTx();
  const [takenRole, setTakenRole] = useState<'winery' | 'shop' | 'collector' | null>(null);

  const p = participant.data;
  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;
  const symbol = protocol.data?.paymentSymbol ?? PAYMENT_TOKEN.symbol;
  const testMode = Boolean(protocol.data?.testMode);

  const deploymentOk = DEPLOYMENT_READY && health.data?.ready === true && !health.error;

  const hasGas = (gas.data?.value ?? 0n) > 0n;
  const hasPayment = (payment.data ?? 0n) > 0n;

  return (
    <div className="min-h-dvh bg-page">
      <SimulationBar />
      <PendingTransactionBar />
      <div className="py-12">
      <a href="#readiness-main" className="skip-link text-body-sm font-medium">
        Skip to the checks
      </a>
      <main id="readiness-main" tabIndex={-1} className="mx-auto w-full max-w-5xl px-4 outline-none">
        {/* The full seal, not the 24 px mark. A standalone screen with no app
            chrome above it has nothing else to say whose product this is, and
            one vine span at that size reads as an icon that failed to load. */}
        <div className="flex flex-col items-center">
          <Link to="/" aria-label="Palissage home" className="block w-full max-w-[420px]">
            <BrandSeal priority width="100%" />
          </Link>
        </div>

        <header className="mt-8">
          <h1 className="t-h1">Testnet readiness</h1>
          <div className="mt-4 flex flex-wrap gap-3"><NetworkPicker assets /><NetworkChip /></div>
          <p className="mt-4 max-w-reading text-body text-ink-secondary">
            Three independent checks. They are shown separately on purpose: a wallet with no{' '}
            {symbol} must still be able to reach the faucet.
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* ---- 1. Deployment ------------------------------------------- */}
          <Check
            tour="testnet-deployment"
            className="lg:col-span-2"
            columns
            title="Deployment"
            ok={deploymentOk}
            pending={health.isPending && DEPLOYMENT_READY}
            badge={
              health.isError || protocol.isError
                ? 'Read failed'
                : deploymentOk
                  ? 'Reading the live deployment'
                  : 'Not ready'
            }
          >
            {!DEPLOYMENT_READY ? <Callout tone="warning">No verified deployment has been published for this network yet. Transactions are disabled.</Callout> : null}
            {health.error ? <Callout tone="danger">{health.error.message}</Callout> : null}
            <Row label="RPC chain" value={<Mono>{health.data?.actualChainId ?? 'not checked'}</Mono>} />
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
              <Button kind="secondary" size="sm" onClick={() => { void protocol.refetch(); void health.refetch(); }}>
                Re-check the deployment
              </Button>
            </div>
          </Check>

          {/* ---- 2. Wallet ----------------------------------------------- */}
          <Check
            tour="testnet-wallet"
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
                <WalletChip layout="prompt" />
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
                  {PAYMENT_TOKEN.selfService ? (
                    <Button size="sm" pending={faucetTx.busy} disabled={!deploymentOk || !hasGas} onClick={() => faucetTx.send({ address: PAYMENT_TOKEN.address, abi: erc20Abi, functionName: 'claim' })}>
                      Claim 5,000 test EUR
                    </Button>
                  ) : (
                    <ExternalButton href={PAYMENT_TOKEN.faucetUrl} size="sm">Get test {symbol} from Paxos<ExternalLink aria-hidden className="size-4" strokeWidth={1.75} /></ExternalButton>
                  )}
                  <ExternalButton href={GAS_FAUCET_URL} size="sm">
                    Get {CHAIN_LABEL} ETH
                    <ExternalLink aria-hidden className="size-4" strokeWidth={1.75} />
                  </ExternalButton>
                  <Button size="sm" kind="ghost" onClick={() => disconnect()}>
                    <LogOut aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
                    Disconnect this wallet
                  </Button>
                </div>
                <TxStatus tx={faucetTx} />
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

                {testMode && deploymentOk ? (
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
                        onClick={() => {
                          setTakenRole('winery');
                          tx.send({
                            address: CONTRACTS.roleGateway,
                            abi: roleGatewayAbi,
                            functionName: 'assumeRole',
                            args: [2],
                          });
                        }}
                      >
                        Take the Winery role
                      </Button>
                      <Button
                        size="sm"
                        kind="secondary"
                        pending={tx.busy}
                        onClick={() => {
                          setTakenRole('shop');
                          tx.send({
                            address: CONTRACTS.roleGateway,
                            abi: roleGatewayAbi,
                            functionName: 'assumeRole',
                            args: [3],
                          });
                        }}
                      >
                        Take the Shop role
                      </Button>
                      <Button
                        size="sm"
                        kind="ghost"
                        pending={tx.busy}
                        onClick={() => {
                          setTakenRole('collector');
                          tx.send({
                            address: CONTRACTS.roleGateway,
                            abi: roleGatewayAbi,
                            functionName: 'assumeRole',
                            args: [4],
                          });
                        }}
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

                    {tx.stage === 'confirmed' && takenRole ? (
                      <Callout tone="success" title="The role is yours" role="status">
                        <p>
                          {ROLE_TITLE[takenRole]} is set on the gateway and the claims it needs are
                          issued. Your cabinet is where you act on it.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <LinkButton to={ROLE_BASE[takenRole]} size="sm">
                            Open the {ROLE_TITLE[takenRole]} cabinet
                          </LinkButton>
                          <LinkButton to="/app" kind="secondary" size="sm">
                            See every cabinet
                          </LinkButton>
                        </div>
                      </Callout>
                    ) : null}
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

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <LinkButton to="/app">Go to your cabinet</LinkButton>
          <LinkButton to="/lots" kind="secondary">
            Browse the catalogue
          </LinkButton>
        </div>

        <p className="mt-6 max-w-reading text-body-sm text-ink-secondary">
          Deployment and permissions are read from the selected network. Faucet and role actions submit separate testnet transactions. Gateway contract:{' '}
          <ExplorerLink address={CONTRACTS.roleGateway}>View role gateway</ExplorerLink>.
        </p>
      </main>
      </div>
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
  tour,
}: {
  title: string;
  ok: boolean;
  pending: boolean;
  badge: string;
  children: React.ReactNode;
  className?: string;
  /** Wide cards read better with their rows in two columns on a desktop. */
  columns?: boolean;
  /** Guided-tour anchor id. */
  tour?: string;
}) {
  const Icon = pending ? Clock : ok ? CircleCheck : CircleX;
  return (
    <section
      data-tour={tour}
      className={cn('card p-6', className)}
      aria-labelledby={`check-${title}`}
    >
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
    46630: 'Robinhood Testnet',
    10: 'OP Mainnet',
    42161: 'Arbitrum One',
    421614: 'Arbitrum Sepolia',
    137: 'Polygon',
    11155111: 'Sepolia',
  };
  return known[id] ? `${known[id]} (chain ${id})` : `chain ${id}`;
}
