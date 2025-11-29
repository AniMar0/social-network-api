"use client";

import { useState, useEffect, useRef } from "react";
import { SidebarNavigation } from "./sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Heart,
  MessageCircle,
  Share,
  MoreHorizontal,
  Send,
  ImagePlay,
  Smile,
  Search,
} from "lucide-react";
import { useNotificationCount } from "@/lib/notifications";
import EmojiPicker, { Theme } from "emoji-picker-react";
import GifPicker from "gif-picker-react";
import { getWebSocket } from "@/lib/websocket";
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
  parentId?: string;
  replies?: Comment[];
}

interface Post {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  image?: string;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  privacy: "public" | "almost-private" | "private";
  commentsList?: Comment[];
}

interface HomeFeedProps {
  onNewPost?: () => void;
  onNavigate?: (itemId: string) => void;
}

function HomeFeed({ onNewPost }: HomeFeedProps) {
  // Get notification count for sidebar
  const notificationCount = useNotificationCount();
  const [postsState, setPostsState] = useState<Post[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = getWebSocket();
    if (!ws) return;
    wsRef.current = ws;

    // Handlers: separated to keep effect concise
    const onMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        handleWsEvent(data);
      } catch (err) {
        console.error("Invalid ws message", err);
      }
    };

    ws.addEventListener("message", onMessage);

    return () => {
      ws.removeEventListener("message", onMessage);
      wsRef.current = null;
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleWsEvent = (data: any) => {
    switch (data.channel) {
      case "new-post":
        setPostsState((prevPosts) => [data.payload.post, ...prevPosts]);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch(`${siteConfig.domain}/api/get-posts`, {
          credentials: "include",
        });
        const data = await res.json();
        setPostsState(data.posts || []);
      } catch (err) {
        console.error("Failed to fetch posts", err);
      }
    };

    fetchPosts();
  }, []);

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`${siteConfig.domain}/api/like/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await res.json();
      const isLiked = data.liked ?? false;

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

  const handleNewPost = () => {
    onNewPost?.();
    console.log("New Post button clicked from HomeFeed");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <SidebarNavigation
        activeItem="home"
        onNewPost={handleNewPost}
        notificationCount={notificationCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={toggleMobileMenu}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-72 min-w-0 flex justify-center">
        <div className="w-full max-w-2xl px-4 pb-20 lg:pb-8">
          {/* Header */}
          <div className="sticky top-0 z-20 pt-6 pb-4 backdrop-blur-xl bg-background/50 border-b border-border/40 mb-6 -mx-4 px-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent lg:ml-0 ml-12">
              Home Feed
            </h2>
            <div className="flex gap-2">
              {/* Placeholder for filters or other header actions */}
            </div>
          </div>

          {/* Posts Feed */}
          <div className="space-y-6">
            {postsState.map((post) => (
              <Card
                key={post.id}
                className="glass-card border-0 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                <CardContent className="p-0">
                  {/* Post Header */}
                  <div className="p-5 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20 transition-transform hover:scale-105 cursor-pointer">
                        <AvatarImage
                          src={
                            `${siteConfig.domain}/${post.author.avatar}` ||
                            `${siteConfig.domain}/uploads/default.jpg`
                          }
                          alt={post.author.name}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {post.author.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer">
                            {post.author.name}
                          </h3>
                          {/* Optional: Add verified badge here */}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          @{post.author.username} •{" "}
                          {new Date(post.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground rounded-full"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Post Content */}
                  <div className="px-5 pb-3">
                    <p className="text-foreground/90 leading-relaxed text-[15px] whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>

                  {post.image && (
                    <div className="mt-2 w-full bg-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          post.image.startsWith("http")
                            ? post.image // external URL
                            : `${siteConfig.domain}/${post.image}` // internal URL
                        }
                        alt="Post content"
                        className="w-full h-auto max-h-[600px] object-contain"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="px-5 py-3 flex items-center justify-between border-t border-border/40 bg-white/5">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-2 rounded-full px-4 hover:bg-red-500/10 transition-colors ${
                          post.isLiked
                            ? "text-red-500"
                            : "text-muted-foreground hover:text-red-500"
                        }`}
                      >
                        <Heart
                          className={`h-5 w-5 transition-transform active:scale-75 ${
                            post.isLiked ? "fill-current" : ""
                          }`}
                        />
                        <span className="font-medium">{post.likes}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-2 rounded-full px-4 text-muted-foreground hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span className="font-medium">{post.comments}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 rounded-full px-4 text-muted-foreground hover:text-green-400 hover:bg-green-400/10 transition-colors"
                      >
                        <Share className="h-5 w-5" />
                        <span className="font-medium">{post.shares}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {showComments[post.id] && (
                    <div className="bg-muted/30 border-t border-border/40 p-5 animate-in slide-in-from-top-2 duration-200">
                      {/* Comment Input */}
                      <div className="flex items-start gap-3 mb-6">
                        <Avatar className="h-9 w-9 mt-1">
                          <AvatarImage
                            src={`${siteConfig.domain}/${post.author.avatar}`} // Ideally current user avatar
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
                              className="pr-24 bg-background/50 border-border/60 focus-visible:ring-primary/30 min-h-[44px]"
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
                              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 h-8 text-xs font-medium"
                            >
                              <Send className="h-3 w-3 mr-2" />
                              {replyingTo[post.id] ? "Reply" : "Comment"}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Emoji & GIF Pickers for this post */}
                      {showEmojiPicker[post.id] && (
                        <div className="mb-4 relative z-10">
                          <div className="absolute top-0 left-0 shadow-2xl rounded-xl overflow-hidden">
                            <EmojiPicker
                              onEmojiClick={(e) =>
                                handleEmojiSelect(e.emoji, post.id)
                              }
                              theme={Theme.DARK}
                              width={300}
                              height={400}
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
                          post.commentsList.map((comment) =>
                            renderComment(comment, post.id)
                          )}
                        {(!post.commentsList ||
                          post.commentsList.length === 0) && (
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
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar (Trending/Suggestions) - Hidden on mobile/tablet */}
      <div className="hidden xl:block w-80 p-6 fixed right-0 top-0 h-screen overflow-y-auto border-l border-border/40 bg-background/20 backdrop-blur-sm">
        <div className="space-y-6 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 bg-muted/50 border-border/50 rounded-full focus-visible:ring-primary/30"
            />
          </div>

          {/* Trending Topics */}
          <div className="glass-card p-5 rounded-2xl border border-border/50">
            <h3 className="font-bold text-lg mb-4 text-foreground">
              Trending for you
            </h3>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex justify-between items-start group cursor-pointer"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Trending in Tech
                    </p>
                    <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      #WebDevelopment
                    </p>
                    <p className="text-xs text-muted-foreground">52.4K posts</p>
                  </div>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-4 text-primary text-sm hover:bg-primary/10"
            >
              Show more
            </Button>
          </div>

          {/* Who to follow */}
          <div className="glass-card p-5 rounded-2xl border border-border/50">
            <h3 className="font-bold text-lg mb-4 text-foreground">
              Who to follow
            </h3>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        U{i}
                      </AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <p className="font-semibold text-sm truncate">User {i}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        @user{i}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-white text-black hover:bg-white/90 rounded-full h-8 px-4 text-xs font-bold"
                  >
                    Follow
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground px-2">
            <p>© 2025 Social Network. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { HomeFeed };
export default HomeFeed;
