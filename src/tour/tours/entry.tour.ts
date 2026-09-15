import type { TourDefinition } from '../engine/types';

/**
 * The shortest tour: what a role is, and what the readiness screen is telling
 * you. It is the one a stranger runs first, so it never asks for a signature.
 */
const entry: TourDefinition = {
  id: 'entry',
  role: null,
  title: 'Getting in',
  summary: 'What a role is, and what the three readiness checks actually mean.',
  stepsLabel: '4 steps',
  modes: ['sim', 'live'],
  steps: [
    {
      id: 'roles',
      route: '/app',
      anchor: 'app.roleCards',
      spotlight: 'region',
      title: 'Four cabinets, one wallet',
      body: 'Which one opens is not a setting. It is read from the role gateway and the identity claims on Base.',
      advance: { kind: 'next' },
    },
    {
      id: 'standing',
      anchor: 'app.roleCards',
      spotlight: 'region',
      title: 'What each card says',
      body: 'A card tells you whether this wallet could actually do the work, not just whether the screen will open.',
      advance: { kind: 'next' },
    },
    {
      id: 'readiness',
      anchor: 'app.readinessLink',
      placement: 'bottom',
      title: 'Check what is ready',
      body: 'Press it. Three independent checks: the deployment, this wallet, and what it is allowed to do.',
      advance: { kind: 'route', path: '/app/testnet' },
    },
    {
      id: 'wallet-check',
      route: '/app/testnet',
      anchor: 'testnet.wallet',
      spotlight: 'region',
      title: 'Gas and EURC are separate',
      body: 'A wallet with no EURC can still reach the faucet, which is why these are shown as two facts and not one.',
      advance: { kind: 'next' },
    },
  ],
  completion: {
    title: 'You know what a role is',
    learned: [
      'A cabinet opens for anyone, but every action re-reads what the wallet may actually do.',
      'Operations is never self-assigned — it carries the verifier role on the token.',
      'Gas and the settlement asset are separate balances, and the readiness screen says which is missing.',
    ],
    next: { label: 'Choose a cabinet', to: '/app' },
  },
};

export default entry;
