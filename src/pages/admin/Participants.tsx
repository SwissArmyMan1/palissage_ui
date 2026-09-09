import { useState } from 'react';
import { isAddress } from 'viem';
import { CircleCheck, CircleMinus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Field, Select, TextInput } from '@/components/ui/Field';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddressValue, ExplorerLink, Mono } from '@/components/ui/Mono';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ActionReview } from '@/components/patterns/ActionReview';
import { useParticipant } from '@/chain/lens';
import { useCapabilities } from '@/chain/roles';
import { roleGatewayAbi } from '@/chain/abis';
import { CONTRACTS } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { GATEWAY_ROLE } from '@/lib/enums';

const ROLE_OPTIONS = [
  { value: '1', label: 'Admin — operations' },
  { value: '2', label: 'Winery — issues KYC and the winery claim' },
  { value: '3', label: 'Shop — issues KYC and the B2B buyer claim' },
  { value: '4', label: 'Collector — issues KYC only' },
];

/**
 * ADM-02 and ADM-03.
 *
 * There is no participant index on-chain: the registry answers about a wallet
 * you name, and the read model has no "list every participant" call. So this
 * screen looks a wallet up rather than pretending to enumerate them — a list
 * would have to come from an indexer this interface deliberately does not run.
 */
export default function AdminParticipants() {
  const caps = useCapabilities();
  const [input, setInput] = useState('');
  const [role, setRole] = useState('3');
  const [assigning, setAssigning] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const valid = isAddress(input.trim());
  const target = valid ? (input.trim() as `0x${string}`) : undefined;
  const participant = useParticipant(target);
  const p = participant.data;

  return (
    <CabinetPage>
      <PageHeader
        title="Participants"
        lede="Look up a wallet's registry state, its claims and the roles each contract grants it."
      />

      <div className="mt-8 max-w-xl">
        <Field
          label="Wallet address"
          error={input !== '' && !valid ? 'Enter a full 42-character wallet address, starting 0x.' : undefined}
          hint="The registry answers about a wallet you name. This interface does not run an indexer, so it cannot list every participant."
        >
          {(props) => (
            <TextInput
              {...props}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="0x…"
              autoComplete="off"
              className="t-mono"
              invalid={input !== '' && !valid}
            />
          )}
        </Field>
      </div>

      {target && p ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="card p-6" aria-labelledby="registry-heading">
            <h2 id="registry-heading" className="t-h3">
              Registry
            </h2>
            <dl className="mt-4 space-y-3">
              <Row label="Wallet" value={<AddressValue address={target} label="wallet" />} />
              <Row
                label="Identity contract"
                value={
                  p.identity !== '0x0000000000000000000000000000000000000000' ? (
                    <AddressValue address={p.identity} label="identity contract" />
                  ) : (
                    <Mono>none</Mono>
                  )
                }
              />
              <Row label="Registered" value={<Mono>{p.registered ? 'yes' : 'no'}</Mono>} />
              <Row label="Verified" value={<Mono>{p.isVerified ? 'yes' : 'no'}</Mono>} />
              <Row label="Gateway role" value={<Mono>{GATEWAY_ROLE[p.gatewayRole]}</Mono>} />
              <Row label="Can receive bottles" value={<Mono>{p.canReceive ? 'yes' : 'no'}</Mono>} />
              <Row label="Can send bottles" value={<Mono>{p.canSend ? 'yes' : 'no'}</Mono>} />
            </dl>
            <ExplorerLink address={target} className="mt-4">
              This wallet on Base
            </ExplorerLink>
          </section>

          <section className="card p-6" aria-labelledby="claims-heading">
            <h2 id="claims-heading" className="t-h3">
              Claims and roles
            </h2>
            <ul className="mt-4 space-y-2">
              <Flag on={p.kyc} label="KYC claim" />
              <Flag on={p.b2bClaim} label="B2B buyer claim" />
              <Flag on={p.wineryClaim} label="Winery claim" />
              <Flag on={p.kyb} label="KYB attestation (not enforced by any contract)" />
              <Flag on={p.tokenVerifier} label="Token verifier role" />
              <Flag on={p.primaryVerifier} label="Primary market verifier role" />
              <Flag on={p.redemptionVerifier} label="Redemption verifier role" />
              <Flag on={p.tokenEnforcer} label="Token enforcer role" />
              <Flag on={p.gatewayAdmin} label="Gateway admin" />
            </ul>
          </section>

          <section className="card p-6 lg:col-span-2" aria-labelledby="assign-heading">
            <h2 id="assign-heading" className="t-h3">
              Set this wallet’s role
            </h2>
            <p className="mt-2 max-w-reading text-body-sm text-ink-secondary">
              Assigning a role provisions an identity contract for the wallet and issues the claims
              that role needs. One role per wallet: assigning a new one removes the previous role’s
              claims.
            </p>

            <div className="mt-4 flex flex-wrap items-end gap-4">
              <Field label="Role" className="min-w-64">
                {(props) => (
                  <Select {...props} value={role} onChange={(event) => setRole(event.target.value)}>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Button disabled={!caps.canAssignRoles} onClick={() => setAssigning(true)}>
                Assign the role
              </Button>
              {p.gatewayRole !== 0 ? (
                <Button kind="danger" disabled={!caps.canAssignRoles} onClick={() => setRevoking(true)}>
                  Revoke the role
                </Button>
              ) : null}
            </div>

            {!caps.canAssignRoles ? (
              <Callout tone="warning" className="mt-4 max-w-none">
                Assigning and revoking roles is restricted to a gateway admin. This wallet is not
                one, so the gateway would reject the write.
              </Callout>
            ) : (
              <Callout tone="info" className="mt-4 max-w-none">
                Admin is the one role that cannot be self-assigned in the sandbox, because it
                carries the verifier role on the token. Granting it here is the intended path.
              </Callout>
            )}
          </section>
        </div>
      ) : target && participant.isLoading ? (
        <p className="mt-8 text-body-sm text-ink-secondary" role="status">
          Reading the registry…
        </p>
      ) : null}

      {assigning && target ? (
        <AssignDialog target={target} role={role} onClose={() => setAssigning(false)} />
      ) : null}

      {revoking && target ? (
        <RevokeDialog target={target} onClose={() => setRevoking(false)} />
      ) : null}
    </CabinetPage>
  );
}

function AssignDialog({
  target,
  role,
  onClose,
}: {
  target: `0x${string}`;
  role: string;
  onClose: () => void;
}) {
  const tx = useTx();
  return (
    <ActionReview
      open
      onClose={onClose}
      title="Assign this role"
      object={
        <div className="space-y-1">
          <p className="t-mono break-all">{target}</p>
          <p className="text-body-sm text-ink-secondary">
            {ROLE_OPTIONS.find((option) => option.value === role)?.label}
          </p>
        </div>
      }
      consequence={
        <p>
          The gateway provisions an identity for this wallet, registers it and issues the role’s
          claims. Any claims from a previous role are removed.
        </p>
      }
      steps={[
        {
          id: 'assign',
          label: 'Assign the role',
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.roleGateway,
              abi: roleGatewayAbi,
              functionName: 'assignRole',
              args: [target, Number(role)],
            }),
          tx,
        },
      ]}
    />
  );
}

function RevokeDialog({ target, onClose }: { target: `0x${string}`; onClose: () => void }) {
  const tx = useTx();
  return (
    <ActionReview
      open
      onClose={onClose}
      destructive
      title="Revoke this wallet’s role"
      object={<p className="t-mono break-all">{target}</p>}
      consequence={
        <p>
          The role and its claims are removed. The wallet can no longer receive bottles, and any
          action that needs a claim will be rejected by the contracts.
        </p>
      }
      steps={[
        {
          id: 'revoke',
          label: 'Revoke the role',
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.roleGateway,
              abi: roleGatewayAbi,
              functionName: 'revokeRole',
              args: [target],
            }),
          tx,
        },
      ]}
    />
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <dt className="w-48 shrink-0 text-body-sm text-ink-secondary">{label}</dt>
      <dd className="min-w-0">{value}</dd>
    </div>
  );
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3 text-body-sm">
      {on ? (
        <CircleCheck aria-hidden className="size-4 shrink-0 text-success" strokeWidth={1.75} />
      ) : (
        <CircleMinus aria-hidden className="size-4 shrink-0 text-ink-secondary" strokeWidth={1.75} />
      )}
      <span className={on ? undefined : 'text-ink-secondary'}>{label}</span>
      {on ? <StatusBadge tone="success" className="ml-auto">Held</StatusBadge> : null}
    </li>
  );
}
