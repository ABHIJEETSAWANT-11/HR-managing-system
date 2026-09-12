import axios from "axios";
import { env } from "../env";
import { tokenStore } from "../../auth/tokenStore";

export const client = axios.create({
  baseURL: env.VITE_API_BASE_URL + "/api/v1",
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      // Only redirect if not already on login page
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
