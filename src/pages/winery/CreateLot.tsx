import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Field, TextInput } from '@/components/ui/Field';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { FocusedShell } from '@/components/layout/FocusedShell';
import { ActionReview } from '@/components/patterns/ActionReview';
import { useMyParticipant } from '@/chain/lens';
import { wineLotTokenAbi } from '@/chain/abis';
import { CONTRACTS } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatBps, formatCount, parseBottles } from '@/lib/format';

const STEPS = ['Wine', 'Quantity', 'Terms', 'Evidence'] as const;
const DRAFT_KEY = 'palissage-lot-draft';

interface Draft {
  name: string;
  region: string;
  grapes: string;
  vintage: string;
  totalBottles: string;
  bottleSizeMl: string;
  royaltyBps: string;
  exportAllowed: boolean;
  metadataURI: string;
}

const EMPTY: Draft = {
  name: '',
  region: '',
  grapes: '',
  vintage: '',
  totalBottles: '',
  bottleSizeMl: '750',
  royaltyBps: '250',
  exportAllowed: false,
  metadataURI: '',
};

function readDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/**
 * WIN-03. `Multi-step flow (wizard)` — genuinely sequential, because a lot
 * cannot be verified before it is described. Each step is a URL, so a refresh
 * or a back gesture keeps its place, and the draft is kept locally so nothing
 * typed is lost.
 *
 * Doc 10 M3 is fixed here: `exportAllowed` is a single boolean on-chain, so the
 * field is a boolean. A per-market list has no on-chain representation and this
 * form does not imply one.
 */
export default function CreateLot() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const participant = useMyParticipant();
  const tx = useTx();
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [reviewing, setReviewing] = useState(false);
  const [touched, setTouched] = useState(false);

  const step = Math.min(Math.max(Number(params.get('step') ?? '1'), 1), STEPS.length) - 1;

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // A private window can refuse storage; the form still works in memory.
    }
  }, [draft]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setTouched(true);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const goto = (next: number) => {
    setParams(new URLSearchParams({ step: String(next + 1) }), { replace: false });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const bottles = parseBottles(draft.totalBottles);
  const vintage = Number(draft.vintage);
  const size = parseBottles(draft.bottleSizeMl);
  const royalty = Number(draft.royaltyBps);

  const errors = useMemo(
    () => ({
      name: draft.name.trim() === '' ? 'Give the lot a name — buyers see it as the wine’s name.' : undefined,
      vintage:
        draft.vintage !== '' && (!Number.isInteger(vintage) || vintage < 1900 || vintage > 2100)
          ? 'Enter the vintage year, for example 2026.'
          : undefined,
      totalBottles:
        draft.totalBottles !== '' && (bottles === null || bottles < 1)
          ? 'Enter the number of bottles in this batch, as a whole number.'
          : undefined,
      bottleSizeMl:
        draft.bottleSizeMl !== '' && (size === null || size < 1)
          ? 'Enter the bottle size in millilitres, for example 750.'
          : undefined,
      royaltyBps:
        draft.royaltyBps !== '' && (!Number.isInteger(royalty) || royalty < 0 || royalty > 1000)
          ? 'Enter the royalty in basis points, from 0 to 1000.'
          : undefined,
    }),
    [draft, bottles, vintage, size, royalty],
  );

  const complete =
    draft.name.trim() !== '' &&
    bottles !== null &&
    bottles > 0 &&
    size !== null &&
    size > 0 &&
    Number.isInteger(royalty) &&
    royalty >= 0 &&
    royalty <= 1000;

  const blocked = !isConnected
    ? 'Connect the wallet that will own this lot.'
    : !participant.data?.wineryClaim
      ? 'This wallet does not carry the winery claim, so the token contract would reject the lot. Take the Winery role on the readiness screen.'
      : !complete
        ? 'Fill in the name, the bottle count, the bottle size and the royalty.'
        : undefined;

  return (
    <FocusedShell
      title="Create a lot"
      step={`Step ${step + 1} of ${STEPS.length}`}
      unsaved={touched}
      onClose={() => navigate('/app/winery/lots')}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <StepIndicator steps={STEPS} current={step} />

        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
          <div
            key={step}
            data-tour="create-lot-form"
            className="step-enter min-w-0 space-y-8"
          >
            {step === 0 ? (
              <>
                <h2 className="t-h1">The wine</h2>
                <p className="max-w-reading text-body-sm text-ink-secondary">
                  A lot is one batch of wine. What you enter here is what a buyer reads first.
                </p>
                <Field
                  label="Lot name"
                  required
                  error={touched ? errors.name : undefined}
                  hint="For example “A1353 Limousis 2022”. Up to 44 characters reads well everywhere."
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      value={draft.name}
                      onChange={(event) => set('name', event.target.value)}
                      autoComplete="off"
                    />
                  )}
                </Field>
                <Field label="Appellation or region" hint="For example “Cabardès AOP”.">
                  {(props) => (
                    <TextInput
                      {...props}
                      value={draft.region}
                      onChange={(event) => set('region', event.target.value)}
                      autoComplete="off"
                    />
                  )}
                </Field>
                <Field
                  label="Grapes"
                  hint="For example “Grenache Noir · Syrah”. Recorded on Base with the lot."
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      value={draft.grapes}
                      onChange={(event) => set('grapes', event.target.value)}
                      autoComplete="off"
                    />
                  )}
                </Field>
                <Field label="Vintage" error={touched ? errors.vintage : undefined} hint="The harvest year.">
                  {(props) => (
                    <TextInput
                      {...props}
                      inputMode="numeric"
                      value={draft.vintage}
                      onChange={(event) => set('vintage', event.target.value)}
                      className="tabular-nums"
                    />
                  )}
                </Field>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h2 className="t-h1">Quantity</h2>
                <Field
                  label="Total bottles in this lot"
                  required
                  error={touched ? errors.totalBottles : undefined}
                  hint="Fixed once the lot is created: minting is capped by it and it cannot be raised later."
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      inputMode="numeric"
                      value={draft.totalBottles}
                      onChange={(event) => set('totalBottles', event.target.value)}
                      className="tabular-nums"
                    />
                  )}
                </Field>
                <Field
                  label="Bottle size"
                  required
                  error={touched ? errors.bottleSizeMl : undefined}
                  hint="Millilitres. Prices and quantities are always per whole bottle."
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      inputMode="numeric"
                      value={draft.bottleSizeMl}
                      onChange={(event) => set('bottleSizeMl', event.target.value)}
                      className="tabular-nums"
                    />
                  )}
                </Field>
                <Callout tone="warning">
                  {bottles
                    ? `Total bottles: ${formatCount(bottles)}. This is fixed once the lot is created.`
                    : 'The bottle count is fixed once the lot is created.'}
                </Callout>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h2 className="t-h1">Terms</h2>
                <p className="max-w-reading text-body-sm text-ink-secondary">
                  These become part of the lot record on Base.
                </p>
                <Field
                  label="Producer royalty on resale"
                  required
                  error={touched ? errors.royaltyBps : undefined}
                  hint={`Basis points. ${
                    Number.isInteger(royalty) ? `${draft.royaltyBps} bps = ${formatBps(royalty)}` : '250 bps = 2.50%'
                  } of every secondary sale, paid to you automatically. The contract caps this at 1000 bps.`}
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      inputMode="numeric"
                      value={draft.royaltyBps}
                      onChange={(event) => set('royaltyBps', event.target.value)}
                      className="tabular-nums"
                    />
                  )}
                </Field>

                <fieldset className="space-y-2">
                  <legend className="text-body-sm font-medium">Export eligibility</legend>
                  <label className="flex items-start gap-3 rounded-lg border border-edge-strong p-4">
                    <input
                      type="checkbox"
                      checked={draft.exportAllowed}
                      onChange={(event) => set('exportAllowed', event.target.checked)}
                      className="mt-1 size-4 accent-[var(--color-accent)]"
                    />
                    <span>
                      <span className="block text-body">This lot may be exported</span>
                      <span className="mt-1 block text-body-sm text-ink-secondary">
                        A single flag, which is all the contract stores. A per-market list (EU, UK,
                        CH) has no on-chain representation, so this interface does not offer one.
                        It is not a completed import or export check either way.
                      </span>
                    </span>
                  </label>
                </fieldset>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h2 className="t-h1">Evidence</h2>
                <p className="max-w-reading text-body-sm text-ink-secondary">
                  Verification happens off this screen. You send your production documents to the
                  operator, who reviews them and records their hash on Base with the lot. The files
                  themselves are never published.
                </p>
                <Callout tone="info">
                  Creating the lot puts it in <strong>Draft</strong>. It cannot be offered for sale
                  until an operator verifies it.
                </Callout>
                <Field
                  label="Metadata URI"
                  hint="Optional. A link to your own description or images, stored with the lot on Base. Leave it empty if you do not have one."
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      value={draft.metadataURI}
                      onChange={(event) => set('metadataURI', event.target.value)}
                      placeholder="https://"
                      autoComplete="url"
                    />
                  )}
                </Field>
              </>
            ) : null}

            {/* The tour anchors the whole action row, not the final button: a
                four-step wizard has no Create button until the last step, and a
                step pointing at something that does not exist yet is a dead
                tour. */}
            <div
              data-tour="create-lot-submit"
              className="flex flex-wrap items-center justify-between gap-4 border-t border-edge-subtle pt-6"
            >
              {step > 0 ? (
                <Button kind="ghost" onClick={() => goto(step - 1)}>
                  ← Back to {STEPS[step - 1]}
                </Button>
              ) : (
                <span />
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={() => goto(step + 1)}>Continue to {STEPS[step + 1]}</Button>
              ) : (
                <Button disabled={Boolean(blocked)} onClick={() => setReviewing(true)}>
                  Create the lot
                </Button>
              )}
            </div>

            {step === STEPS.length - 1 && blocked ? (
              <p className="text-body-sm text-ink-secondary">{blocked}</p>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <p className="t-caption text-ink-secondary">So far</p>
              <dl className="mt-4 space-y-3">
                <Row label="Wine" value={draft.name || '—'} />
                <Row label="Vintage" value={draft.vintage || '—'} />
                <Row label="Region" value={draft.region || '—'} />
                <Row label="Grapes" value={draft.grapes || '—'} />
                <Row label="Total bottles" value={bottles ? formatCount(bottles) : '—'} />
                <Row label="Bottle size" value={size ? `${formatCount(size)} ml` : '—'} />
                <Row
                  label="Royalty"
                  value={Number.isInteger(royalty) ? `${draft.royaltyBps} bps` : '—'}
                />
                <Row label="Export" value={draft.exportAllowed ? 'Eligible' : 'Not marked'} />
              </dl>
              <p className="mt-4 text-body-sm text-ink-secondary">
                Each step is its own address, so refreshing or going back does not lose what you
                entered.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <ActionReview
        open={reviewing}
        onClose={() => {
          setReviewing(false);
          tx.reset();
        }}
        title="Create this lot"
        object={
          <div className="space-y-1">
            <p className="text-body font-medium">{draft.name}</p>
            <p className="text-body-sm text-ink-secondary tabular-nums">
              {[
                draft.vintage,
                draft.region,
                bottles ? `${formatCount(bottles)} bottles` : null,
                size ? `${formatCount(size)} ml` : null,
                `royalty ${draft.royaltyBps} bps`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        }
        consequence={
          <>
            <p>
              The lot is created on Base in Draft, owned by {address ? address.slice(0, 6) : 'your'}…
              — the bottle count is fixed from this moment.
            </p>
            <p className="mt-2">
              An operator then verifies it. You cannot publish an offer until they do.
            </p>
          </>
        }
        steps={[
          {
            id: 'create',
            label: 'Create the lot',
            required: true,
            run: () =>
              tx.send({
                address: CONTRACTS.wineLotToken,
                abi: wineLotTokenAbi,
                functionName: 'createLot',
                args: [
                  {
                    totalBottles: bottles!,
                    vintage: Number.isInteger(vintage) ? vintage : 0,
                    royaltyBps: royalty,
                    bottleSizeMl: size!,
                    exportAllowed: draft.exportAllowed,
                    name: draft.name.trim(),
                    region: draft.region.trim(),
                    grapes: draft.grapes.trim(),
                    metadataURI: draft.metadataURI.trim(),
                  },
                ],
              }),
            tx,
          },
        ]}
        blocked={blocked}
        onDone={() => {
          try {
            localStorage.removeItem(DRAFT_KEY);
          } catch {
            // ignore
          }
          window.setTimeout(() => navigate('/app/winery/lots'), 1400);
        }}
      />
    </FocusedShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="text-body-sm text-ink-secondary">{label}</dt>
      <dd className="max-w-[60%] break-words text-right text-body-sm font-medium">{value}</dd>
    </div>
  );
}
