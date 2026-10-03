import { keccak256 } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { useSandbox } from '@/sandbox/store';
import { CHAIN_ID, CONTRACTS, DEPLOYMENT_ID, DEPLOYMENT_READY, PAYMENT_TOKEN, RUNTIME_CODE_HASHES, ZERO_ADDRESS } from './config';
import { palissageLensAbi } from './abis';

/** An RPC observation, independent of the wallet's network and the configured chain object. */
export function useDeploymentHealth() {
  const client = usePublicClient({ chainId: CHAIN_ID });
  const sandbox = useSandbox();
  return useQuery({
    queryKey: ['deployment-health', CHAIN_ID, DEPLOYMENT_ID, PAYMENT_TOKEN.address],
    enabled: !sandbox && Boolean(client) && DEPLOYMENT_READY,
    staleTime: 15_000,
    retry: 1,
    queryFn: async () => {
      if (!client || !DEPLOYMENT_READY) throw new Error('No verified deployment is published for this network.');
      const actualChainId = await client.getChainId();
      if (actualChainId !== CHAIN_ID) throw new Error('The RPC is connected to a different network.');
      const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
      const entries = Object.entries(CONTRACTS);
      const codes = await Promise.all([...entries.map(([, address]) => address), PAYMENT_TOKEN.address].map((address) => {
        if (address === ZERO_ADDRESS) throw new Error('A deployment address is missing.');
        return client.getCode({ address, blockNumber });
      }));
      if (codes.some((code) => !code || code === '0x')) throw new Error('A configured contract has no code on this network.');
      entries.forEach(([name], index) => {
        const expected = RUNTIME_CODE_HASHES[name as keyof typeof RUNTIME_CODE_HASHES];
        if (!expected || keccak256(codes[index]!) !== expected) throw new Error(`The ${name} bytecode differs from the verified release.`);
      });
      const protocol = await client.readContract({ address: CONTRACTS.palissageLens, abi: palissageLensAbi, functionName: 'protocol', args: [PAYMENT_TOKEN.address], blockNumber });
      if (Number(protocol.chainId) !== CHAIN_ID || protocol.version !== '1.1.0') throw new Error('The deployment version or chain is different.');
      for (const key of ['wineLotToken', 'primaryMarket', 'secondaryMarket', 'redemptionManager', 'identityRegistry', 'trustedIssuersRegistry', 'roleGateway'] as const) {
        if (protocol[key].toLowerCase() !== CONTRACTS[key].toLowerCase()) throw new Error(`The ${key} wiring differs from the published deployment.`);
      }
      if (!protocol.paymentMetadataOk || protocol.paymentDecimals !== PAYMENT_TOKEN.decimals || protocol.paymentSymbol !== PAYMENT_TOKEN.symbol) throw new Error('The settlement asset metadata differs from the published configuration.');
      if (!protocol.paymentAllowedPrimary || !protocol.paymentAllowedSecondary) throw new Error('The selected settlement asset is not enabled on both markets.');
      return { ready: true, actualChainId, blockNumber };
    },
  });
}
