"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ExplorePage from "@/components/explore";
import { NewPostModal } from "@/components/newpost";
import { authUtils } from "@/lib/navigation";
import { initWebSocket, closeWebSocket } from "@/lib/websocket";
import { siteConfig } from "@/config/site.config";

export default function Explore() {
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${siteConfig.domain}/api/logged`, {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          router.push("/");
          return;
        }

        const data = await res.json();
        if (!data.loggedIn) {
          router.push("/");
          return;
        }
        initWebSocket(data.user.id);
        setUserLoggedIn(true);
      } catch (err) {
        console.error("Error checking auth:", err);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleNewPost = () => {
    setIsNewPostModalOpen(true);
  };

  const handleNavigate = async (itemId: string) => {
    switch (itemId) {
      case "home":
        router.push("/");
        break;
      case "notifications":
        router.push("/notifications");
        break;
      case "messages":
        router.push("/messages");
        break;
      case "explore":
        router.push("/explore");
        break;
      case "profile":
        const user = await authUtils.CurrentUser();
        router.push(`/profile/${user.url}`);
        break;
      case "auth":
        // close WS on logout
        closeWebSocket();
        router.push("/auth");
        break;
      default:
        router.push("/");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePostSubmit = (postData: any) => {
    console.log("New post submitted:", postData);
    // TODO: Send the post to the backend
    setIsNewPostModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!userLoggedIn) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <ExplorePage onNewPost={handleNewPost} onNavigate={handleNavigate} />

      <NewPostModal
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        onPost={handlePostSubmit}
      />
    </div>
  );
}
