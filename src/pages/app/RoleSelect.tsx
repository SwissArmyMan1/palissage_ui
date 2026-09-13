import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { BrandMark } from '@/components/ui/Logo';
import { VineyardStrip } from '@/components/ui/VineyardStrip';
import { Button, LinkButton } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { WalletChip } from '@/components/layout/WalletChip';
import { NetworkChip } from '@/components/ui/NetworkChip';
import { ActionReview } from '@/components/patterns/ActionReview';
import { ROLE_BASE } from '@/lib/nav';
import { useRoleOffers, useTestMode, type RoleOffer } from '@/chain/roles';
import { roleGatewayAbi } from '@/chain/abis';
import { CHAIN_LABEL, CONTRACTS } from '@/chain/config';
import { useTx, type TxState } from '@/chain/tx';

/**
 * APP-01. Resolve what this wallet is, and take a role from here.
 *
 * The grant used to live on the readiness screen, two clicks away from the
 * decision that motivates it. It is the same `assumeRole` write, moved to
 * where the reader already is: the card that says the claim is missing is the
 * card that issues it.
 *
 * The gateway records exactly one role per wallet, so the card matching it is
 * marked and its grant is disabled — re-taking a role you hold burns gas to
 * write the value that is already there.
 *
 * Every cabinet still opens regardless of standing, because entering grants
 * nothing — each action re-reads the wallet's real contract capabilities
 * before it is offered.
 */
export default function RoleSelect() {
  const { isConnected } = useAccount();
  const { offers, loading } = useRoleOffers();
  const testMode = useTestMode();
  const tx = useTx();
  const [taking, setTaking] = useState<RoleOffer | null>(null);

  const held = offers.find((offer) => offer.isGatewayRole);

  const closeReview = () => {
    setTaking(null);
    tx.reset();
  };

  return (
    <div className="min-h-dvh bg-page py-16">
      <a href="#roles-main" className="skip-link text-body-sm font-medium">
        Skip to the roles
      </a>
      <main id="roles-main" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 outline-none">
        <VineyardStrip className="mb-10 h-28 md:h-36" />
        <div className="flex flex-col items-center gap-2 text-center">
          <Link to="/" aria-label="Palissage home">
            <BrandMark size={24} />
          </Link>
          <h1 className="mt-4 t-h1">Choose how to continue</h1>
          <p className="mt-3 max-w-reading text-body text-ink-secondary">
            Any cabinet opens from here. What the wallet may actually do inside it is read from
            the role gateway and the identity claims on {CHAIN_LABEL}.
          </p>

          {/* The gateway's answer in one line, before the reader compares four
              cards to work out which one is theirs. */}
          {isConnected && !loading ? (
            <p className="mt-3 text-body-sm text-ink-secondary">
              {held ? (
                <>
                  This wallet holds the{' '}
                  <span className="font-semibold text-ink">{held.title}</span> role on the gateway.
                </>
              ) : (
                'This wallet holds no role on the gateway yet.'
              )}
            </p>
          ) : null}

          <NetworkChip className="mt-4" />
        </div>

        {!isConnected ? (
          <div className="mt-12 rounded-xl border border-dashed border-edge-strong p-8 text-center">
            <h2 className="t-h3">Connect a wallet to resolve your role</h2>
            <p className="mx-auto mt-2 max-w-reading text-body-sm text-ink-secondary">
              Reading the catalogue and a bottle passport needs no wallet. Entering a cabinet does,
              because the contracts decide what the wallet may do.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <WalletChip />
              <LinkButton to="/lots" kind="ghost" size="sm">
                Keep browsing instead
              </LinkButton>
            </div>
          </div>
        ) : loading ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card p-6">
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="mt-4 h-6 w-32" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-6 h-9 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {offers.map((offer) => (
              <RoleCard
                key={offer.key}
                offer={offer}
                testMode={testMode}
                tx={tx}
                onTake={() => {
                  tx.reset();
                  setTaking(offer);
                }}
              />
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-body-sm text-ink-secondary">
          Reaching a cabinet grants nothing. Every action re-reads the wallet’s actual contract
          capabilities before it is offered.
        </p>
      </main>

      <ActionReview
        open={taking !== null}
        onClose={closeReview}
        title={taking ? `Take the ${taking.title} role` : ''}
        object={
          taking ? (
            <div className="space-y-1">
              <p className="text-body font-medium">{taking.title}</p>
              <p className="text-body-sm text-ink-secondary">{taking.purpose}</p>
            </div>
          ) : null
        }
        consequence={
          <div className="space-y-2">
            <p>
              This calls <span className="t-mono">assumeRole</span> on the role gateway from your
              wallet, so it is one transaction you sign and pay gas for on {CHAIN_LABEL}.
            </p>
            <p>
              The gateway registers an identity for this wallet if it has none, then issues the
              claims the role needs.
            </p>
            <p>
              A wallet holds one role at a time. Taking this one removes the claims of whatever
              role it holds now{held ? `, which is ${held.title}` : ''}, including any verifier
              capability.
            </p>
          </div>
        }
        steps={
          taking && taking.assumable !== null
            ? [
                {
                  id: `assume-${taking.key}`,
                  label: `Take the ${taking.title} role`,
                  required: true,
                  tx,
                  run: () =>
                    tx.send({
                      address: CONTRACTS.roleGateway,
                      abi: roleGatewayAbi,
                      functionName: 'assumeRole',
                      args: [taking.assumable!],
                    }),
                },
              ]
            : []
        }
      />
    </div>
  );
}

/**
 * One card, one primary action, one supporting action. Keeping that shape
 * fixed across four different standings is what makes the disabled grant on
 * the held card read as *this one is already yours* rather than as a bug.
 */
function RoleCard({
  offer,
  testMode,
  tx,
  onTake,
}: {
  offer: RoleOffer;
  testMode: boolean;
  tx: TxState;
  onTake: () => void;
}) {
  const held = offer.isGatewayRole;
  /*
   * Operations is `assumable: null` — the contract refuses a self-grant
   * because the role carries the token's verifier capability. Offering a
   * button that always reverts would be a lie, so the card sends the reader
   * to a gateway admin instead.
   */
  const grantable = testMode && offer.assumable !== null;
  const noteId = `role-${offer.key}-note`;

  const enter = (
    <LinkButton to={ROLE_BASE[offer.key]} kind="secondary" fullWidth className="mt-6">
      Continue as {offer.title}
    </LinkButton>
  );

  return (
    <article className="card flex flex-col p-6 shadow-1">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={offer.tone === 'neutral' ? 'neutral' : offer.tone}>
          {offer.key === 'collector'
            ? 'No claim needed'
            : offer.qualified
              ? offer.tone === 'warning'
                ? 'Partial capabilities'
                : 'Claims verified'
              : 'Not qualified yet'}
        </StatusBadge>
        {held ? <StatusBadge tone="info">Current role</StatusBadge> : null}
      </div>

      <h2 className="mt-4 t-h2">{offer.title}</h2>
      <p className="mt-2 text-body-sm text-ink-secondary">{offer.purpose}</p>
      <p className="mt-3 flex-1 text-body-sm text-ink-secondary">{offer.standing}</p>

      {held ? (
        <>
          {enter}
          {grantable ? (
            <>
              <Button
                kind="secondary"
                fullWidth
                disabled
                aria-describedby={noteId}
                className="mt-3"
              >
                Take the {offer.title} role
              </Button>
              <p id={noteId} className="mt-2 text-body-sm text-ink-secondary">
                Already yours. Taking it again would write the value the gateway already holds.
              </p>
            </>
          ) : null}
        </>
      ) : grantable && !offer.qualified ? (
        <>
          <Button fullWidth className="mt-6" disabled={tx.busy} onClick={onTake}>
            Take the {offer.title} role
          </Button>
          <LinkButton
            to={ROLE_BASE[offer.key]}
            kind="ghost"
            size="sm"
            className="mt-3 self-start"
          >
            Open it read-only instead
          </LinkButton>
        </>
      ) : grantable ? (
        <>
          {enter}
          <Button
            kind="ghost"
            size="sm"
            className="mt-3 self-start"
            disabled={tx.busy}
            onClick={onTake}
          >
            Switch this wallet to {offer.title}
          </Button>
        </>
      ) : (
        <>
          {enter}
          {offer.key === 'collector' ? (
            <LinkButton to="/lots" kind="ghost" size="sm" className="mt-3 self-start">
              Read a lot record
            </LinkButton>
          ) : offer.qualified ? null : (
            <LinkButton to="/app/testnet" kind="ghost" size="sm" className="mt-3 self-start">
              What this needs
            </LinkButton>
          )}
        </>
      )}
    </article>
  );
}
