import { requestDrawerIfCompact } from '../engine/shell';
import type { TourDefinition } from '../engine/types';

/** Reserve, settle, take delivery — and what the two-step approval is for. */
const shop: TourDefinition = {
  id: 'shop',
  role: 'shop',
  title: 'Shop',
  summary: 'Reserve an allocation, settle it, take delivery.',
  stepsLabel: '7 steps',
  modes: ['sim', 'live'],
  steps: [
    {
      id: 'overview',
      route: '/app/shop',
      anchor: 'shop.overview.header',
      spotlight: 'region',
      title: 'Your cabinet',
      body: 'What you have reserved, what you owe, and what is on its way to you.',
      advance: { kind: 'next' },
    },
    {
      id: 'market',
      anchor: 'nav.shop.market',
      mobileAnchor: 'tab.shop.market',
      placement: 'right',
      title: 'What is on offer',
      body: 'Press it. Only verified lots reach the market, and every offer names its producer.',
      advance: { kind: 'route', path: '/app/shop/market' },
      onEnter: requestDrawerIfCompact,
    },
    {
      id: 'offers',
      route: '/app/shop/market',
      anchor: 'shop.market.list',
      spotlight: 'region',
      title: 'Two kinds of offer',
      body: 'A current release is paid in full. En Primeur takes a deposit now and the rest by a deadline the offer states.',
      advance: { kind: 'next' },
    },
    {
      id: 'reserve',
      route: '/app/shop/market',
      anchor: 'shop.market.reserve',
      placement: 'bottom-end',
      title: 'Reserve bottles',
      body: 'Press it. The next screen shows the fee, the deposit and the deadline before anything is signed.',
      advance: { kind: 'route', path: '/app/shop/reserve' },
    },
    {
      id: 'review',
      routeScope: '/app/shop/reserve',
      anchor: 'shop.reserve.review',
      spotlight: 'passive',
      title: 'Approve, then reserve',
      body: 'Two writes in one review: the first lets the market move your EURC, the second takes the bottles. Run them.',
      advance: { kind: 'event', event: 'allocation.reserved' },
    },
    {
      id: 'allocations',
      route: '/app/shop/market',
      anchor: 'nav.shop.allocations',
      mobileAnchor: 'tab.shop.allocations',
      placement: 'right',
      title: 'Your allocations',
      body: 'Press it. This is the ledger of what you have reserved and what is still due.',
      advance: { kind: 'route', path: '/app/shop/allocations' },
      onEnter: requestDrawerIfCompact,
    },
    {
      id: 'settle',
      route: '/app/shop/allocations',
      anchor: 'shop.allocations.table',
      spotlight: 'region',
      title: 'Settling and delivery',
      body: 'Pay the remainder from an allocation. Delivery is requested separately, from the bottles you hold in Portfolio.',
      advance: { kind: 'next' },
    },
  ],
  completion: {
    title: 'You reserved and settled an allocation',
    learned: [
      'Only verified lots reach the market.',
      'Approving EURC and reserving bottles are two writes, shown in one review before either is sent.',
      'Bottles arrive in your portfolio; delivery is a separate request against them.',
    ],
    next: { label: 'Do this for real on Base Sepolia', to: '/app/testnet' },
  },
};

export default shop;
