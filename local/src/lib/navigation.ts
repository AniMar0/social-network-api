/**
 * Navigation utilities for the social network app
 */

import { useRouter } from "next/navigation";
import { siteConfig } from "@/config/site.config";

export interface NavigationProps {
  onNavigate?: (itemId: string) => void;
  onUserProfileClick?: (url: string) => void;
}

/**
 * Hook for navigation between routes
 */
export const useAppNavigation = () => {
  const router = useRouter();

  const navigateTo = (route: string) => {
    router.push(route);
  };

  const navigateToProfile = (url: string) => {
    router.push(`/profile/${url}`);
  };

  const navigateToHome = () => {
    router.push("/");
  };

  const navigateToAuth = () => {
    router.push("/auth");
  };

  const handleStandardNavigation = async (itemId: string) => {
    switch (itemId) {
      case "home":
        navigateToHome();
        break;
      case "profile":
        // Navigate to current user's profile
        // TODO: ADD YOUR BACKEND LOGIC HERE - Get user's profile URL from database
        // const user = await authUtils.CurrentUser();
        // navigateToProfile(user.url);
        break;
      case "auth":
        navigateToAuth();
        break;
      default:
        navigateToHome();
    }
  };

  return {
    navigateTo,
    navigateToProfile,
    navigateToHome,
    navigateToAuth,
    handleStandardNavigation,
  };
};

/**
 * Utility function to get user profile URL
 */

/**
 * Utility function to check if a URL is a valid username/profile URL
 */
export const isValidProfileUrl = (url: string): boolean => {
  // Add your validation logic here
  // For now, basic validation - no spaces, special characters, etc.
  return /^[a-zA-Z0-9_-]+$/.test(url);
};

/**
 * Utility function to extract username from current URL
 */
export const extractUsernameFromUrl = (pathname: string): string | null => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1 && isValidProfileUrl(segments[0])) {
    return segments[0];
  }
  return null;
};

/**
 * Authentication utilities
 */
export const authUtils = {
  checkAuth: async () => {
    try {
      const res = await fetch(`${siteConfig.domain}/api/logged`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        return { loggedIn: false, user: null };
      }

      const data = await res.json();
      return { loggedIn: data.loggedIn, user: data.user };
    } catch (err) {
      console.error("Error checking auth:", err);
      return { loggedIn: false, user: null };
    }
  },

  CurrentUser: async () => {
    try {
      const res = await fetch(`${siteConfig.domain}/api/me`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Error fetching user profile:", err);
      return null;
    }
  },
  logout: async () => {
    try {
      await fetch(`${siteConfig.domain}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
      // Trigger storage event to notify other components
      localStorage.setItem("logout", Date.now().toString());
      localStorage.removeItem("logout");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  },
};

/**
 * User profile utilities
 */
export const profileUtils = {
  // TODO: Add function to fetch user profile by username
  fetchUserProfile: async (url: string) => {
    try {
      // TODO: Replace with actual backend endpoint
      const res = await fetch(
        `${siteConfig.domain}/api/profile/${url}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Error fetching user profile:", err);
      return null;
    }
  },
};
