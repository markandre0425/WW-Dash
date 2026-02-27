import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface UserProfile {
  displayName: string;
  email: string;
  bio: string;
  avatarUrl: string | null;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  fetchProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType>({
  profile: null,
  loading: false,
  error: null,
  updateProfile: async () => {},
  fetchProfile: async () => {},
});

// Get API base URL - use port 3001 for backend
const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) return apiUrl;

  // In development, route API calls to port 3001
  if (import.meta.env.DEV) {
    return "http://localhost:3001";
  }

  // In production, use same origin
  return "";
};

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = getApiUrl();
      console.log("Fetching profile from:", `${apiUrl}/api/user/profile`);
      const response = await fetch(`${apiUrl}/api/user/profile`, {
        method: "GET",
        credentials: "include",
      });
      console.log("Profile response status:", response.status);
      if (!response.ok) {
        if (response.status === 401) {
          console.log("Not authenticated - profile fetch skipped");
          setError(null);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.profile) {
        setProfile(data.profile);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to fetch profile:", message, err);
      setError(null); // Don't show error for auth failures
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/user/profile`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error("Failed to save profile");
      }
      const data = await response.json();
      setProfile(data.profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Failed to update profile:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        updateProfile,
        fetchProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}
