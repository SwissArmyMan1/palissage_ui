import {
  Coins,
  FileText,
  LayoutGrid,
  Package,
  ShieldCheck,
  Truck,
  Users,
  Wine,
} from 'lucide-react';
import type { RoleKey } from '@/chain/roles';

/**
 * Sidebar counts per role are inside the 5–15 range the `Sidebar navigation`
 * entry requires; the mobile tab bar carries co-equal destinations only, 3–4 per
 * role, always with labels (doc 01 §4).
 */
export interface NavItem {
  to: string;
  label: string;
  Icon: typeof LayoutGrid;
  /** Shown in the mobile tab bar as well as the sidebar. */
  tab?: boolean;
  end?: boolean;
  /**
   * Guided-tour anchors. Literal strings on purpose: `check-tour-targets.mjs`
   * greps the source for them, and a generated `nav-${role}-${to}` would pass
   * that grep while pointing at nothing.
   */
  tour?: string;
  tourTab?: string;
}

/**
 * Roles that get the sidebar cabinet. Collector is not one of them: it has a
 * single destination, and the `Sidebar navigation` entry's veto is "fewer than
 * four". It runs as a single-column page of its own instead.
 */
export type CabinetRoleKey = Exclude<RoleKey, 'collector'>;

export const ROLE_BASE: Record<RoleKey, string> = {
  winery: '/app/winery',
  shop: '/app/shop',
  admin: '/app/admin',
  collector: '/app/collector',
};

export const ROLE_TITLE: Record<RoleKey, string> = {
  winery: 'Winery',
  shop: 'Shop',
  admin: 'Palissage Operations',
  collector: 'Collector',
};

export const NAV: Record<CabinetRoleKey, NavItem[]> = {
  winery: [
    { to: '', label: 'Overview', Icon: LayoutGrid, tab: true, end: true, tour: 'nav-winery-overview', tourTab: 'tab-winery-overview' },
    { to: 'lots', label: 'Lots', Icon: Wine, tab: true, tour: 'nav-winery-lots', tourTab: 'tab-winery-lots' },
    { to: 'finance', label: 'Finance', Icon: Coins, tab: true, tour: 'nav-winery-finance', tourTab: 'tab-winery-finance' },
    { to: 'deliveries', label: 'Deliveries', Icon: Truck, tab: true, tour: 'nav-winery-deliveries', tourTab: 'tab-winery-deliveries' },
  ],
  shop: [
    { to: '', label: 'Overview', Icon: LayoutGrid, tab: true, end: true, tour: 'nav-shop-overview', tourTab: 'tab-shop-overview' },
    { to: 'market', label: 'Market', Icon: Wine, tab: true, tour: 'nav-shop-market', tourTab: 'tab-shop-market' },
    { to: 'allocations', label: 'Allocations', Icon: FileText, tab: true, tour: 'nav-shop-allocations', tourTab: 'tab-shop-allocations' },
    { to: 'portfolio', label: 'Portfolio', Icon: Package, tab: true, tour: 'nav-shop-portfolio', tourTab: 'tab-shop-portfolio' },
    { to: 'secondary', label: 'Secondary', Icon: Coins, tour: 'nav-shop-secondary' },
    { to: 'deliveries', label: 'Deliveries', Icon: Truck, tour: 'nav-shop-deliveries' },
  ],
  admin: [
    { to: '', label: 'Queues', Icon: LayoutGrid, tab: true, end: true, tour: 'nav-admin-queues', tourTab: 'tab-admin-queues' },
    { to: 'participants', label: 'Participants', Icon: Users, tab: true, tour: 'nav-admin-participants', tourTab: 'tab-admin-participants' },
    { to: 'lots', label: 'Lots', Icon: Wine, tab: true, tour: 'nav-admin-lots', tourTab: 'tab-admin-lots' },
    { to: 'milestones', label: 'Milestones', Icon: ShieldCheck, tour: 'nav-admin-milestones' },
    { to: 'redemptions', label: 'Redemptions', Icon: Truck, tour: 'nav-admin-redemptions' },
  ],
};

export function navHref(role: CabinetRoleKey, item: NavItem): string {
  return item.to ? `${ROLE_BASE[role]}/${item.to}` : ROLE_BASE[role];
}
