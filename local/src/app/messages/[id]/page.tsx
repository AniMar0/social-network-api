"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MessagesPage from "@/components/messages";
import { NewPostModal } from "@/components/newpost";
import { siteConfig } from "@/config/site.config";

export default function Messages() {
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const params = useParams();

  const resiverID = params.id as string;

  function isNumberRegex(str: string): boolean {
    return /^[0-9]+$/.test(str);
  }

  useEffect(() => {
    if (!isNumberRegex(resiverID) && resiverID !== "chats") {
      router.push("/404");
    }
  }, [resiverID, router]);

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
          router.push("/auth");
          return;
        }
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

  useEffect(() => {
    if (userLoggedIn && resiverID && resiverID !== "chats") {
      const setSeenChat = (chatId: string) => {
        fetch(`${siteConfig.domain}/api/set-seen-chat/${chatId}`, {
          method: "POST",
          credentials: "include",
        })
          .then((res) => {
            if (!res.ok) throw new Error("Failed to set seen chat");
          })
          .then(() => {
            console.log("Chat seen");
          })
          .catch((err) => console.error(err));
      };
      setSeenChat(resiverID);
    }
  }, [userLoggedIn, resiverID]);

  const handleNewPost = () => {
    setIsNewPostModalOpen(true);
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
      <MessagesPage onUserProfileClick={resiverID} onNewPost={handleNewPost} />

      <NewPostModal
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        onPost={handlePostSubmit}
      />
    </div>
  );
}
