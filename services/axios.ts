import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || Constants.manifest2?.extra || {};
const { apiUrl } = extra as { apiUrl: string };

// console.log("API_URL:", apiUrl);

// const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://154.19.37.110:8080";

// Token storage keys
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// Store for refresh token promise to prevent multiple simultaneous refresh calls
let refresh_tokenPromise: Promise<string | null> | null = null;

// Create axios instance
const api = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// =======================
// REQUEST INTERCEPTOR
// =======================
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const access_token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (access_token && config.headers) {
        config.headers.Authorization = `Bearer ${access_token}`;
      }
    } catch (error) {
      console.error("❌ Error getting access token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =======================
// RESPONSE INTERCEPTOR
// =======================
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (refresh_tokenPromise) {
          const newToken = await refresh_tokenPromise;
          if (newToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } else {
          refresh_tokenPromise = refreshAccessToken();
          const newToken = await refresh_tokenPromise;
          refresh_tokenPromise = null;

          if (newToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error("❌ Token refresh failed (interceptor):", refreshError);
        await clearTokens();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// =======================
// REFRESH TOKEN FUNCTION
// =======================
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refresh_token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (!refresh_token) {
      console.warn("⚠️ No refresh token available");
      return null;
    }

    const refreshApi = axios.create({
      baseURL: apiUrl,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const response = await refreshApi.post("/auth/refresh-token", {
      refresh_token,
    });

    // ✅ Ambil token dari nested data
    const access_token = response.data?.data?.access_token || null;
    const newrefresh_token =
      response.data?.data?.refresh_token || refresh_token;

    // Simpan hanya jika string
    if (access_token && typeof access_token === "string") {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access_token);
    }
    if (newrefresh_token && typeof newrefresh_token === "string") {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newrefresh_token);
    }

    return access_token;
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    await clearTokens();
    return null;
  }
};

// =======================
// CLEAR TOKENS
// =======================
const clearTokens = async (): Promise<void> => {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync("user"),
    ]);
  } catch (error) {
    console.error("❌ Error clearing tokens:", error);
  }
};

export { ACCESS_TOKEN_KEY, clearTokens, REFRESH_TOKEN_KEY, refreshAccessToken };
export default api;
