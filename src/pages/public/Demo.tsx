import { useLocale } from '@/lib/i18n/context';
import { ArrowRight } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { TourStartButton } from '@/tour';
import { Callout } from '@/components/ui/Callout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useProtocol } from '@/chain/lens';
import { CHAIN_LABEL, PAYMENT_TOKEN } from '@/chain/config';

/** Local guided simulation and separate wallet-connected testnet workflows. */
export default function Demo() {
  const { t } = useLocale();
  const { data } = useProtocol();
  const open = Boolean(data?.testMode);

  return (
    <div className="shell py-12 md:py-16">
      <div className="max-w-reading">
        <p className="t-caption text-accent">{t('Try it')}</p>
        <h1 className="mt-4 t-h1">
          {t('Explore the workflow, then try it on a testnet.')}
        </h1>
        <p className="mt-6 text-body text-ink-secondary">
          {t('Start a guided simulation without a wallet, or connect to Arbitrum Sepolia or Robinhood Testnet to submit real transactions using test assets. Simulated actions never reach a blockchain.')}
        </p>
      </div>

      <div className="reveal-stagger mt-12 grid gap-6 lg:grid-cols-3">
        <Card
          badge={<StatusBadge tone="success">{t('No wallet needed')}</StatusBadge>}
          title={t('Read everything')}
          body={t(
            'The catalogue, every lot record, the verification state and a bottle passport all read without a wallet or an account.',
          )}
          cta={{ label: 'Explore the lots', to: '/lots' }}
        />
        <Card
          badge={
            open ? (
              <StatusBadge tone="success">{t('Sandbox open')}</StatusBadge>
            ) : (
              <StatusBadge tone="warning">{t('Sandbox closed')}</StatusBadge>
            )
          }
          title={t('Take a role and trade')}
          body={
            open
              ? t(
                  "Connect a wallet, take the Winery or Shop role in one transaction, get {symbol} from the testnet faucet, and run a real reservation end to end.",
                  { symbol: PAYMENT_TOKEN.symbol },
                )
              : t(
                  'The gateway’s test mode is closed right now, so roles cannot be self-assigned. Reading still works everywhere.',
                )
          }
          cta={{ label: 'Take a role and open a cabinet', to: '/app/testnet' }}
        />
        <Card
          badge={<StatusBadge tone="neutral">{t('Operator role')}</StatusBadge>}
          title={t('See the operator cabinet')}
          body={t(
            'Operations carries the verifier role on the token, so it is deliberately not self-assignable — a self-service operator could suspend a live lot. A gateway admin has to grant it.',
          )}
          cta={{ label: 'What runs on-chain', to: '/network' }}
        />
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <TourStartButton />
        <LinkButton to="/app" kind="secondary">
          {t('Go to your cabinet')}
        </LinkButton>
        <span className="text-body-sm text-ink-secondary">
          {t('If this wallet already holds a role, this is the way straight in.')}
        </span>
      </div>

      <Callout
        tone="info"
        title={t('What “test assets only” means')}
        className="mt-12 max-w-reading"
      >
        {t('Everything on ')}
        {CHAIN_LABEL} {t(' is a test asset with no monetary value, including the')}{' '}
        {PAYMENT_TOKEN.symbol}{' '}
        {t(' used for settlement. No real wine changes hands, and no real money settles.')}
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
  const { t } = useLocale();
  return (
    <article className="card flex flex-col p-6 shadow-1">
      {badge}
      <h2 className="mt-4 t-h3">{title}</h2>
      <p className="mt-3 flex-1 text-body-sm text-ink-secondary">{body}</p>
      <LinkButton to={cta.to} kind="secondary" size="sm" className="mt-6 self-start">
        {t(cta.label)}
        <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
      </LinkButton>
    </article>
  );
}
