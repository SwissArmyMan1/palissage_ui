import { useEffect, useSyncExternalStore } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { CHAIN_ID, CHAIN_LABEL, txUrl } from './config';
import { subscribePending, pendingTransaction, savePendingTransaction } from './pending-store';
import { useSandbox } from '@/sandbox/store';
import { useLocale } from '@/lib/i18n/context';

/** A submitted hash survives navigation, reload and network switching. No write is replayed. */
function usePendingReceipt() {
  const transaction = useSyncExternalStore(subscribePending, pendingTransaction);
  const sandbox = useSandbox();
  const queryClient = useQueryClient();
  const receipt = useWaitForTransactionReceipt({ hash: transaction?.hash, chainId: CHAIN_ID, query: { enabled: Boolean(transaction) && !sandbox, retry: true } });
  useEffect(() => {
    if (receipt.data && transaction && receipt.data.transactionHash === transaction.hash) {
      for (const query of ['readContract', 'readContracts', 'balance', 'deployment-health']) void queryClient.invalidateQueries({ queryKey: [query] });
      savePendingTransaction(null);
    }
  }, [receipt.data, transaction, queryClient]);
  return { transaction, sandbox };
}
export function PendingTransactionMonitor() {
  usePendingReceipt();
  return null;
}
export function PendingTransactionBar() {
  const { transaction, sandbox } = usePendingReceipt();
  const { t } = useLocale();
  if (!transaction || sandbox) return null;
  return <div role="status" className="flex flex-wrap items-center gap-3 border-b border-edge-subtle bg-warning-subtle px-4 py-2 text-body-sm">
    <span>{t('A transaction is awaiting confirmation on {chain}. Check its result before submitting another.', { chain: CHAIN_LABEL })}</span>
    <a className="font-semibold text-accent underline" href={txUrl(transaction.hash)} target="_blank" rel="noreferrer">{t('View transaction')}</a>
  </div>;
}
