import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { API } from "../utils/api";

// 🔥 Firebase

/* ================= TYPES ================= */

type User = {
  _id: string;
  name: string;
  phone: string;
  dob: string;
  profileImage?: string;
  role: "user" | "admin";
};

type SignupPayload = {
  name: string;
  phone: string;
  password: string;
  dob: string;
  role: "user" | "admin";
};

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;

  signup: (data: SignupPayload) => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;

  // 🔐 OTP
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  loginWithOtp: (phone: string) => Promise<void>;

  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const STORAGE_KEY = "AUTH_USER";

/* ================= FIREBASE OTP STATE ================= */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------- LOAD USER FROM STORAGE ---------- */
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setUser(JSON.parse(stored));
      } catch (e) {
        console.log("❌ Auth load error", e);
      } finally {
        setLoading(false);
      }
    };
    loadAuth();
  }, []);

  let pendingOtpPhone: string | null = null;

  /* ================= OTP (DEV ONLY) ================= */

  // 📤 SEND OTP (FAKE)
  const sendOtp = async (phone: string) => {
    console.log("📨 Fake OTP sent to", phone);
    console.log("✅ OTP = 123456");
    pendingOtpPhone = phone;
  };

  // ✅ VERIFY OTP (FAKE)
  const verifyOtp = async (otp: string) => {
    if (otp !== "123456") {
      throw new Error("Invalid OTP");
    }

    if (!pendingOtpPhone) {
      throw new Error("No OTP request found");
    }

    console.log("✅ OTP verified for", pendingOtpPhone);
  };

  /* ================= AUTH ================= */

  // 🆕 SIGNUP (after OTP verified)
  const signup = async (data: SignupPayload) => {
    const res = await API.post("/api/auth/signup", data);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
    setUser(res.data);
  };

  // 🔑 LOGIN WITH PASSWORD
  const login = async (phone: string, password: string) => {
    const res = await API.post("/api/auth/login", { phone, password });

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
    setUser(res.data);
  };

  // 🔓 LOGIN WITH OTP (after OTP verified)
  const loginWithOtp = async (phone: string) => {
    const res = await API.post("/api/auth/login-otp", { phone });
    // 👆 backend should find user by phone

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
    setUser(res.data);
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
        signup,
        login,
        sendOtp,
        verifyOtp,
        loginWithOtp,
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
