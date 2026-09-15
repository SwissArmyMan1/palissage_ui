import { requestDrawerIfCompact } from '../engine/shell';
import type { TourDefinition } from '../engine/types';

/** The operator gates the wine, never the money. That is the whole lesson. */
const admin: TourDefinition = {
  id: 'admin',
  role: 'admin',
  title: 'Operations',
  summary: 'Verify a lot, release a milestone, follow a redemption.',
  stepsLabel: '6 steps',
  modes: ['sim', 'live'],
  steps: [
    {
      id: 'queues',
      route: '/app/admin',
      anchor: 'admin.queues.list',
      spotlight: 'region',
      title: 'What is waiting on you',
      body: 'Everything an operator decides is queued here: lots to review, milestones to confirm, redemptions in flight.',
      advance: { kind: 'next' },
    },
    {
      id: 'open-lots',
      anchor: 'nav.admin.lots',
      mobile: { anchor: 'tab.admin.lots' },
      placement: 'right',
      title: 'Lots to verify',
      body: 'Press it. Verifying a lot is what lets a winery offer it — nothing else in the system does.',
      advance: { kind: 'route', path: '/app/admin/lots' },
    },
    {
      id: 'verify',
      // The lots screen and a lot opened from it are the same screen with a
      // record showing, which prefix matching already covers.
      route: '/app/admin/lots',
      anchor: 'admin.lots.verify',
      placement: 'bottom-start',
      spotlight: 'passive',
      title: 'Verify the lot',
      body: 'Open a lot that is waiting, then run Verify. You are attesting to its documents: their hash goes on the chain with your address.',
      advance: { kind: 'event', event: 'lot.verified' },
      /**
       * Not a limitation of the tour. Below `lg` this screen deliberately
       * offers the queue and withholds the decision, because reviewing evidence
       * about other people's money on a phone produces bad decisions. Saying so
       * is the lesson here; pointing at a button that is not there would not be.
       */
      mobile: {
        anchor: 'admin.lots.smallScreenNote',
        body: 'Not on a phone, on purpose. The queue is readable here, but the decision is kept to a larger screen — evidence about other people’s money deserves one.',
        advance: { kind: 'next' },
      },
    },
    {
      id: 'milestones',
      route: '/app/admin/lots',
      anchor: 'nav.admin.milestones',
      placement: 'right',
      title: 'Milestones hold the money',
      body: 'Press it. En Primeur money is released in tranches, and each tranche waits on an operator confirming a real event.',
      advance: { kind: 'route', path: '/app/admin/milestones' },
      onEnter: requestDrawerIfCompact,
    },
    {
      id: 'confirm',
      route: '/app/admin/milestones',
      anchor: 'admin.milestones.confirm',
      spotlight: 'region',
      title: 'What confirming does',
      body: 'Confirming releases a share of what buyers have already paid. It never moves money to you, only to the winery.',
      advance: { kind: 'next' },
    },
    {
      id: 'redemptions',
      route: '/app/admin/milestones',
      anchor: 'nav.admin.redemptions',
      placement: 'right',
      title: 'Deliveries in flight',
      body: 'Press it. Operations sees every redemption but ships none of them — the winery does, and disputes come back here.',
      advance: { kind: 'route', path: '/app/admin/redemptions' },
      onEnter: requestDrawerIfCompact,
    },
  ],
  completion: {
    title: 'You gated a lot without touching the money',
    learned: [
      'Verifying a lot is the only thing that lets it be offered.',
      'Confirming a milestone releases buyers’ money to the winery, never to Operations.',
      'Operations can see a redemption and resolve a dispute, but the winery ships it.',
    ],
    next: { label: 'Do this for real on Base Sepolia', to: '/app/testnet' },
  },
};

export default admin;
