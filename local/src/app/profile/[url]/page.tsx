"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import UserProfile from "@/components/user-profile";
import { NewPostModal } from "@/components/newpost";
import { profileUtils } from "@/lib/navigation";
import { initWebSocket } from "@/lib/websocket";
import { siteConfig } from "@/config/site.config";
export default function UserProfilePage() {
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userData, setUserData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);

  const router = useRouter();
  const params = useParams();
  const userUrl = params.url as string;

  useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
      try {
        // First check if user is logged in
        const authRes = await fetch(`${siteConfig.domain}/api/logged`, {
          method: "POST",
          credentials: "include",
        });

        if (!authRes.ok) {
          // User not logged in, redirect to auth
          console.log("User not logged in - auth check failed");
          router.push("/");
          return;
        }

        const authData = await authRes.json();
        if (!authData.loggedIn) {
          // User not logged in, redirect to auth
          console.log("User not logged in");
          router.push("/");
          return;
        }
        initWebSocket(authData.user.id);
        setUserLoggedIn(true);
        setCurrentUser(authData.user);

        const data = await profileUtils.fetchUserProfile(userUrl);
        if (!data) {
          // User not found, redirect to 404 or home
          router.push("/404");
          return;
        }
        const isOwn = authData.user.url === userUrl;

        if (isOwn) {
          // If viewing own profile, use the current user's data
          setUserData(data.user);
          setPosts(data.posts || []);
          setIsOwnProfile(isOwn);
        } else {
          data.user.isfollowing = data.isfollowing;
          data.user.isfollower = data.isfollower;
          setUserData(data.user);
          setPosts(data.posts || []);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    if (userUrl) {
      checkAuthAndLoadProfile();
    }
  }, [userUrl, router]);

  const handleNewPost = () => {
    setIsNewPostModalOpen(true);
  };

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
        // Navigate to current user's profile
        if (currentUser) {
          // TODO: ADD YOUR BACKEND LOGIC HERE - Get user's profile URL from database
          // Replace this logic to use the actual profile URL field from your database
          const profileUrl = currentUser.url;
          router.push(`/profile/${profileUrl}`);
        }
        break;
      case "auth":
        // Handle logout
        router.push("/");
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
        <div>Loading profile...</div>
      </div>
    );
  }

  if (!userLoggedIn) {
    return null; // Will redirect
  }

  return (
    userData && (
      <div className="min-h-screen bg-background">
        <UserProfile
          isOwnProfile={isOwnProfile}
          userData={userData}
          posts={posts}
          onNewPost={handleNewPost}
          onNavigate={handleNavigate}
        />

        <NewPostModal
          isOpen={isNewPostModalOpen}
          onClose={() => setIsNewPostModalOpen(false)}
          onPost={handlePostSubmit}
        />
      </div>
    )
  );
}
