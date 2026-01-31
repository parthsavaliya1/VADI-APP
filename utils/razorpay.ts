type RazorpayOptions = {
  amount: number;
  onSuccess: (paymentId: string) => void;
  onFailure: () => void;
};

export function openRazorpay(options: RazorpayOptions) {
  // 🔴 TEMP MOCK FOR EXPO GO
  setTimeout(() => {
    options.onSuccess("MOCK_PAYMENT_ID_123");
  }, 1000);
}
