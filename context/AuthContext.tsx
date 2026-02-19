import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { API } from "../utils/api";

/* ================= TYPES ================= */

type User = {
  _id: string;
  name: string;
  phone: string;
  profileImage?: string;
  otp?: string;
  otpExpiresAt?: Date;
  otpAttempts: number;
  otpVerifiedAt?: Date;
  isPhoneVerified: boolean;
  dob?: string;
  role: "user" | "admin";
  status: "active" | "blocked";
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;

  // OTP Authentication
  sendOtp: (phone: string, mode: "login" | "signup") => Promise<void>;
  verifyOtpAndLogin: (phone: string, otp: string) => Promise<void>;
  verifyOtpAndSignup: (
    phone: string,
    otp: string,
    name: string,
    role?: string,
  ) => Promise<void>;

  // User Updates
  updateProfile: (data: {
    name?: string;
    dob?: string;
    profileImage?: string;
  }) => Promise<void>;

  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const STORAGE_KEY = "AUTH_USER";

/* ================= PROVIDER ================= */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------- LOAD USER FROM STORAGE ---------- */
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const userData = JSON.parse(stored);
          setUser(userData);
          // Update last login on app start
          await API.patch(`/api/users/${userData._id}`, {
            lastLoginAt: new Date(),
          });
        }
      } catch (e) {
        console.log("❌ Auth load error", e);
      } finally {
        setLoading(false);
      }
    };
    loadAuth();
  }, []);

  /* ================= OTP AUTHENTICATION ================= */

  // 📤 SEND OTP
  const sendOtp = async (phone: string, mode: "login" | "signup") => {
    try {
      await API.post("/api/auth/send-otp", {
        phone,
        mode,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to send OTP");
    }
  };

  // ✅ VERIFY OTP AND LOGIN (existing user)
  const verifyOtpAndLogin = async (phone: string, otp: string) => {
    try {
      const verifyRes = await API.post("/api/auth/verify-otp", { phone, otp });
      const { user: userData } = verifyRes.data;

      // Save to storage and update state
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
      console.log("✅ User logged in:", userData.name);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Invalid OTP");
    }
  };

  // 🆕 VERIFY OTP AND SIGNUP (new user)
  const verifyOtpAndSignup = async (
    phone: string,
    otp: string,
    name: string,
    role: string = "user",
  ) => {
    try {
      // Step 1: Verify OTP
      const verifyRes = await API.post("/api/auth/verify-otp", { phone, otp });
      const { isNewUser } = verifyRes.data;

      if (!isNewUser) {
        throw new Error("User already exists. Please login instead.");
      }

      // Step 2: Complete signup
      const signupRes = await API.post("/api/auth/signup", {
        name,
        phone,
        role,
      });

      const userData = signupRes.data;

      // Save to storage and update state
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
      console.log("✅ User signed up:", userData.name);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Signup failed");
    }
  };

  /* ================= USER UPDATES ================= */

  const updateProfile = async (data: {
    name?: string;
    dob?: string;
    profileImage?: string;
  }) => {
    if (!user) throw new Error("No user logged in");

    try {
      const res = await API.patch(`/api/users/${user._id}`, data);
      const updatedUser = res.data;

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
      console.log("✅ Profile updated");
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Update failed");
    }
  };

  /* ================= LOGOUT ================= */

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  /* ================= PROVIDER ================= */

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        loading,
        sendOtp,
        verifyOtpAndLogin,
        verifyOtpAndSignup,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
