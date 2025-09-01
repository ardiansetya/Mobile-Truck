import { useAuth } from "@/context/AuthContext";
import { LoginRequest, RegisterRequest } from "@/types/auth.types";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";

export const useLogin = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(
    async (credentials: LoginRequest) => {
      try {
        setIsLoading(true);
        setError(null);

        const payload = {
          username: credentials.username.trim(),
          password: credentials.password.trim(),
        };

        await login(payload);
      } catch (err: unknown) {
        let msg = "Login failed";
        if (err instanceof Error) {
          msg = err.message;
        }
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [login]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    handleLogin,
    isLoading,
    error,
    clearError,
  };
};

export const useRegister = () => {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = useCallback(
    async (userData: RegisterRequest) => {
      try {
        setIsLoading(true);
        setError(null);
        const payload = {
          username: userData.username.trim(),
          password: userData.password,
          email: userData.email.trim(),
          phone_number: userData.phone_number.trim(),
          age: userData.age,
        };
        await register(payload);
      } catch (err: any) {
        setError(err.message || "Registration failed");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [register]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    handleRegister,
    isLoading,
    error,
    clearError,
  };
};

export const useLogout = () => {
  const { logout } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      await logout();

      router.replace("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [logout, router]);

  return {
    handleLogout,
    isLoading,
  };
};

export const useTokenRefresh = () => {
  const { refreshaccess_token } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshToken = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const newToken = await refreshaccess_token();
      return newToken;
    } catch (error) {
      console.error("Token refresh error:", error);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshaccess_token]);

  return {
    handleRefreshToken,
    isRefreshing,
  };
};

export const useAuthStatus = () => {
  const { isAuthenticated, loading, user, access_token } = useAuth();

  return {
    isAuthenticated,
    isLoading: loading,
    user,
    hasValidToken: !!access_token,
  };
};
