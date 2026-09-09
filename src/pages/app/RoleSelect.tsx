import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { BrandMark } from '@/components/ui/Logo';
import { LinkButton } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { WalletChip } from '@/components/layout/WalletChip';
import { NetworkChip } from '@/components/ui/NetworkChip';
import { ROLE_BASE } from '@/lib/nav';
import { useRoleOffers } from '@/chain/roles';
import { CHAIN_LABEL } from '@/chain/config';

/**
 * APP-01. Resolve what this wallet is.
 *
 * Role is read from `RoleGateway` and the identity claims. It is not chosen
 * here, only switched between — and reaching a cabinet grants nothing, because
 * every action re-reads the wallet's actual contract capabilities before it is
 * offered.
 */
export default function RoleSelect() {
  const { isConnected } = useAccount();
  const { offers, loading } = useRoleOffers();

  return (
    <div className="min-h-dvh bg-page py-16">
      <a href="#roles-main" className="skip-link text-body-sm font-medium">
        Skip to the roles
      </a>
      <main id="roles-main" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 outline-none">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link to="/" aria-label="Palissage home">
            <BrandMark size={24} />
          </Link>
          <h1 className="mt-4 t-h1">Choose how to continue</h1>
          <p className="mt-3 max-w-reading text-body text-ink-secondary">
            Role is read from the role gateway and the identity claims on {CHAIN_LABEL}. It is not
            chosen here, only switched between.
          </p>
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
              <article key={offer.key} className="card flex flex-col p-6 shadow-1">
                <StatusBadge tone={offer.tone === 'neutral' ? 'neutral' : offer.tone}>
                  {offer.key === 'collector'
                    ? 'No claim needed'
                    : offer.qualified
                      ? offer.tone === 'warning'
                        ? 'Partial capabilities'
                        : 'Claims verified'
                      : 'Not qualified yet'}
                </StatusBadge>
                <h2 className="mt-4 t-h2">{offer.title}</h2>
                <p className="mt-2 text-body-sm text-ink-secondary">{offer.purpose}</p>
                <p className="mt-3 flex-1 text-body-sm text-ink-secondary">{offer.standing}</p>

                {offer.key === 'collector' ? (
                  <LinkButton to="/lots" kind="ghost" size="sm" className="mt-6 self-start">
                    Read a lot record
                  </LinkButton>
                ) : offer.qualified ? (
                  <LinkButton to={ROLE_BASE[offer.key]} kind="secondary" fullWidth className="mt-6">
                    Continue as {offer.title}
                  </LinkButton>
                ) : (
                  <LinkButton to="/app/testnet" kind="ghost" size="sm" className="mt-6 self-start">
                    What this needs
                  </LinkButton>
                )}
              </article>
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-body-sm text-ink-secondary">
          Reaching a cabinet grants nothing. Every action re-reads the wallet’s actual contract
          capabilities before it is offered.
        </p>
      </main>
    </div>
  );
}
