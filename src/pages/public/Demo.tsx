import { ArrowRight } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useProtocol } from '@/chain/lens';
import { CHAIN_LABEL, PAYMENT_TOKEN } from '@/chain/config';

/**
 * PUB-12.
 *
 * The wallet-free simulator specified in doc 00 §6 is **not built** (doc 10 §5
 * records it as an open gap). Rather than send a reader to a CTA that leads
 * nowhere, this page offers the sandbox that genuinely exists: with the
 * gateway's test mode open, three of the four roles are self-service on Base
 * Sepolia in one transaction. The operator role is not, and the page says so.
 */
export default function Demo() {
  const { data } = useProtocol();
  const open = Boolean(data?.testMode);

  return (
    <div className="shell py-12 md:py-16">
      <div className="max-w-reading">
        <p className="t-caption text-accent">Try it</p>
        <h1 className="mt-4 t-h1">Three ways in, and one that is honest about its limits.</h1>
        <p className="mt-6 text-body text-ink-secondary">
          There is no wallet-free simulator yet. What exists is the real deployment on{' '}
          {CHAIN_LABEL}, with a public sandbox open on the role gateway — so you can hold a role
          and send real transactions against test assets.
        </p>
      </div>

      <div className="reveal-stagger mt-12 grid gap-6 lg:grid-cols-3">
        <Card
          badge={<StatusBadge tone="success">No wallet needed</StatusBadge>}
          title="Read everything"
          body="The catalogue, every lot record, the verification state and a bottle passport all read without a wallet or an account."
          cta={{ label: 'Explore the lots', to: '/lots' }}
        />
        <Card
          badge={
            open ? (
              <StatusBadge tone="success">Sandbox open</StatusBadge>
            ) : (
              <StatusBadge tone="warning">Sandbox closed</StatusBadge>
            )
          }
          title="Take a role and trade"
          body={
            open
              ? `Connect a wallet, take the Winery or Shop role in one transaction, get ${PAYMENT_TOKEN.symbol} from Circle's faucet, and run a real reservation end to end.`
              : 'The gateway’s test mode is closed right now, so roles cannot be self-assigned. Reading still works everywhere.'
          }
          cta={{ label: 'Take a role and open a cabinet', to: '/app/testnet' }}
        />
        <Card
          badge={<StatusBadge tone="neutral">Operator role</StatusBadge>}
          title="See the operator cabinet"
          body="Operations carries the verifier role on the token, so it is deliberately not self-assignable — a self-service operator could suspend a live lot. A gateway admin has to grant it."
          cta={{ label: 'What runs on Base', to: '/network' }}
        />
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <LinkButton to="/app">Go to your cabinet</LinkButton>
        <span className="text-body-sm text-ink-secondary">
          If this wallet already holds a role, this is the way straight in.
        </span>
      </div>

      <Callout tone="info" title="What “test assets only” means" className="mt-12 max-w-reading">
        Everything on {CHAIN_LABEL} is a test asset with no monetary value, including the{' '}
        {PAYMENT_TOKEN.symbol} used for settlement. No real wine changes hands, and no real money
        settles.
      </Callout>
    </div>
  );
}

function Card({
  badge,
  title,
  body,
  cta,
}: {
  badge: React.ReactNode;
  title: string;
  body: string;
  cta: { label: string; to: string };
}) {
  return (
    <article className="card flex flex-col p-6 shadow-1">
      {badge}
      <h2 className="mt-4 t-h3">{title}</h2>
      <p className="mt-3 flex-1 text-body-sm text-ink-secondary">{body}</p>
      <LinkButton to={cta.to} kind="secondary" size="sm" className="mt-6 self-start">
        {cta.label}
        <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
      </LinkButton>
    </article>
  );
}
