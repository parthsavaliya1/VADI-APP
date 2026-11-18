export type Cancellation = { state?: string; reason?: string; refundStatus?: string; refundAmount?: number; refundedTo?: string;
  refundOperation?: { gatewayRefundId?: string; bankReference?: string; error?: string }; };
export function cancellationMessage(cancellation?: Cancellation) {
  if (!cancellation) return '';
  if (!cancellation.refundAmount || cancellation.refundedTo === 'none') return 'Order cancelled. No payment was collected, so no refund is needed.';
  const amount = `₹${cancellation.refundAmount.toLocaleString('en-IN')}`;
  if (cancellation.state === 'processing' && cancellation.refundStatus === 'failed') return `Order cancelled. Refund of ${amount} needs attention. Contact support with the refund reference shown below.`;
  if (cancellation.state === 'processing') return `Order cancelled. Refund of ${amount} to the original payment method is pending. Check its status below or in Wallet History.`;
  return `Order cancelled. ${amount} refunded to ${cancellation.refundedTo === 'wallet' ? 'your VADI wallet' : 'the original payment method'}. See Wallet History for details.`;
}
export function canCancelOrder(status: string) { return ['placed', 'confirmed', 'packed', 'shipped'].includes(status); }
export function isWithinReturnWindow(deliveredAt: string | undefined, now = Date.now()) {
  const time = deliveredAt ? +new Date(deliveredAt) : NaN;
  return Number.isFinite(time) && now >= time && now - time <= 24 * 60 * 60 * 1000;
}
