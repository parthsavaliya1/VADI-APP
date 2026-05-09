import axios from "axios";

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  // NOTE: macOS often reserves :5000 (AirPlay/AirTunes). Prefer 5001+ for local dev.
  "http://192.168.1.18:5001";

export const API = axios.create({
  // baseURL: "https://vadi-backend.onrender.com",
  baseURL,
});
