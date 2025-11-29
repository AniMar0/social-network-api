"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authUtils } from "@/lib/navigation";
import { initWebSocket } from "@/lib/websocket";
export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const redirectToUserProfile = async () => {
      try {
        // Check if user is authenticated and get user data
        const { loggedIn, user } = await authUtils.checkAuth();

        if (!loggedIn || !user) {
          // User not logged in, redirect to auth
          router.push("/");
          return;
        }
        // coruunt url
        //console.log("Current URL:", window.location.href);
        // Get user's profile URL/username
        initWebSocket(user.id);
        router.push(`/profile/${user.url}`);
      } catch (err) {
        console.error("Error redirecting to profile:", err);
        // If there's an error, redirect to home
        router.push("/");
      }
    };

    redirectToUserProfile();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div>Redirecting to your profile...</div>
    </div>
  );
}
