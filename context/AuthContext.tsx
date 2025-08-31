// context/AuthContext.tsx
import api, {
  ACCESS_TOKEN_KEY,
  clearTokens,
  REFRESH_TOKEN_KEY,
  refreshAccessToken,
} from "@/services/axios";
import {
  AuthContextType,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  TokenPayload,
  User,
} from "@/types/auth.types";
import { useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Initialize auth state on app start
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const [storedAccessToken, storedRefreshToken, storedUser] =
          await Promise.all([
            SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
            SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
            SecureStore.getItemAsync("user"),
          ]);

        if (
          storedAccessToken &&
          storedRefreshToken &&
          storedUser &&
          isMounted
        ) {
          // Check if access token is still valid
          const decoded: TokenPayload = jwtDecode(storedAccessToken);
          const currentTime = Date.now() / 1000;

          if (decoded.exp > currentTime) {
            // Token is still valid
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setAccessToken(storedAccessToken);
            setRefreshToken(storedRefreshToken);
          } else {
            // Token expired, try to refresh

            try {
              const newAccessToken = await refreshAccessToken();
              if (newAccessToken && isMounted) {
                const parsedUser = JSON.parse(storedUser);
                const newRefreshToken =
                  await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

                setUser(parsedUser);
                setAccessToken(newAccessToken);
                setRefreshToken(newRefreshToken);
              }
            } catch (error: unknown) {
              await clearTokens();
            }
          }
        }
      } catch (error) {
        console.error("❌ Error initializing auth:", error);
        await clearTokens();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Login function
  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      setLoading(true);

      const response = await api.post<LoginResponse>(
        "/auth/login",
        credentials
      );

      const { access_token: newAccessToken, refresh_token: newRefreshToken } =
        response.data.data;

      // Store tokens and user data
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken),
        // SecureStore.setItemAsync('user', JSON.stringify(userData)),
      ]);

      // Update state
      // setUser(userData);
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      // Invalidate profile and role queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["user_profile"] });
      queryClient.invalidateQueries({ queryKey: ["validate_role"] });

      //
    } catch (error: any) {
      console.error(
        "❌ Login failed:",
        error.response.data.errors || error.response
      );
      throw error.response.data.errors;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData: RegisterRequest): Promise<void> => {
    try {
      setLoading(true);

      await api.post("/auth/register", userData);
    } catch (error: any) {
      console.error("❌ Registration failed:", error);

      let errorMessage = "Registrasi gagal";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        if (typeof errors === "object") {
          const firstError = Object.values(errors)[0];
          errorMessage = Array.isArray(firstError)
            ? firstError[0]
            : (firstError as string);
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);

      // Optional: Call API logout jika ada
      // await api.post('/auth/logout');

      // ✅ Bersihkan cache react-query
      queryClient.clear();

      // ✅ Hapus semua token & user info
      await clearTokens();

      // ✅ Reset state auth
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
    } catch (error) {
      console.error("❌ Logout error:", error);
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh token function (exposed for external use)
  const refreshAccessTokenManual = async (): Promise<string | null> => {
    try {
      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        setAccessToken(newAccessToken);
        const newRefreshToken =
          await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        setRefreshToken(newRefreshToken);
      }
      return newAccessToken;
    } catch (error) {
      console.error("❌ Manual token refresh failed:", error);
      await logout();
      return null;
    }
  };

  const contextValue: AuthContextType = {
    user,
    access_token: accessToken,
    refresh_token: refreshToken,
    loading,
    isAuthenticated: !!accessToken,
    login,
    register,
    logout,
    refreshaccess_token: refreshAccessTokenManual,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
