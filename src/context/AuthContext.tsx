import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse, UserAccountType } from '../types';
import { authService, DEMO_JUDGE_USER } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthResponse>;
  signup: (
    name: string,
    email: string,
    password: string,
    role?: UserAccountType,
    organization?: string
  ) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  quickDemoLogin: (type?: 'judge' | 'farmer') => User;
  updateProfile: (updates: Partial<User>) => void;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if token exists on mount and fetch fresh user profile from API if possible
    const token = authService.getToken();
    if (token && !user) {
      setIsLoading(true);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            setUser(data.user);
          }
        })
        .catch(() => {
          // Token expired or offline
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  const login = async (email: string, password: string, rememberMe = true): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password, rememberMe);
      if (res.success && res.user) {
        setUser(res.user);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: UserAccountType = 'Farmer',
    organization?: string
  ): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const res = await authService.signup(name, email, password, role, organization);
      if (res.success && res.user) {
        setUser(res.user);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const quickDemoLogin = (type: 'judge' | 'farmer' = 'judge') => {
    const u = authService.quickDemoLogin(type);
    setUser(u);
    return u;
  };

  const updateProfile = (updates: Partial<User>) => {
    const updated = authService.updateProfile(updates);
    if (updated) {
      setUser({ ...updated });
    }
  };

  const forgotPassword = async (email: string) => {
    return authService.forgotPassword(email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        quickDemoLogin,
        updateProfile,
        forgotPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
