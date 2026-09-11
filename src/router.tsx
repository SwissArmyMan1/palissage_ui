import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useRevealFallback } from '@/lib/motion';
import { PublicShell } from '@/components/layout/PublicShell';
import { Skeleton } from '@/components/ui/Skeleton';

import Landing from '@/pages/public/Landing';
import NotFoundPage from '@/pages/public/NotFound';

/**
 * Two groups of routes.
 *
 * The first reads nothing from Base — landing, audiences, how it works, the
 * pilot page, the legal pages. They render without the chain stack at all.
 *
 * The second sits under `ChainProviders`, a lazy layout route that brings in
 * wagmi, viem and the read model. `PublicShell` stays outside both groups, so
 * the public chrome does not remount when a reader moves between them.
 */
const ChainProviders = lazy(() => import('@/chain/Providers'));

const Catalogue = lazy(() => import('@/pages/public/Catalogue'));
const LotDetail = lazy(() => import('@/pages/public/LotDetail'));
const Producers = lazy(() => import('@/pages/public/Producers'));
const Producer = lazy(() => import('@/pages/public/Producer'));
const Network = lazy(() => import('@/pages/public/Network'));
const Demo = lazy(() => import('@/pages/public/Demo'));
const Passport = lazy(() => import('@/pages/passport/Passport'));

const AppShell = lazy(() =>
  import('@/components/layout/AppShell').then((m) => ({ default: m.AppShell })),
);
const RoleSelect = lazy(() => import('@/pages/app/RoleSelect'));
const Testnet = lazy(() => import('@/pages/app/Testnet'));
const Account = lazy(() => import('@/pages/app/Account'));

const WineryOverview = lazy(() => import('@/pages/winery/Overview'));
const WineryLots = lazy(() => import('@/pages/winery/Lots'));
const ManageLot = lazy(() => import('@/pages/winery/ManageLot'));
const CreateLot = lazy(() => import('@/pages/winery/CreateLot'));
const OfferForm = lazy(() => import('@/pages/winery/OfferForm'));
const OfferDetail = lazy(() => import('@/pages/winery/OfferDetail'));
const Finance = lazy(() => import('@/pages/winery/Finance'));
const WineryDeliveries = lazy(() => import('@/pages/winery/Deliveries'));
const Shipment = lazy(() => import('@/pages/winery/Shipment'));

const ShopOverview = lazy(() => import('@/pages/shop/Overview'));
const Market = lazy(() => import('@/pages/shop/Market'));
const Reserve = lazy(() => import('@/pages/shop/Reserve'));
const Allocations = lazy(() => import('@/pages/shop/Allocations'));
const AllocationDetail = lazy(() => import('@/pages/shop/AllocationDetail'));
const Portfolio = lazy(() => import('@/pages/shop/Portfolio'));
const ShopDeliveries = lazy(() => import('@/pages/shop/Deliveries'));
const Secondary = lazy(() => import('@/pages/shop/Secondary'));

const AdminQueues = lazy(() => import('@/pages/admin/Queues'));
const LotVerification = lazy(() => import('@/pages/admin/LotVerification'));
const AdminMilestones = lazy(() => import('@/pages/admin/Milestones'));
const AdminRedemptions = lazy(() => import('@/pages/admin/Redemptions'));
const AdminParticipants = lazy(() => import('@/pages/admin/Participants'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));

const Marketing = {
  ForWineries: lazy(() => import('@/pages/public/Marketing').then((m) => ({ default: m.ForWineries }))),
  ForBuyers: lazy(() => import('@/pages/public/Marketing').then((m) => ({ default: m.ForBuyers }))),
  HowItWorks: lazy(() => import('@/pages/public/Marketing').then((m) => ({ default: m.HowItWorks }))),
  Pilot: lazy(() => import('@/pages/public/Marketing').then((m) => ({ default: m.Pilot }))),
  Legal: lazy(() => import('@/pages/public/Marketing').then((m) => ({ default: m.Legal }))),
};

/** A route-level fallback whose geometry matches an ordinary page header. */
function RouteFallback() {
  return (
    <div className="shell py-12" role="status" aria-label="Loading">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-6 h-10 w-80" />
      <Skeleton className="mt-8 h-64 w-full" />
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  // Observe one-shot entrances, including content mounted by lazy routes.
  useRevealFallback();
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Frame>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<PublicShell />}>
              {/* ---- Reads nothing from the chain ---------------------- */}
              <Route index element={<Landing />} />
              <Route path="for-wineries" element={<Marketing.ForWineries />} />
              <Route path="for-buyers" element={<Marketing.ForBuyers />} />
              <Route path="how-it-works" element={<Marketing.HowItWorks />} />
              <Route path="pilot" element={<Marketing.Pilot />} />
              <Route path="legal/:slug" element={<Marketing.Legal />} />

              {/* ---- Public, but reads Base --------------------------- */}
              <Route element={<ChainProviders />}>
                <Route path="lots" element={<Catalogue />} />
                <Route path="lots/:lotId" element={<LotDetail />} />
                <Route path="producers" element={<Producers />} />
                <Route path="producers/:slug" element={<Producer />} />
                <Route path="network" element={<Network />} />
                <Route path="demo" element={<Demo />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* ---- No public chrome: passport and the cabinets --------- */}
            <Route element={<ChainProviders />}>
              {/* Reached by a camera, by a stranger, with no wallet. */}
              <Route path="p/:passportId" element={<Passport />} />

              <Route path="app" element={<RoleSelect />} />
              <Route path="app/testnet" element={<Testnet />} />

              {/* Single-purpose flows drop the sidebar. */}
              <Route path="app/winery/lots/new" element={<CreateLot />} />
              <Route path="app/winery/lots/:lotId/offers/new" element={<OfferForm />} />
              <Route path="app/shop/reserve/:offerId" element={<Reserve />} />

              <Route path="app/winery" element={<AppShell role="winery" />}>
                <Route index element={<WineryOverview />} />
                <Route path="lots" element={<WineryLots />} />
                <Route path="lots/:lotId" element={<ManageLot />} />
                <Route path="offers/:offerId" element={<OfferDetail />} />
                <Route path="finance" element={<Finance />} />
                <Route path="deliveries" element={<WineryDeliveries />} />
                <Route path="deliveries/:redemptionId" element={<Shipment />} />
                <Route path="account" element={<Account />} />
              </Route>

              <Route path="app/shop" element={<AppShell role="shop" />}>
                <Route index element={<ShopOverview />} />
                <Route path="market" element={<Market />} />
                <Route path="allocations" element={<Allocations />} />
                <Route path="allocations/:allocationId" element={<AllocationDetail />} />
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="secondary" element={<Secondary />} />
                <Route path="deliveries" element={<ShopDeliveries />} />
                <Route path="account" element={<Account />} />
              </Route>

              <Route path="app/admin" element={<AppShell role="admin" />}>
                <Route index element={<AdminQueues />} />
                <Route path="participants" element={<AdminParticipants />} />
                <Route path="lots" element={<LotVerification />} />
                <Route path="lots/:lotId" element={<LotVerification />} />
                <Route path="milestones" element={<AdminMilestones />} />
                <Route path="redemptions" element={<AdminRedemptions />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="account" element={<Account />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </Frame>
    </BrowserRouter>
  );
}
