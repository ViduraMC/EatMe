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
  /** Resolves with the signed-in user, so the caller can greet them by name. */
  login: (input: LoginInput) => Promise<User>;
  /** Resolves with the new user; check `status` for "pending" recipients. */
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
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
    async (input: LoginInput): Promise<User> => {
      setIsSubmitting(true);
      try {
        const payload = await loginRequest(input);
        await applyAuth(payload);
        return payload.user;
      } finally {
        setIsSubmitting(false);
      }
    },
    [applyAuth],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<User> => {
      setIsSubmitting(true);

      try {
        const payload = await registerRequest(input);

        // A recipient awaiting approval is not signed in. The caller shows
        // the "we're verifying you" screen instead.
        if (payload.user.status === 'pending') {
          return payload.user;
        }

        await applyAuth(payload);
        return payload.user;
      } finally {
        setIsSubmitting(false);
      }
    },
    [applyAuth],
  );

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo(
    () => ({ user, isRestoring, isSubmitting, login, register, logout, updateUser }),
    [user, isRestoring, isSubmitting, login, register, logout, updateUser],
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
