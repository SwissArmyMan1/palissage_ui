import { ASSET, CHAIN_ID } from '@/chain/config';
import { NETWORKS, isSupportedChain, type SettlementAsset } from '@/chain/networks';
import { stopSimulation } from '@/sandbox/store';

/** Reloading clears prepared transactions and cached rows before a network or asset changes. */
export function NetworkPicker({ assets = false }: { assets?: boolean }) {
  function select(chainId: number, asset: SettlementAsset) {
    if (!isSupportedChain(chainId)) return;
    stopSimulation();
    try {
      localStorage.setItem('palissage.chain', String(chainId));
      localStorage.setItem('palissage.asset', asset);
    } catch { /* The URL also carries the choice when storage is blocked. */ }
    const url = new URL('/app/testnet', location.origin);
    url.searchParams.set('chain', String(chainId));
    url.searchParams.set('asset', asset);
    location.assign(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={assets ? 'readiness-network' : 'cabinet-network'}>Test network</label>
      <select
        id={assets ? 'readiness-network' : 'cabinet-network'}
        className="min-w-0 max-w-44 rounded-md border border-edge-subtle bg-surface px-2 py-2 text-body-sm"
        value={CHAIN_ID}
        onChange={(event) => select(Number(event.target.value), ASSET)}
      >
        {Object.entries(NETWORKS).map(([id, network]) => <option key={id} value={id}>{network.label}</option>)}
      </select>
      {assets ? (
        <>
          <label className="sr-only" htmlFor="settlement-asset">Settlement asset</label>
          <select id="settlement-asset" className="rounded-md border border-edge-subtle bg-surface px-2 py-2 text-body-sm" value={ASSET} onChange={(event) => select(CHAIN_ID, event.target.value as SettlementAsset)}>
            <option value="eur">Test EUR · tEURe</option>
            <option value="usdg">Test USDG · Paxos</option>
          </select>
        </>
      ) : null}
    </div>
  );
}
