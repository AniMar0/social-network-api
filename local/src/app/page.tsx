"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeFeed } from "@/components/home";
import { NewPostModal } from "@/components/newpost";
import { authUtils } from "@/lib/navigation";
import { initWebSocket, closeWebSocket } from "@/lib/websocket";

export default function HomePage() {
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { loggedIn, user } = await authUtils.checkAuth();

        if (loggedIn) {
          setUserLoggedIn(true);
          initWebSocket(user.id); // init WS once when user is logged in
        } else {
          router.push("/auth");
        }
      } catch (err) {
        console.error("Error checking auth:", err);
        router.push("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleNewPost = () => setIsNewPostModalOpen(true);

  const handleNavigate = async (itemId: string) => {
    switch (itemId) {
      case "home":
        router.push("/");
        break;
      case "explore":
        router.push("/explore");
        break;
      case "notifications":
        router.push("/notifications");
        break;
      case "messages":
        router.push("/messages");
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
    setIsNewPostModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!userLoggedIn) return null; // will redirect

  return (
    <div className="min-h-screen bg-background">
      <HomeFeed onNewPost={handleNewPost} onNavigate={handleNavigate} />

      <NewPostModal
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        onPost={handlePostSubmit}
      />
    </div>
  );
}
