"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GroupsPage } from "@/components/groups";
import { NewPostModal } from "@/components/newpost";
import { authUtils } from "@/lib/navigation";
import { initWebSocket } from "@/lib/websocket";

export default function Groups() {
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
          initWebSocket(user.id);
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

  if (!userLoggedIn) return null;

  return (
    <div className="min-h-screen bg-background">
      <GroupsPage onNewPost={handleNewPost} />

      <NewPostModal
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        onPost={handlePostSubmit}
      />
    </div>
  );
}
