// User Profile Page Component
// Displays user info, posts, and handles follow, like, and profile update actions
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ProfileSettings } from "./account-settings";
import type { UserData } from "./account-settings";
import { SidebarNavigation } from "./sidebar";
import {
  Heart,
  MessageCircle,
  Mail,
  Calendar,
  Users,
  MessageSquare,
  Lock,
  Smile,
  ImagePlay,
  Send,
} from "lucide-react";
import { authUtils } from "@/lib/navigation";
import { useNotificationCount } from "@/lib/notifications";
import EmojiPicker, { Theme } from "emoji-picker-react";
import GifPicker from "gif-picker-react";
import { siteConfig } from "@/config/site.config";

interface Comment {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
}

// Post interface for user posts
export interface Post {
  id: string; // Unique post ID
  content: string; // Post text content
  image?: string; // Optional image URL
  createdAt: string; // ISO date string
  likes: number; // Number of likes
  comments: number; // Number of comments
  isLiked: boolean; // If current user liked this post
  commentsList?: Comment[];
}

// Props for UserProfile component
interface UserProfileProps {
  isOwnProfile?: boolean; // Is this the current user's profile?
  isFollowing?: boolean; // Is the current user following this profile?
  isFollower?: boolean;
  userData: UserData; // User profile data
  posts: Post[]; // List of user posts
  onNewPost?: () => void; // Callback to open new post dialog
  onNavigate?: (itemId: string) => void;
}

function UserProfile({
  isOwnProfile = false,
  isFollowing = false,
  isFollower = false,
  userData,
  posts = [],
  onNewPost,
}: UserProfileProps) {
  // Get notification count for sidebar
  const notificationCount = useNotificationCount();
  // State for profile data (can be updated by settings dialog)
  const [profileData, setProfileData] = useState(userData);
  // State for following/unfollowing this user
  const [followingState, setFollowingState] = useState(
    userData.isfollowing || isFollowing
  );
  // State for follow request status
  const [followRequestStatus, setFollowRequestStatus] = useState<
    "none" | "pending" | "accepted" | "declined"
  >(userData.followRequestStatus || "none");
  // State for liked posts (IDs)
  const [postsState, setPostsState] = useState(posts);
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // State for message dialog
  const [messageDialogOpen, setMessageDialogOpen] = useState(
    userData.isfollowing || isFollowing || userData.isfollower || isFollower
  );

  // Comment-related states
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [replyingTo, setReplyingTo] = useState<{
    [key: string]: string | null;
  }>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<{
    [key: string]: boolean;
  }>({});
  const [showGifPicker, setShowGifPicker] = useState<{
    [key: string]: boolean;
  }>({});

  // Called when profile settings are saved
  const handleProfileUpdate = (updatedData: UserData) => {
    setProfileData(updatedData);
  };

  // Toggle follow/unfollow state or send follow request for private profiles
  const handleFollowToggle = async () => {
    try {
      const currentUser = await authUtils.CurrentUser();
      if (!currentUser) {
        console.error("No logged in user");
        return;
      }

      const body = {
        follower: currentUser.id,
        following: profileData.id,
      };

      if (followingState) {
        // Unfollow user
        await fetch(`${siteConfig.domain}/api/unfollow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        setProfileData((prev) => ({
          ...prev,
          followersCount: prev.followersCount - 1,
        }));
        setFollowingState(false);
        setFollowRequestStatus("none");
        setMessageDialogOpen(false);
      } else if (followRequestStatus === "pending") {
        // Cancel pending follow request

        console.log("sending cancel request", body);
        await fetch(`${siteConfig.domain}/api/cancel-follow-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        setFollowRequestStatus("none");
        setMessageDialogOpen(false);
      } else {
        // Check if profile is private
        if (profileData.isPrivate) {
          // Send follow request for private profile
          await fetch(`${siteConfig.domain}/api/send-follow-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          });

          setFollowRequestStatus("pending");
          setMessageDialogOpen(false);
        } else {
          // Follow public profile instantly
          await fetch(`${siteConfig.domain}/api/follow`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          });

          setProfileData((prev) => ({
            ...prev,
            followersCount: prev.followersCount + 1,
          }));
          setFollowingState(true);
          setFollowRequestStatus("accepted");
          setMessageDialogOpen(true);
        }
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  // Like or unlike a post
  // TODO: Call backend to like/unlike post
  const handleLikePost = async (postId: string) => {
    try {
      const res = await fetch(`${siteConfig.domain}/api/like/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await res.json();
      const isLiked = data.liked ?? false;

      // حدّث state
      setPostsState((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked,
                likes: isLiked ? post.likes + 1 : post.likes - 1,
              }
            : post
        )
      );
    } catch (err) {
      console.error("Failed to like post", err);
    }
  };

  // Comment handling functions
  const handleEmojiSelect = (emoji: string, postId: string) => {
    setNewComment((prev) => ({
      ...prev,
      [postId]: (prev[postId] || "") + emoji,
    }));
    // Don't close emoji picker - let user add multiple emojis
  };

  const handleGifSelect = (gifUrl: string, postId: string) => {
    // For comments, we'll treat GIFs as image content that gets submitted
    setNewComment((prev) => ({
      ...prev,
      [postId]: (prev[postId] || "") + `![GIF](${gifUrl})`,
    }));
    setShowGifPicker((prev) => ({
      ...prev,
      [postId]: false,
    }));
  };

  const toggleComments = async (postId: string) => {
    try {
      const res = await fetch(
        `${siteConfig.domain}/api/get-comments/${postId}`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setPostsState((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                commentsList: data || [],
              }
            : post
        )
      );
    } catch (err) {
      console.error("Failed to fetch comments", err);
    }
    setShowComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleCommentSubmit = async (
    postId: string,
    parentCommentId?: string
  ) => {
    const commentText = newComment[postId];
    if (!commentText?.trim()) return;

    try {
      const res = await fetch(`${siteConfig.domain}/api/create-comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: commentText,
          parentCommentId: parentCommentId || null,
          postId: postId,
        }),
      });

      const data = await res.json();

      console.log(" New comment: ", data);

      // Update the post with new comment
      setPostsState((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments + 1,
                commentsList: post.commentsList
                  ? parentCommentId
                    ? post.commentsList.map((comment) => {
                        if (comment.id === parentCommentId) {
                          return {
                            ...comment,
                            replies: [...(comment.replies || []), data],
                          };
                        }
                        return comment;
                      })
                    : [...post.commentsList, data]
                  : [data],
              }
            : post
        )
      );

      // Clear input
      setNewComment((prev) => ({
        ...prev,
        [postId]: "",
      }));

      // clear reply
      setReplyingTo((prev) => ({
        ...prev,
        [postId]: null,
      }));
    } catch (err) {
      console.error("Failed to post comment", err);
    }
  };

  const handleCommentLike = async (commentId: string, postId: string) => {
    try {
      const res = await fetch(
        `${siteConfig.domain}/api/like-comment/${commentId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to like comment");
      const data = await res.json();

      console.log("Comment liked:", data);

      // Update the comment likes in the post
      setPostsState((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId && post.commentsList) {
            return {
              ...post,
              commentsList: updateCommentLikes(
                post.commentsList,
                commentId,
                data.liked
              ),
            };
          }
          return post;
        })
      );
    } catch (err) {
      console.error("Failed to like comment", err);
    }
  };

  const updateCommentLikes = (
    comments: Comment[],
    commentId: string,
    isLiked: boolean
  ): Comment[] => {
    return comments.map((comment) => {
      if (comment.id === commentId) {
        return {
          ...comment,
          isLiked,
          likes: isLiked ? comment.likes + 1 : comment.likes - 1,
        };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentLikes(comment.replies, commentId, isLiked),
        };
      }
      return comment;
    });
  };

  const handleReply = (postId: string, commentId: string) => {
    setReplyingTo((prev) => ({
      ...prev,
      [postId]: commentId,
    }));
  };

  const renderComment = (comment: Comment, postId: string, isReply = false) => {
    return (
      <div
        key={comment.id}
        className={`${
          isReply ? "ml-8 mt-2" : "mt-4"
        } border-l-2 border-muted pl-4`}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={`${siteConfig.domain}/${comment.author.avatar}`}
              alt={comment.author.name}
            />
            <AvatarFallback className="bg-muted text-foreground text-xs">
              {comment.author.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-foreground">
                  {comment.author.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-foreground">{comment.content}</p>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCommentLike(comment.id, postId)}
                className={`flex items-center gap-1 h-6 px-2 ${
                  comment.isLiked ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                <Heart
                  className={`h-3 w-3 ${comment.isLiked ? "fill-current" : ""}`}
                />
                <span className="text-xs">{comment.likes}</span>
              </Button>
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReply(postId, comment.id)}
                  className="flex items-center gap-1 h-6 px-2 text-muted-foreground"
                >
                  <MessageCircle className="h-3 w-3" />
                  <span className="text-xs">Reply</span>
                </Button>
              )}
            </div>
            {/* Render replies */}
            {comment.replies &&
              comment.replies.map((reply) =>
                renderComment(reply, postId, true)
              )}
          </div>
        </div>
      </div>
    );
  };

  // Can the current user view posts? (private logic)
  const canViewPosts =
    isOwnProfile ||
    !profileData.isPrivate ||
    followingState ||
    followRequestStatus === "accepted";

  // Get follow button text based on current state
  const getFollowButtonText = () => {
    if (followingState) {
      return "Following";
    }

    if (profileData.isPrivate) {
      switch (followRequestStatus) {
        case "pending":
          return "Cancel Request";
        case "declined":
          return "Request Declined";
        default:
          return "Send Follow Request";
      }
    }

    return "Follow";
  };

  // Get follow button variant based on current state
  const getFollowButtonVariant = () => {
    if (followingState) {
      return "outline" as const;
    }

    if (followRequestStatus === "pending") {
      return "outline" as const;
    }

    if (followRequestStatus === "declined") {
      return "destructive" as const;
    }

    return "default" as const;
  };

  const handleMessage = async () => {
    console.log("Sending message to:", profileData.id);
    try {
      const res = await fetch(
        `${siteConfig.domain}/api/make-message/${profileData.id}`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      console.log("Message sent successfully:", data);
      window.location.href = `/messages/${data}`;
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleNewPost = () => {
    onNewPost?.();
    console.log("Opening new post dialog");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Main render
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Navigation */}
      <SidebarNavigation
        activeItem={isOwnProfile ? "profile" : ""}
        onNewPost={handleNewPost}
        notificationCount={notificationCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={toggleMobileMenu}
      />

      {/* Main content with left margin for sidebar */}
      <main className="flex-1 lg:ml-72 w-full">
        {/* Profile Header */}
        <div className="relative">
          {/* Cover Image Placeholder - could be added to user model later */}
          <div className="h-64 w-full bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background"></div>
          </div>

          <div className="max-w-5xl mx-auto px-6 -mt-32 relative z-10">
            <div className="glass-card p-8 rounded-3xl border border-border/50 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Settings button (top-right) - only for profile owner */}
                {isOwnProfile && (
                  <div className="absolute right-6 top-6">
                    <ProfileSettings
                      userData={profileData}
                      onSave={handleProfileUpdate}
                    />
                  </div>
                )}

                {/* Avatar */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <Avatar className="h-40 w-40 border-4 border-background relative">
                    <AvatarImage
                      src={
                        `${siteConfig.domain}/${profileData.avatar}` ||
                        `${siteConfig.domain}/uploads/default.jpg`
                      }
                      alt={`${profileData.firstName} ${profileData.lastName}`}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-4xl bg-muted text-foreground font-bold">
                      {profileData.firstName[0]}
                      {profileData.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* User Info */}
                <div className="flex-1 space-y-5 pt-2">
                  {/* Name and nickname */}
                  <div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">
                      {profileData.firstName} {profileData.lastName}
                    </h1>
                    {profileData.nickname && (
                      <p className="text-lg text-muted-foreground font-medium">
                        @{profileData.nickname}
                      </p>
                    )}
                  </div>

                  {/* Bio */}
                  {profileData.aboutMe && (
                    <p className="text-foreground/90 leading-relaxed max-w-2xl text-lg">
                      {profileData.aboutMe}
                    </p>
                  )}

                  {/* Contact Info */}
                  <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
                      <Mail className="h-4 w-4 text-primary" />
                      {profileData.email}
                    </div>
                    <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
                      <Calendar className="h-4 w-4 text-primary" />
                      Born{" "}
                      {new Date(profileData.dateOfBirth).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-8 py-2">
                    <div className="text-center md:text-left">
                      <span className="block text-2xl font-bold text-foreground">
                        {profileData.followersCount}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">
                        Followers
                      </span>
                    </div>
                    <div className="text-center md:text-left">
                      <span className="block text-2xl font-bold text-foreground">
                        {profileData.followingCount}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">
                        Following
                      </span>
                    </div>
                    <div className="text-center md:text-left">
                      <span className="block text-2xl font-bold text-foreground">
                        {posts.length}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">
                        Posts
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!isOwnProfile && (
                    <div className="flex gap-4 pt-2">
                      {messageDialogOpen && (
                        <Button
                          variant="default"
                          className="flex items-center gap-2 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-full px-6"
                          onClick={handleMessage}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </Button>
                      )}
                      <Button
                        onClick={handleFollowToggle}
                        variant={getFollowButtonVariant()}
                        className={`flex items-center gap-2 cursor-pointer rounded-full px-6 ${
                          followingState
                            ? "border-primary/50 text-primary hover:bg-primary/10"
                            : ""
                        }`}
                        disabled={followRequestStatus === "declined"}
                      >
                        <Users className="h-4 w-4" />
                        {getFollowButtonText()}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <span className="bg-primary/20 p-2 rounded-lg text-primary">
                <ImagePlay className="h-5 w-5" />
              </span>
              Posts
            </h2>
            {/* Filter or view options could go here */}
          </div>

          {canViewPosts ? (
            <div className="space-y-8">
              {posts.length > 0 ? (
                postsState.map((post) => (
                  <Card
                    key={post.id}
                    className="glass-card border-0 overflow-hidden hover:shadow-lg transition-all duration-300"
                  >
                    <CardContent className="p-0">
                      {/* Post Header */}
                      <div className="p-5 flex items-center gap-4 border-b border-border/40 bg-white/5">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                          <AvatarImage
                            src={
                              `${siteConfig.domain}/${profileData.avatar}` ||
                              `${siteConfig.domain}/uploads/default.jpg`
                            }
                            alt={`${profileData.firstName} ${profileData.lastName}`}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {profileData.firstName[0]}
                            {profileData.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-foreground">
                            {profileData.firstName} {profileData.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">
                            {new Date(post.createdAt).toLocaleDateString(
                              undefined,
                              { dateStyle: "long" }
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Post Content */}
                      <div className="p-5 space-y-4">
                        <p className="text-foreground/90 leading-relaxed text-[15px] whitespace-pre-wrap">
                          {post.content}
                        </p>

                        {post.image && (
                          <div className="rounded-xl overflow-hidden bg-black/5 border border-border/20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                post.image.startsWith("http")
                                  ? post.image
                                  : `${siteConfig.domain}/${post.image}`
                              }
                              alt="Post content"
                              className="w-full h-auto max-h-[500px] object-contain"
                            />
                          </div>
                        )}
                      </div>

                      {/* Post Actions */}
                      <div className="px-5 py-3 flex items-center gap-6 border-t border-border/40 bg-muted/20">
                        <button
                          onClick={() => handleLikePost(post.id)}
                          className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-1.5 rounded-full hover:bg-red-500/10 ${
                            post.isLiked
                              ? "text-red-500"
                              : "text-muted-foreground hover:text-red-500"
                          }`}
                        >
                          <Heart
                            className={`h-5 w-5 ${
                              post.isLiked ? "fill-current" : ""
                            }`}
                          />
                          {post.likes}
                        </button>
                        <button
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-blue-400 hover:bg-blue-400/10 px-3 py-1.5 rounded-full transition-colors"
                        >
                          <MessageCircle className="h-5 w-5" />
                          {post.comments}
                        </button>
                      </div>

                      {/* Comments Section */}
                      {showComments[post.id] && (
                        <div className="bg-muted/30 border-t border-border/40 p-5 animate-in slide-in-from-top-2">
                          {/* Comment Input */}
                          <div className="flex items-start gap-3 mb-6">
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage
                                src={`${siteConfig.domain}/${profileData.avatar}`}
                                alt="You"
                              />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                You
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                              <div className="relative">
                                <Input
                                  placeholder={
                                    replyingTo[post.id]
                                      ? "Write a reply..."
                                      : "Write a comment..."
                                  }
                                  value={newComment[post.id] || ""}
                                  onChange={(e) =>
                                    setNewComment((prev) => ({
                                      ...prev,
                                      [post.id]: e.target.value,
                                    }))
                                  }
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                      handleCommentSubmit(
                                        post.id,
                                        replyingTo[post.id] || undefined
                                      );
                                    }
                                  }}
                                  className="pr-20 bg-background/50 border-border/60 focus-visible:ring-primary/30"
                                />
                                <div className="absolute right-1 top-1 flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setShowEmojiPicker((prev) => ({
                                        ...prev,
                                        [post.id]: !prev[post.id],
                                      }));
                                      setShowGifPicker((prev) => ({
                                        ...prev,
                                        [post.id]: false,
                                      }));
                                    }}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary rounded-full"
                                  >
                                    <Smile className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setShowGifPicker((prev) => ({
                                        ...prev,
                                        [post.id]: !prev[post.id],
                                      }));
                                      setShowEmojiPicker((prev) => ({
                                        ...prev,
                                        [post.id]: false,
                                      }));
                                    }}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary rounded-full"
                                  >
                                    <ImagePlay className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleCommentSubmit(
                                      post.id,
                                      replyingTo[post.id] || undefined
                                    )
                                  }
                                  disabled={!newComment[post.id]?.trim()}
                                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 h-7 text-xs"
                                >
                                  <Send className="h-3 w-3 mr-2" />
                                  {replyingTo[post.id] ? "Reply" : "Comment"}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Emoji & GIF Pickers */}
                          {showEmojiPicker[post.id] && (
                            <div className="mb-4 relative z-10">
                              <div className="absolute top-0 left-0 shadow-2xl rounded-xl overflow-hidden">
                                <EmojiPicker
                                  onEmojiClick={(e) =>
                                    handleEmojiSelect(e.emoji, post.id)
                                  }
                                  theme={Theme.DARK}
                                  width={300}
                                  height={350}
                                />
                              </div>
                            </div>
                          )}
                          {showGifPicker[post.id] && (
                            <div className="mb-4 relative z-10">
                              <div className="absolute top-0 left-0 shadow-2xl rounded-xl overflow-hidden bg-card">
                                <GifPicker
                                  onGifClick={(g) =>
                                    handleGifSelect(g.url, post.id)
                                  }
                                  tenorApiKey="AIzaSyB78CUkLJjdlA67853bVqpcwjJaywRAlaQ"
                                  width={300}
                                  theme={Theme.DARK}
                                />
                              </div>
                            </div>
                          )}

                          {/* Cancel Reply Button */}
                          {replyingTo[post.id] && (
                            <div className="mb-3 flex items-center justify-between bg-primary/5 p-2 rounded-lg border border-primary/10">
                              <span className="text-xs text-primary font-medium">
                                Replying to comment...
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setReplyingTo((prev) => ({
                                    ...prev,
                                    [post.id]: null,
                                  }))
                                }
                                className="h-6 text-xs text-muted-foreground hover:text-destructive"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}

                          {/* Comments List */}
                          <div className="space-y-4 mt-6">
                            {post.commentsList &&
                            post.commentsList.length > 0 ? (
                              post.commentsList.map((comment) =>
                                renderComment(comment, post.id)
                              )
                            ) : (
                              <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed border-border/50">
                                <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  No comments yet. Be the first to share your
                                  thoughts!
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                // No posts fallback
                <div className="glass-card p-12 text-center rounded-3xl border-dashed border-2 border-border/50">
                  <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImagePlay className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    No posts yet
                  </h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile
                      ? "Share your first post with the world!"
                      : "This user hasn't posted anything yet."}
                  </p>
                  {isOwnProfile && (
                    <Button
                      onClick={handleNewPost}
                      className="mt-6 rounded-full"
                    >
                      Create Post
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Private profile fallback (locked)
            <div className="glass-card p-16 text-center rounded-3xl border border-border/50 shadow-xl">
              <div className="bg-muted/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">
                This profile is private
              </h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
                {followRequestStatus === "pending"
                  ? `Your follow request to ${profileData.firstName} is pending approval.`
                  : followRequestStatus === "declined"
                  ? `Your follow request to ${profileData.firstName} was declined.`
                  : `Follow ${profileData.firstName} to see their posts and activity.`}
              </p>
              {/* Show follow button if not own profile */}
              {!isOwnProfile && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleFollowToggle}
                    variant={getFollowButtonVariant()}
                    className="flex items-center gap-2 cursor-pointer rounded-full px-8 py-6 text-lg"
                    disabled={followRequestStatus === "declined"}
                  >
                    <Users className="h-5 w-5" />
                    {getFollowButtonText()}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export { UserProfile };
export default UserProfile;
