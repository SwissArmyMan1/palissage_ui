import type { TourDefinition } from '../engine/types';

/**
 * The shortest cabinet, and the one whose lesson is a limit: a collector holds
 * and reads, and deliberately cannot buy.
 */
const collector: TourDefinition = {
  id: 'collector',
  role: 'collector',
  title: 'Collector',
  summary: 'Read what you hold, and what a collector deliberately cannot do.',
  stepsLabel: '4 steps',
  modes: ['sim', 'live'],
  steps: [
    {
      id: 'shelf',
      route: '/app/collector',
      anchor: 'collector.shelf',
      spotlight: 'region',
      title: 'Your shelf',
      body: 'One card per lot you hold. The count is read from the token contract, not from an account we keep.',
      advance: { kind: 'next' },
    },
    {
      id: 'passport',
      anchor: 'collector.shelf',
      spotlight: 'region',
      title: 'Every bottle has a passport',
      body: 'A passport opens from a card, and it opens for anyone with the link — no wallet, no account.',
      advance: { kind: 'next' },
    },
    {
      id: 'limits',
      anchor: 'collector.limits',
      spotlight: 'region',
      title: 'What a collector cannot do',
      body: 'Both markets require a B2B claim, so a collector wallet holds and reads but does not buy. That is a rule in the contract, not a screen we hid.',
      advance: { kind: 'next' },
    },
    {
      id: 'redeem',
      anchor: 'collector.shelf',
      spotlight: 'region',
      title: 'Asking for the bottles',
      body: 'Redemption turns a holding into a shipment. The winery ships it and the token is burned on delivery.',
      advance: { kind: 'next' },
    },
  ],
  completion: {
    title: 'You know what a collector holds',
    learned: [
      'A shelf is read from the token contract, not from an account Palissage keeps.',
      'A bottle passport is public — it needs no wallet at all.',
      'Buying needs a B2B claim, so a collector holds and reads but does not trade.',
    ],
    next: { label: 'Read a bottle passport', to: '/lots' },
  },
};

export default collector;
