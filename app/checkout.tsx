import { useAddress } from "@/context/AddressContext";
import { useAuth } from "@/context/AuthContext";
import { useOrders } from "@/context/OrderContext";
import { openRazorpay } from "@/utils/razorpay";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function CheckoutScreen() {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const { placeOrder } = useOrders();
  const { selectedAddress, defaultAddress, addresses, setSelectedAddress } =
    useAddress();
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "upi" | "card" | "wallet" | "cod"
  >("upi");
  const [onlinePaymentType, setOnlinePaymentType] = useState<
    "googlepay" | "upi" | "card" | "netbanking"
  >("googlepay");
  const [upiId, setUpiId] = useState("");
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    cardHolder: "",
    expiry: "",
    cvv: "",
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = total > 500 ? 0 : 40;
  const grandTotal = total + deliveryFee;
  const activeAddress = selectedAddress || defaultAddress || addresses[0] || null;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!isProcessing && selectedAddress) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isProcessing, selectedAddress]);

  useEffect(() => {
    if (!selectedAddress && activeAddress) {
      setSelectedAddress(activeAddress);
    }
  }, [selectedAddress, activeAddress, setSelectedAddress]);

  const handleChangeAddress = () => {
    router.push({
      pathname: "/my-addresses",
      params: { fromCheckout: "true" },
    });
  };

  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(expandedSection === section ? null : section);
  };

  const buildOrderAddress = () => ({
    _id: activeAddress!._id,
    name: activeAddress!.name!,
    phone: activeAddress!.phone!,
    addressLine1: activeAddress!.addressLine1!,
    addressLine2: activeAddress!.addressLine2,
    city: activeAddress!.city!,
    state: activeAddress!.state!,
    pincode: activeAddress!.pincode!,
    landmark: activeAddress!.landmark,
  });

  const formatCardNumber = (value: string) =>
    value
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length <= 2) return cleaned;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  };

  const formatCvv = (value: string) => value.replace(/\D/g, "").slice(0, 3);

  const upiRegex = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;
  const cardNumberRegex = /^\d{16}$/;
  const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
  const cvvRegex = /^\d{3}$/;

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert("Empty Cart", "Your cart is empty");
      return;
    }

    if (!activeAddress) {
      Alert.alert("No Address", "Please add a delivery address");
      return;
    }
    if (!user?._id) {
      Alert.alert("Login Required", "Please login to place this order");
      return;
    }

    if (paymentMethod !== "cod") {
      if (onlinePaymentType === "upi" && !upiId.trim()) {
        Alert.alert("UPI Required", "Please enter your UPI ID to continue.");
        return;
      }
      if (onlinePaymentType === "upi" && !upiRegex.test(upiId.trim())) {
        Alert.alert("Invalid UPI", "Please enter a valid UPI ID (example@upi).");
        return;
      }

      if (onlinePaymentType === "card") {
        const { cardNumber, cardHolder, expiry, cvv } = cardDetails;
        if (!cardNumber.trim() || !cardHolder.trim() || !expiry.trim() || !cvv.trim()) {
          Alert.alert("Card Details Required", "Please complete all card details.");
          return;
        }
        if (!cardNumberRegex.test(cardNumber.replace(/\s/g, ""))) {
          Alert.alert("Invalid Card Number", "Card number must be 16 digits.");
          return;
        }
        if (!expiryRegex.test(expiry)) {
          Alert.alert("Invalid Expiry", "Use expiry format MM/YY.");
          return;
        }
        if (!cvvRegex.test(cvv)) {
          Alert.alert("Invalid CVV", "CVV must be 3 digits.");
          return;
        }
      }
    }

    setIsProcessing(true);

    try {
      const resolvedOnlineMethod: "upi" | "card" | "wallet" =
        onlinePaymentType === "card"
          ? "card"
          : onlinePaymentType === "netbanking"
            ? "wallet"
            : "upi";

      // ✅ CASH ON DELIVERY — place order directly
      if (paymentMethod === "cod") {
        await placeOrder({
          address: buildOrderAddress(),
          paymentMethod,
          deliveryFee,
        });

        clearCart();
        setIsProcessing(false);

        Alert.alert(
          "Order Placed! 🎉",
          "Your order has been placed successfully",
          [
            {
              text: "View Orders",
              onPress: () => router.replace("/(tabs)/orders"),
            },
          ],
        );
        return;
      }

      // ✅ ONLINE PAYMENT — open Razorpay first, place order ONLY on success
      await openRazorpay({
        userId: user!._id,
        amount: grandTotal,
        deliveryFee,
        paymentMethod: resolvedOnlineMethod,
        customerName: user?.name,
        customerPhone: user?.phone,
        description: `Order payment - ₹${grandTotal}`,
        onSuccess: async ({ paymentId, orderId, signature }) => {
          try {
            await placeOrder({
              address: buildOrderAddress(),
              paymentMethod: resolvedOnlineMethod,
              paymentDetails: {
                razorpayPaymentId: paymentId,
                razorpayOrderId: orderId,
                razorpaySignature: signature,
              },
              deliveryFee,
              notes: `Preferred payment: ${onlinePaymentType}; Razorpay paymentId: ${paymentId}; Razorpay orderId: ${orderId}; Signature: ${signature}`,
            });

            clearCart();
            setIsProcessing(false);

            Alert.alert(
              "Payment Successful! 🎉",
              `Payment ID: ${paymentId}\nYour order has been placed.`,
              [
                {
                  text: "View Orders",
                  onPress: () => router.replace("/(tabs)/orders"),
                },
              ],
            );
          } catch (orderErr: any) {
            // Payment succeeded but order placement failed
            setIsProcessing(false);
            Alert.alert(
              "Order Error",
              `Payment was successful (ID: ${paymentId}) but we couldn't place your order. Please contact support.`,
              [{ text: "OK" }],
            );
          }
        },
        onFailure: (message?: string) => {
          // Payment was cancelled or failed — do NOT place order
          setIsProcessing(false);
          Alert.alert(
            "Payment Failed",
            message || "Your payment was cancelled or failed. No order was placed.",
            [{ text: "Try Again" }],
          );
        },
      });
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert("Error", err?.message || "Failed to place order");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Checkout</Text>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepActive]} />
              <View style={styles.stepLine} />
              <View style={styles.stepDot} />
            </View>
          </View>

          {/* DELIVERY ADDRESS */}
          <Animated.View style={[styles.card, styles.cardElevated]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => toggleSection("address")}
              style={styles.cardHeader}
            >
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="location" size={20} color="#2E7D32" />
                </View>
                <Text style={styles.sectionTitle}>Delivery Address</Text>
              </View>
              <Ionicons
                name={
                  expandedSection === "address" ? "chevron-up" : "chevron-down"
                }
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {(expandedSection === "address" || expandedSection === null) && (
              <View style={styles.cardContent}>
                {activeAddress ? (
                  <>
                    <View style={styles.addressBox}>
                      <View style={styles.addressTop}>
                        <View style={styles.addressTitleRow}>
                          <Ionicons
                            name="home"
                            size={16}
                            color="#2E7D32"
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.addressTitle}>
                            {activeAddress.name}
                          </Text>
                        </View>
                        {activeAddress.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Ionicons name="star" size={10} color="#fff" />
                            <Text style={styles.defaultText}>DEFAULT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.address}>
                        {activeAddress.addressLine1}
                      </Text>
                      <Text style={styles.addressCity}>
                        {activeAddress.city}, {activeAddress.state} -{" "}
                        {activeAddress.pincode}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.changeBtn}
                      onPress={handleChangeAddress}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color="#2E7D32"
                      />
                      <Text style={styles.changeBtnText}>Change Address</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.addAddressBtn}
                    onPress={() => router.push("/add-address")}
                    activeOpacity={0.8}
                  >
                    <View style={styles.addIconCircle}>
                      <Ionicons name="add-circle" size={28} color="#2E7D32" />
                    </View>
                    <View style={styles.addAddressTextContainer}>
                      <Text style={styles.addAddressTitle}>
                        Add Delivery Address
                      </Text>
                      <Text style={styles.addAddressSubtitle}>
                        Required to complete your order
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#2E7D32"
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Animated.View>

          {/* ORDER ITEMS */}
          <View style={[styles.card, styles.cardElevated]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => toggleSection("items")}
              style={styles.cardHeader}
            >
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="cart" size={20} color="#2E7D32" />
                </View>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                <View style={styles.itemCountBadge}>
                  <Text style={styles.itemCountText}>{items.length}</Text>
                </View>
              </View>
              <Ionicons
                name={
                  expandedSection === "items" ? "chevron-up" : "chevron-down"
                }
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {(expandedSection === "items" || expandedSection === null) && (
              <View style={styles.cardContent}>
                {items.map((item, index) => (
                  <Animated.View
                    key={item.id}
                    style={[
                      styles.itemRow,
                      index !== items.length - 1 && styles.itemBorder,
                    ]}
                  >
                    <View style={styles.itemLeft}>
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyText}>{`${item.qty}x`}</Text>
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemVariant}>
                          {item.variantLabel}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.itemPrice}>
                      ₹{item.price * item.qty}
                    </Text>
                  </Animated.View>
                ))}
              </View>
            )}
          </View>

          {/* BILL DETAILS */}
          <View style={[styles.card, styles.cardElevated]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => toggleSection("bill")}
              style={styles.cardHeader}
            >
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="receipt" size={20} color="#2E7D32" />
                </View>
                <Text style={styles.sectionTitle}>Bill Details</Text>
              </View>
              <Ionicons
                name={
                  expandedSection === "bill" ? "chevron-up" : "chevron-down"
                }
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {(expandedSection === "bill" || expandedSection === null) && (
              <View style={styles.cardContent}>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Item Total</Text>
                  <Text style={styles.billValue}>₹{total}</Text>
                </View>
                <View style={styles.billRow}>
                  <View style={styles.deliveryLabel}>
                    <Text style={styles.billLabel}>Delivery Fee</Text>
                    {deliveryFee === 0 && (
                      <View style={styles.freeTag}>
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#fff"
                        />
                        <Text style={styles.freeTagText}>FREE</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.billValue,
                      deliveryFee === 0 && styles.strikethrough,
                    ]}
                  >
                    ₹{deliveryFee === 0 ? 40 : deliveryFee}
                  </Text>
                </View>

                {total < 500 && (
                  <View style={styles.savingTip}>
                    <Ionicons
                      name="information-circle"
                      size={18}
                      color="#FF9800"
                    />
                    <View style={styles.savingTipContent}>
                      <Text style={styles.savingText}>
                        Add ₹{500 - total} more for FREE delivery!
                      </Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${(total / 500) * 100}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.divider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Grand Total</Text>
                  <Text style={styles.totalAmount}>₹{grandTotal}</Text>
                </View>
              </View>
            )}
          </View>

          {/* PAYMENT METHOD */}
          <View style={[styles.card, styles.cardElevated]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="card" size={20} color="#2E7D32" />
                </View>
                <Text style={styles.sectionTitle}>Payment Method</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              {/* ONLINE PAYMENT */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod !== "cod" && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod("upi")}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.paymentIconCircle,
                    { backgroundColor: "#E3F2FD" },
                  ]}
                >
                  <Ionicons name="wallet" size={20} color="#4285F4" />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentText}>Online Payment</Text>
                  <Text style={styles.paymentSubtext}>
                    Google Pay, UPI, Cards, Net Banking
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    paymentMethod !== "cod" && styles.radioOuterSelected,
                  ]}
                >
                  {paymentMethod !== "cod" && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>

              {paymentMethod !== "cod" && (
                <View style={styles.paymentDetailsWrap}>
                  <Text style={styles.paymentDetailsTitle}>Select payment option</Text>

                  <View style={styles.paymentChipsRow}>
                    {[
                      { key: "googlepay", label: "Google Pay", icon: "logo-google" },
                      { key: "upi", label: "UPI ID", icon: "at" },
                      { key: "card", label: "Card", icon: "card" },
                      { key: "netbanking", label: "Net Banking", icon: "business" },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.paymentChip,
                          onlinePaymentType === option.key && styles.paymentChipActive,
                        ]}
                        onPress={() =>
                          setOnlinePaymentType(
                            option.key as "googlepay" | "upi" | "card" | "netbanking",
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={option.icon as any}
                          size={16}
                          color={onlinePaymentType === option.key ? "#2E7D32" : "#666"}
                        />
                        <Text
                          style={[
                            styles.paymentChipText,
                            onlinePaymentType === option.key && styles.paymentChipTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {onlinePaymentType === "googlepay" && (
                    <View style={styles.inlineNotice}>
                      <Ionicons name="phone-portrait" size={14} color="#2E7D32" />
                      <Text style={styles.inlineNoticeText}>
                        Google Pay will open in Razorpay at checkout.
                      </Text>
                    </View>
                  )}

                  {onlinePaymentType === "upi" && (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter UPI ID (example@upi)"
                      placeholderTextColor="#9E9E9E"
                      value={upiId}
                      onChangeText={(value) => setUpiId(value.trim().toLowerCase())}
                      autoCapitalize="none"
                    />
                  )}

                  {onlinePaymentType === "card" && (
                    <View style={styles.cardFormWrap}>
                      <TextInput
                        style={styles.input}
                        placeholder="Card Number"
                        placeholderTextColor="#9E9E9E"
                        value={cardDetails.cardNumber}
                        onChangeText={(value) =>
                          setCardDetails((prev) => ({
                            ...prev,
                            cardNumber: formatCardNumber(value),
                          }))
                        }
                        keyboardType="number-pad"
                        maxLength={19}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Card Holder Name"
                        placeholderTextColor="#9E9E9E"
                        value={cardDetails.cardHolder}
                        onChangeText={(value) =>
                          setCardDetails((prev) => ({ ...prev, cardHolder: value }))
                        }
                      />
                      <View style={styles.rowInputs}>
                        <TextInput
                          style={[styles.input, styles.halfInput]}
                          placeholder="MM/YY"
                          placeholderTextColor="#9E9E9E"
                          value={cardDetails.expiry}
                          onChangeText={(value) =>
                          setCardDetails((prev) => ({
                            ...prev,
                            expiry: formatExpiry(value),
                          }))
                          }
                          maxLength={5}
                        />
                        <TextInput
                          style={[styles.input, styles.halfInput]}
                          placeholder="CVV"
                          placeholderTextColor="#9E9E9E"
                          value={cardDetails.cvv}
                          onChangeText={(value) =>
                          setCardDetails((prev) => ({
                            ...prev,
                            cvv: formatCvv(value),
                          }))
                          }
                          keyboardType="number-pad"
                        maxLength={3}
                          secureTextEntry
                        />
                      </View>
                    </View>
                  )}

                  {onlinePaymentType === "netbanking" && (
                    <View style={styles.inlineNotice}>
                      <Ionicons name="business" size={14} color="#2E7D32" />
                      <Text style={styles.inlineNoticeText}>
                        Choose your bank securely on the Razorpay screen.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* CASH ON DELIVERY */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === "cod" && styles.paymentOptionSelected,
                  { marginTop: 10 },
                ]}
                onPress={() => setPaymentMethod("cod")}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.paymentIconCircle,
                    { backgroundColor: "#E8F5E9" },
                  ]}
                >
                  <Ionicons name="cash" size={20} color="#4CAF50" />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentText}>Cash on Delivery</Text>
                  <Text style={styles.paymentSubtext}>
                    Pay when order is delivered
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    paymentMethod === "cod" && styles.radioOuterSelected,
                  ]}
                >
                  {paymentMethod === "cod" && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Security note for online payment */}
              {paymentMethod !== "cod" && (
                <View style={styles.secureNotice}>
                  <Ionicons name="lock-closed" size={14} color="#2E7D32" />
                  <Text style={styles.secureNoticeText}>
                    100% secure payment powered by Razorpay
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* FIXED BOTTOM */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomLeft}>
            <Text style={styles.bottomLabel}>Total Amount</Text>
            <Text style={styles.bottomTotal}>₹{grandTotal}</Text>
          </View>
          <Animated.View
            style={{
              transform: [{ scale: isProcessing ? scaleAnim : pulseAnim }],
            }}
          >
            <TouchableOpacity
              style={[
                styles.placeOrderBtn,
                (isProcessing || !activeAddress) &&
                  styles.placeOrderBtnDisabled,
              ]}
              onPress={handlePlaceOrder}
              disabled={isProcessing || !activeAddress}
              activeOpacity={0.8}
            >
              {isProcessing ? (
                <>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          rotate: pulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0deg", "360deg"],
                          }),
                        },
                      ],
                    }}
                  >
                    <Ionicons name="sync" size={20} color="#fff" />
                  </Animated.View>
                  <Text style={styles.placeOrderText}>Processing...</Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name={paymentMethod === "cod" ? "cash" : "shield-checkmark"}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.placeOrderText}>
                    {paymentMethod === "cod"
                      ? "PLACE ORDER"
                      : "PAY ₹" + grandTotal}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FA" },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    flex: 1,
    textAlign: "center",
  },
  stepIndicator: { flexDirection: "row", alignItems: "center", width: 40 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E0E0E0" },
  stepActive: { backgroundColor: "#2E7D32", width: 10, height: 10 },
  stepLine: {
    width: 12,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: "hidden",
  },
  cardElevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FAFAFA",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  itemCountBadge: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  itemCountText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cardContent: { padding: 16 },
  addressBox: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  addressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addressTitleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  addressTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  defaultText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  address: { color: "#666", fontSize: 14, lineHeight: 20, marginBottom: 4 },
  addressCity: { color: "#888", fontSize: 13, fontWeight: "500" },
  changeBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeBtnText: { color: "#2E7D32", fontWeight: "700", fontSize: 14 },
  addAddressBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFD700",
    borderStyle: "dashed",
  },
  addIconCircle: { marginRight: 12 },
  addAddressTextContainer: { flex: 1 },
  addAddressTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  addAddressSubtitle: { fontSize: 13, color: "#666" },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  qtyBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 36,
    alignItems: "center",
  },
  qtyText: { fontSize: 13, fontWeight: "700", color: "#2E7D32" },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  itemVariant: { fontSize: 12, color: "#888" },
  itemPrice: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    alignItems: "center",
  },
  billLabel: { fontSize: 14, color: "#666", fontWeight: "500" },
  billValue: { fontSize: 15, color: "#1A1A1A", fontWeight: "600" },
  deliveryLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  freeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  freeTagText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  strikethrough: { textDecorationLine: "line-through", color: "#999" },
  savingTip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#FF9800",
  },
  savingTipContent: { flex: 1 },
  savingText: {
    fontSize: 13,
    color: "#E65100",
    fontWeight: "600",
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#FFE0B2",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#FF9800", borderRadius: 3 },
  divider: { height: 1, backgroundColor: "#E8E8E8", marginVertical: 14 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  totalLabel: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  totalAmount: { fontSize: 20, fontWeight: "700", color: "#2E7D32" },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 14,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
  },
  paymentOptionSelected: {
    borderColor: "#2E7D32",
    backgroundColor: "#F1F8F1",
  },
  paymentIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: { flex: 1 },
  paymentText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  paymentSubtext: { fontSize: 12, color: "#888" },
  paymentDetailsWrap: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  paymentDetailsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  paymentChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  paymentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D5D5D5",
    backgroundColor: "#fff",
  },
  paymentChipActive: {
    borderColor: "#2E7D32",
    backgroundColor: "#E8F5E9",
  },
  paymentChipText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  paymentChipTextActive: {
    color: "#2E7D32",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1A1A1A",
  },
  cardFormWrap: {
    gap: 8,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  inlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
  },
  inlineNoticeText: {
    flex: 1,
    color: "#2E7D32",
    fontSize: 12,
    fontWeight: "600",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#BDBDBD",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: "#2E7D32" },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#2E7D32",
  },
  secureNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  secureNoticeText: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "600",
    flex: 1,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomLeft: { flex: 1 },
  bottomLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
    fontWeight: "500",
  },
  bottomTotal: { fontSize: 22, fontWeight: "700", color: "#2E7D32" },
  placeOrderBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  placeOrderBtnDisabled: {
    backgroundColor: "#BDBDBD",
    shadowOpacity: 0,
    elevation: 0,
  },
  placeOrderText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
