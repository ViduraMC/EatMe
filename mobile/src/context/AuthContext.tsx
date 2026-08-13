import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { loginRequest, meRequest, registerRequest } from '../api/auth.api';
import { setAuthToken, setUnauthorisedHandler } from '../api/client';
import { clearToken, loadToken, saveToken } from '../utils/tokenStorage';
import type { LoginInput, RegisterInput, User } from '../types';

interface AuthContextValue {
  user: User | null;
  /** True while the stored token is being checked on launch. */
  isRestoring: boolean;
  /** True while a login or register request is in flight. */
  isSubmitting: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearSession = useCallback(async () => {
    setUser(null);
    setAuthToken(null);
    await clearToken();
  }, []);

  /**
   * Restores the session on launch.
   *
   * The stored token is not trusted on its own: it is sent to /auth/me and the
   * user is only considered signed in if the server accepts it. That means a
   * token that expired while the app was closed, or an account an admin
   * suspended, correctly lands on the login screen instead of a broken session.
   */
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const token = await loadToken();
        if (!token) {
          return;
        }

        setAuthToken(token);
        const currentUser = await meRequest();
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        // Any failure here means the stored token is no good.
        await clearSession();
      } finally {
        if (!cancelled) {
          setIsRestoring(false);
        }
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  /*
   * Lets the axios interceptor end the session when the server returns 401,
   * without api/client.ts having to import this context and create a cycle.
   */
  useEffect(() => {
    setUnauthorisedHandler(() => {
      void clearSession();
    });
    return () => setUnauthorisedHandler(null);
  }, [clearSession]);

  const applyAuth = useCallback(async (payload: { user: User; token: string }) => {
    // Token first: it must be attached before any screen the navigator mounts
    // in response to the user change can fire its first request.
    setAuthToken(payload.token);
    await saveToken(payload.token);
    setUser(payload.user);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      setIsSubmitting(true);
      try {
        const payload = await loginRequest(input);
        await applyAuth(payload);
      } finally {
        setIsSubmitting(false);
      }
    },
    [applyAuth],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      setIsSubmitting(true);
      try {
        const payload = await registerRequest(input);
        await applyAuth(payload);
      } finally {
        setIsSubmitting(false);
      }
    },
    [applyAuth],
  );

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, isRestoring, isSubmitting, login, register, logout }),
    [user, isRestoring, isSubmitting, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
