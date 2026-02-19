import axios from "axios";

export const API = axios.create({
  baseURL: "https://vadi-backend.onrender.com",
  // baseURL: "http://192.168.29.55:5000",
});
