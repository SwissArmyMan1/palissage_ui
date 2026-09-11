/**
 * Public-site copy, based on specifications/ui-v2/07-content-and-copy.md
 * section 6, with a direct-trade lead for the editorial landing page.
 * English is authoritative. The honesty rules in section 1 of that
 * document are what make this a fixed asset rather than placeholder text: no
 * investment language, no unmeasured metric, no "partner" without an agreement.
 */

export const LANDING = {
  eyebrow: 'Cabardès, southern France',
  h1: 'Good wine. Direct from the source.',
  lede:
    'Buy directly from independent wineries. A shorter path means better prices for your business and more value for the people who make the wine. Discover bottled wines, or secure a vintage still on the vine.',
  ctaPrimary: 'Explore the lots',
  ctaSecondary: 'Try the demo — no wallet needed',

  lifecycleTitle: 'One lot, from the vine to the shelf.',
  lifecycleLede: 'Every lot follows the same path. What changes is where you join it.',

  audiencesTitle: 'Two sides of the same trade.',
  audiences: [
    {
      title: 'For producers',
      body:
        'Sell direct at your price. Finance the vintage with advance purchases instead of a loan. Keep a royalty when an allocation is resold.',
      cta: 'For wineries',
      to: '/for-wineries',
    },
    {
      title: 'For shops and importers',
      body:
        'Buy closer to the source, at terms you can see. Secure next year’s inventory before it is allocated elsewhere. Resell what you no longer need.',
      cta: 'For buyers',
      to: '/for-buyers',
    },
  ],

  marginTitle: 'The same margin, shared differently.',
  marginLede:
    'A 10 000-bottle lot, sold direct at €7.20 instead of through a distributor at €8.57.',
  marginTiles: [
    { label: 'The shop pays less', value: 13700 },
    { label: 'The producer receives more', value: 9840 },
    { label: 'Protocol fee', value: 2160 },
  ],
  marginFootnote:
    'An illustration using the demo lot’s figures, not measured platform activity. Shipping, duties and taxes are not included.',

  trustTitle: 'What “verified” actually means here.',
  trust: [
    {
      title: 'Every lot is checked before it can be sold.',
      body:
        'An operator reviews the producer’s documents and records their hash on Base. The lot page shows who checked it, when, and against which documents.',
    },
    {
      title: 'Only qualified businesses can hold a lot.',
      body:
        'Transfers are restricted at the contract level. A buyer who is not verified cannot receive bottles — the interface will not let a sale start that the contract would reject.',
    },
    {
      title: 'Money is released against confirmed production.',
      body:
        'Buyer payments sit in escrow. Each production milestone a verifier confirms releases the share of the payment agreed in the offer.',
    },
    {
      title: 'Bottles are burned on delivery.',
      body:
        'When a buyer confirms they received the wine, the matching bottles are destroyed on-chain. What remains on-chain matches what remains in the cellar.',
    },
  ],

  stageTitle: 'Where the project is.',
  stageBody:
    'The contracts are written, tested and deployed to Base Sepolia. The interface runs against that deployment. No real wine has been traded and no real money has settled. We are preparing a closed pilot with producers in the Cabardès, in the south of France.',
  stageCta: 'Talk to us about the pilot',

  footerMotto: 'The trellis that carries the vine — and the structure that carries the trade.',
} as const;

export const CATALOGUE = {
  title: 'Lots open now',
  lede:
    'Verified lots from producers in the Cabardès. Prices are per 750 ml bottle, with the protocol fee shown before you commit.',
  emptyFirstRunTitle: 'No lots are published yet.',
  emptyFirstRunBody: 'Producers are being onboarded for the first pilot.',
  emptyFirstRunCta: 'Are you a producer?',
  emptyFilteredTitle: 'No lots match these filters.',
} as const;

export const FOR_WINERIES = {
  title: 'Get paid before the wine leaves the cellar.',
  lede:
    'Production costs money now; the wine sells later. Palissage lets buyers pay for part of a vintage in advance, so a share of the revenue arrives while the wine is still ageing.',
  steps: [
    { title: 'Publish a lot.', body: 'Describe the batch, attach your documents, get it verified.' },
    { title: 'Set your terms.', body: 'Price, quantity, and how much a buyer pays up front.' },
    {
      title: 'Choose your milestones.',
      body:
        'Harvest, vinification, bottling — you decide which confirmed steps release which share of the payment.',
    },
    { title: 'Get paid as you go.', body: 'Money moves as production is confirmed, not all at the end.' },
    {
      title: 'Keep earning on resale.',
      body: 'When a buyer resells an allocation, a royalty you set returns to you.',
    },
  ],
  closing: 'You keep your customer relationship. Palissage is the channel, not the buyer.',
} as const;

export const FOR_BUYERS = {
  title: 'Buy closer to the source, on terms you can see.',
  lede:
    'Every lot on Palissage is verified before it is sold, priced per bottle, and settled in a euro stablecoin on Base.',
  points: [
    {
      title: 'Every lot is verified before it is sold',
      body: 'with the documents and the verification date on the page.',
    },
    { title: 'Prices are per bottle, with the fee shown', body: 'before you commit.' },
    { title: 'Deadlines are dates, not surprises.', body: 'What you owe and when is on your allocation.' },
    {
      title: 'Reserve next year’s stock now.',
      body: 'En Primeur lets you secure a vintage at a fixed price before it is allocated elsewhere.',
    },
    {
      title: 'Resell what you no longer need',
      body: 'to other qualified buyers, with the producer’s royalty handled automatically.',
    },
    {
      title: 'Ask for the bottles when you want them.',
      body: 'Delivery opens when the producer marks the lot ready.',
    },
  ],
} as const;

export const HOW_IT_WORKS = {
  title: 'How a lot becomes bottles in your cellar.',
  lede:
    'The same seven stages carry every lot. This page follows one from the producer’s description to the moment the bottles are burned on delivery.',
  chapters: [
    {
      title: 'The producer describes the batch',
      body:
        'A lot is one batch of wine: a name, an appellation, a vintage, a bottle count and a bottle size. The bottle count is fixed when the lot is created — minting is capped by it and it cannot be raised later.',
    },
    {
      title: 'An operator verifies it',
      body:
        'The producer attaches production documents. An operator reviews them and records their hash on Base together with their own address. Verification records what was checked; it is not a guarantee of quality or legal compliance.',
    },
    {
      title: 'The producer publishes an offer',
      body:
        'An offer sets price per bottle, quantity, the window it is open, and how much a buyer pays at reservation. A current-release offer sells wine that exists. An En Primeur offer sells a vintage that is still on the vine.',
    },
    {
      title: 'A qualified buyer reserves',
      body:
        'Only a wallet carrying the B2B buyer claim can reserve. Payment goes into escrow. Bottles are minted only when the allocation is paid in full — a deposit reserves them, it does not mint them.',
    },
    {
      title: 'Milestones release the money',
      body:
        'The producer defines milestones as shares of the offer in basis points. When a verifier confirms a milestone, that share becomes withdrawable, less the protocol fee.',
    },
    {
      title: 'Bottles can be resold',
      body:
        'A buyer can list bottles they hold to other qualified buyers. The sale price splits into the protocol fee, the producer’s royalty and the seller’s proceeds. The tokens stay in the seller’s wallet until the sale settles.',
    },
    {
      title: 'Delivery burns the bottles',
      body:
        'When the lot reaches Ready for delivery, a holder can request physical delivery. The bottles move into escrow, the producer attaches shipment documents, and the buyer confirms receipt — at which point the bottles are destroyed on-chain.',
    },
  ],
} as const;

export const NETWORK = {
  title: 'What runs on Base.',
  lede:
    'Palissage settles on Base. Base Sepolia today; Base mainnet after an independent security review and pilot preparation.',
  onChain: [
    'Lot issuance and bottle balances',
    'Participant eligibility and transfer restrictions',
    'Primary purchases and stablecoin escrow',
    'Milestone-based release of funds',
    'Secondary sales and producer royalties',
    'Redemption records, and the burn on confirmed delivery',
  ],
  offChain: [
    'Business verification and legal agreements',
    'Private documents — their hashes are on-chain',
    'Physical inspection, storage and shipping',
    'Authorised participants submit the attestations and document hashes that connect these to the on-chain record',
  ],
  whyTitle: 'Why Base',
  whyBody:
    'Low, predictable fees matter when a single lot generates a reservation, a balance payment, a milestone release and a redemption — four transactions per buyer per lot. Stablecoin settlement matters when the two sides are in different countries. And a business that has never held crypto has to be able to complete a purchase without learning what a gas token is.',
  deploymentNote:
    'Rendered from the deployment the interface is reading, never hand-typed.',
  historicalNote:
    'Earlier prototype contracts were deployed to Arbitrum Sepolia. Those addresses are historical and are not the deployment this interface reads.',
} as const;

export const PILOT = {
  title: 'Talk to us about the pilot.',
  lede:
    'We are preparing a closed pilot with a small number of producers and buyers in the Cabardès. If that is you, or you work with them, tell us what you make or what you buy.',
} as const;

export const PASSPORT = {
  disclaimer:
    'This passport describes the lot this bottle came from. It does not prove that this individual bottle is genuine, unopened, or yours.',
  noWallet: 'No wallet or account needed to read this page.',
} as const;

export const MODE_MARKERS = {
  testnet: 'Base Sepolia · test assets only',
  demo: 'Demo · sample data',
} as const;

export const ROADMAP_STRIP =
  'Roadmap — this programme is not implemented. Nothing on this screen is recorded on Base.';
