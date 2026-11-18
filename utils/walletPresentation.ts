export type WalletHistoryItem = {
  _id: string; amount: number; direction?: 'credit' | 'debit'; reason?: string; status?: string; createdAt: string;
  order?: { orderNumber?: string }; balanceBefore?: number; balanceAfter?: number;
  affectsBalance?: boolean; destination?: string; refundId?: string; bankReference?: string;
  razorpayPaymentId?: string; sourcePaymentId?: string; message?: string; fundsRestored?: boolean;
  description?: string; type?: string;
};
export function walletHistoryPresentation(row: WalletHistoryItem) {
  const status = row.status || 'paid';
  const reason = row.reason || '';
  const direction = row.direction || (row.type === 'debit' ? 'debit' : 'credit');
  const order = row.order?.orderNumber ? ` · #${row.order.orderNumber}` : '';
  const title = reason === 'withdrawal' ? 'Return to original payment method'
    : reason === 'withdrawal_reversal' ? 'Refund failed — money restored to wallet'
    : reason === 'original_refund' ? 'Order refund to original payment method' + order
    : reason === 'topup' ? 'Wallet top-up'
    : reason === 'referral' ? 'Referral reward'
    : reason === 'refund' ? (row.order ? 'Order refund to wallet' + order : 'Wallet credit')
    : reason === 'order' ? 'Order payment' + order : row.description || 'Wallet activity';
  const external = row.affectsBalance === false || reason === 'original_refund';
  const noCredit = reason === 'topup' && status !== 'paid';
  const sign = external || noCredit ? '' : direction === 'debit' ? '−' : '+';
  const amount = `${sign}₹${Number(row.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const statusText = status === 'processing' ? 'Refund pending'
    : status === 'pending' ? (reason === 'topup' ? 'Awaiting payment confirmation' : 'Pending')
    : status === 'failed' ? (row.fundsRestored ? 'Failed · money restored' : 'Failed')
    : status === 'cancelled' ? 'Not completed'
    : reason === 'withdrawal' || reason === 'original_refund' ? 'Refund processed' : 'Completed';
  return { title, amount, statusText, external, noCredit, isDebit: direction === 'debit',
    destination: external || reason === 'withdrawal' ? 'Original payment method' : 'VADI wallet' };
}
