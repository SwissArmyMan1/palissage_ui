import {
  Building2,
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
}

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

export const NAV: Record<RoleKey, NavItem[]> = {
  winery: [
    { to: '', label: 'Overview', Icon: LayoutGrid, tab: true, end: true },
    { to: 'lots', label: 'Lots', Icon: Wine, tab: true },
    { to: 'finance', label: 'Finance', Icon: Coins, tab: true },
    { to: 'deliveries', label: 'Deliveries', Icon: Truck, tab: true },
  ],
  shop: [
    { to: '', label: 'Overview', Icon: LayoutGrid, tab: true, end: true },
    { to: 'market', label: 'Market', Icon: Wine, tab: true },
    { to: 'allocations', label: 'Allocations', Icon: FileText, tab: true },
    { to: 'portfolio', label: 'Portfolio', Icon: Package, tab: true },
    { to: 'secondary', label: 'Secondary', Icon: Coins },
    { to: 'deliveries', label: 'Deliveries', Icon: Truck },
  ],
  admin: [
    { to: '', label: 'Queues', Icon: LayoutGrid, tab: true, end: true },
    { to: 'participants', label: 'Participants', Icon: Users, tab: true },
    { to: 'lots', label: 'Lots', Icon: Wine, tab: true },
    { to: 'milestones', label: 'Milestones', Icon: ShieldCheck },
    { to: 'redemptions', label: 'Redemptions', Icon: Truck },
  ],
  collector: [{ to: '', label: 'Shelf', Icon: Building2, tab: true, end: true }],
};

export function navHref(role: RoleKey, item: NavItem): string {
  return item.to ? `${ROLE_BASE[role]}/${item.to}` : ROLE_BASE[role];
}
