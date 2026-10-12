/** Keep in sync with vadi-backend/utils/deliveryQuote.js */
export const FREE_DELIVERY_ABOVE = 500;
export const DELIVERY_FEE = 40;

export function quoteDeliveryFee(subtotal: number) {
  return subtotal > FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
}
