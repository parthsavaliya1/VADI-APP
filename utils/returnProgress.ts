type Icon = 'receipt-outline' | 'checkmark-circle-outline' | 'cube-outline' | 'airplane-outline' | 'bicycle-outline' | 'home-outline';
export type TimelineStep = { key: string; label: string; subLabel: string; icon: Icon };
export type ReturnProgressRequest = { status?: string; items?: { action?: string }[]; fulfillment?: { stage?: string; replacement?: { reference?: string } } };
export function getReturnProgress(status: string, request?: ReturnProgressRequest) {
  if (!request?.status && status !== 'returned') return null;
  const step = (key: string, label: string, subLabel: string, icon: Icon = 'checkmark-circle-outline'): TimelineStep => ({ key, label, subLabel, icon });
  if (!request?.status) return { steps: [step('completed', 'Return completed', 'Your order has been returned')], index: 0, label: 'Return completed', complete: true };
  if (request.status === 'rejected') return { steps: [step('requested', 'Return requested', 'Your request was received', 'receipt-outline'), step('rejected', 'Return rejected', 'See the admin note for details')], index: 1, label: 'Return rejected', complete: true };
  const replacement = !!request.fulfillment?.replacement?.reference || !!request.items?.some(item => item.action === 'replace');
  const steps = [
    step('requested', 'Return requested', 'Your request was received', 'receipt-outline'),
    step('pickup_pending', 'Return accepted', 'Waiting for pickup staff assignment'),
    step('pickup_assigned', 'Pickup scheduled', 'Staff will collect your returned items', 'bicycle-outline'),
    step('collected', 'Items collected', 'Your returned items are on the way to VADI', 'cube-outline'),
    step('received', 'Received at VADI', 'Your returned items have been received', 'home-outline'),
    step('inspected', 'Inspection complete', 'The returned items have been inspected'),
    ...(replacement ? [step('replacement_ready', 'Replacement packed', 'Your replacement is ready', 'cube-outline'), step('out_for_delivery', 'Replacement out for delivery', 'Your replacement is on the way', 'bicycle-outline')] : []),
    step('completed', replacement ? 'Replacement delivered' : 'Return completed', replacement ? 'Your replacement has been received' : 'Pickup and inspection are complete', 'home-outline'),
  ];
  const stage = request.status === 'approved' ? request.fulfillment?.stage || 'pickup_pending' : 'requested';
  const index = Math.max(0, steps.findIndex(item => item.key === stage));
  return { steps, index, label: request.status === 'processing' ? 'Refund processing' : steps[index].label, complete: stage === 'completed' };
}
