import axios from "axios";

export const API = axios.create({
  baseURL: "http://192.168.29.56:5000",
});
