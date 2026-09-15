import type { TourDefinition } from '../engine/types';

/**
 * The flagship. It exists to show one thing that no single screen can: a lot is
 * created by the winery and verified by somebody else.
 */
const winery: TourDefinition = {
  id: 'winery',
  role: 'winery',
  title: 'Winery',
  summary: 'Create a lot, watch an operator verify it, publish an offer.',
  stepsLabel: '8 steps',
  modes: ['sim', 'live'],
  steps: [
    {
      id: 'overview',
      route: '/app/winery',
      anchor: 'winery.overview.header',
      spotlight: 'region',
      title: 'Your cabinet',
      body: 'Everything this wallet may do sits behind these four sections.',
      advance: { kind: 'next' },
    },
    {
      id: 'open-lots',
      anchor: 'nav.winery.lots',
      mobile: { anchor: 'tab.winery.lots' },
      placement: 'right',
      title: 'Open your lots',
      body: 'Press it. A lot is one barrel or one bottling, recorded on Base before anything can be sold against it.',
      advance: { kind: 'route', path: '/app/winery/lots' },
    },
    {
      id: 'lots-table',
      route: '/app/winery/lots',
      anchor: 'winery.lots.table',
      placement: 'top-start',
      spotlight: 'region',
      title: 'Draft and verified',
      body: 'A draft lot is yours alone. Nothing can be offered against it until an operator has verified it.',
      advance: { kind: 'next' },
    },
    {
      id: 'create',
      route: '/app/winery/lots',
      anchor: 'winery.lots.create',
      placement: 'bottom-end',
      title: 'Record a new lot',
      body: 'Press it. The next screen is the only place bottle count, vintage and royalty are set.',
      advance: { kind: 'route', path: '/app/winery/lots/new' },
    },
    {
      id: 'form',
      route: '/app/winery/lots/new',
      anchor: 'createLot.form',
      placement: 'right',
      spotlight: 'passive',
      title: 'What is on the chain',
      body: 'Bottle count and size are fixed at creation. The tasting note is not on the chain — it is editorial, and the interface says so.',
      advance: { kind: 'next' },
    },
    {
      id: 'submit',
      route: '/app/winery/lots/new',
      anchor: 'createLot.submit',
      placement: 'top',
      spotlight: 'passive',
      title: 'Create the lot',
      body: 'Four short steps, then Create the lot. The tour waits here until the lot exists on the chain.',
      advance: { kind: 'event', event: 'lot.created' },
    },
    {
      id: 'review',
      route: '/app/winery/lots',
      routeMatch: 'exact',
      anchor: 'winery.lots.table',
      placement: 'top-start',
      spotlight: 'region',
      title: 'Somebody else verifies it',
      body: 'Your new lot is a draft. Palissage Operations holds the verifier role on the token — a winery cannot verify its own wine. Wait here.',
      advance: { kind: 'event', event: 'lot.verified' },
    },
    {
      id: 'finance',
      route: '/app/winery/lots',
      routeMatch: 'exact',
      anchor: 'nav.winery.finance',
      mobile: { anchor: 'tab.winery.finance' },
      placement: 'right',
      title: 'Where the money lands',
      body: 'Press it. Buyers pay into the market, and Finance shows what has been released to you and what is still held.',
      advance: { kind: 'route', path: '/app/winery/finance' },
    },
  ],
  completion: {
    title: 'You ran a lot from cellar to offer',
    learned: [
      'A lot is written to the token contract before anyone can buy against it.',
      'An operator verifies the lot — the winery that created it cannot.',
      'Buyers pay the market, not you; Finance shows what has been released.',
    ],
    next: { label: 'Do this for real on Base Sepolia', to: '/app/testnet' },
  },
};

export default winery;
