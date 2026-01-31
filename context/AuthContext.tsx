import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { API } from "../utils/api";

type User = {
  _id: string;
  name: string;
  phone: string;
  dob: string;
  profileImage?: string;
  role: "user" | "admin";
};

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  signup: (data: {
    name: string;
    phone: string;
    password: string;
    dob: string;
    role: "user" | "admin";
  }) => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const STORAGE_KEY = "AUTH_USER";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔐 LOAD AUTH STATE SAFELY
  useEffect(() => {
    const loadAuth = async () => {
      console.log("⏳ Auth loading started");

      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        console.log("📦 Stored user:", stored);

        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (e) {
        console.log("❌ Auth error", e);
      } finally {
        console.log("✅ Auth loading finished");
        setLoading(false);
      }
    };

    loadAuth();
  }, []);

  const signup = async (data: any) => {
    const res = await API.post("/api/auth/signup", data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
    setUser(res.data);
  };

  const login = async (phone: string, password: string) => {
    const res = await API.post("/api/auth/login", { phone, password });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
    setUser(res.data);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        loading,
        signup,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
