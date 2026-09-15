/**
 * Every anchor a tour can point at, as a symbolic id.
 *
 * The values are what goes into `data-tour` in the components. They are
 * deliberately literal strings on both sides — `scripts/check-tour-targets.mjs`
 * greps the source for each one and fails the build when a tour references an
 * id nothing renders, or when an id is rendered but no tour uses it. A CSS
 * selector or an nth-child would survive that check and then break silently the
 * next time someone restyles a screen.
 */
export const TARGETS = {
  // ---- app shell -------------------------------------------------------
  'shell.help': 'shell-help',
  'shell.roleSwitcher': 'shell-role-switcher',
  'shell.wallet': 'shell-wallet',
  'shell.simbar': 'shell-simbar',

  // ---- sidebar / tab bar, per cabinet ----------------------------------
  'nav.winery.overview': 'nav-winery-overview',
  'nav.winery.lots': 'nav-winery-lots',
  'nav.winery.finance': 'nav-winery-finance',
  'nav.winery.deliveries': 'nav-winery-deliveries',
  'tab.winery.overview': 'tab-winery-overview',
  'tab.winery.lots': 'tab-winery-lots',
  'tab.winery.finance': 'tab-winery-finance',
  'tab.winery.deliveries': 'tab-winery-deliveries',

  'nav.shop.overview': 'nav-shop-overview',
  'nav.shop.market': 'nav-shop-market',
  'nav.shop.allocations': 'nav-shop-allocations',
  'nav.shop.portfolio': 'nav-shop-portfolio',
  'nav.shop.secondary': 'nav-shop-secondary',
  'nav.shop.deliveries': 'nav-shop-deliveries',
  'tab.shop.overview': 'tab-shop-overview',
  'tab.shop.market': 'tab-shop-market',
  'tab.shop.allocations': 'tab-shop-allocations',
  'tab.shop.portfolio': 'tab-shop-portfolio',

  'nav.admin.queues': 'nav-admin-queues',
  'nav.admin.participants': 'nav-admin-participants',
  'nav.admin.lots': 'nav-admin-lots',
  'nav.admin.milestones': 'nav-admin-milestones',
  'nav.admin.redemptions': 'nav-admin-redemptions',
  'tab.admin.queues': 'tab-admin-queues',
  'tab.admin.participants': 'tab-admin-participants',
  'tab.admin.lots': 'tab-admin-lots',

  // ---- entry -----------------------------------------------------------
  'app.roleCards': 'app-role-cards',
  'app.readinessLink': 'app-readiness-link',
  'testnet.deployment': 'testnet-deployment',
  'testnet.wallet': 'testnet-wallet',

  // ---- winery ----------------------------------------------------------
  'winery.overview.header': 'winery-overview-header',
  'winery.lots.create': 'winery-lots-create',
  'winery.lots.table': 'winery-lots-table',
  'createLot.form': 'create-lot-form',
  'createLot.submit': 'create-lot-submit',
  'winery.lot.publishOffer': 'winery-lot-publish-offer',
  'winery.finance.withdrawable': 'winery-finance-withdrawable',

  // ---- shop ------------------------------------------------------------
  'shop.overview.header': 'shop-overview-header',
  'shop.market.list': 'shop-market-list',
  'shop.market.reserve': 'shop-market-reserve',
  'shop.reserve.review': 'shop-reserve-review',
  'shop.allocations.table': 'shop-allocations-table',
  'shop.deliveries.request': 'shop-deliveries-request',

  // ---- operations ------------------------------------------------------
  'admin.queues.list': 'admin-queues-list',
  'admin.lots.verify': 'admin-lots-verify',
  'admin.milestones.confirm': 'admin-milestones-confirm',
  'admin.redemptions.list': 'admin-redemptions-list',

  // ---- collector -------------------------------------------------------
  'collector.shelf': 'collector-shelf',
  'collector.limits': 'collector-limits',
} as const;

export type TargetId = keyof typeof TARGETS;

/** The attribute value, for a component that renders an anchor. */
export function targetAttr(id: TargetId): string {
  return TARGETS[id];
}

/** The selector the engine resolves an anchor with. */
export function targetSelector(id: TargetId): string {
  return `[data-tour="${TARGETS[id]}"]`;
}
