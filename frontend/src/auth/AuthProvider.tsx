import React, { createContext, useContext, useState, useEffect } from "react";
import { client } from "../lib/api/client";
import { tokenStore } from "./tokenStore";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      // If there's no token in memory, we don't try to fetch /me.
      // However, we wouldn't have it on reload anyway. We rely on the user logging in again
      // per this specific strict MVP model, or we'd need to store it somewhere.
      // Wait, the plan specifies: single JWT (24h expiry) in-memory only. On reload, the token is lost.
      // This means a full page reload logs the user out. That's a conscious security trade-off.
      
      const token = tokenStore.get();
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      try {
        const res = await client.get("/users/me");
        setUser(res.data.data.user);
      } catch (error) {
        tokenStore.clear();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMe();
  }, []);

  const login = (token: string, userData: User) => {
    tokenStore.set(token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await client.post("/auth/logout"); // Send logout for audit logs
    } catch (e) {
      // Ignore
    } finally {
      tokenStore.clear();
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
