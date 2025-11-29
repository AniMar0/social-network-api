"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ImageIcon,
  Smile,
  ImagePlay,
  X,
  Globe,
  Users,
  Lock,
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import GifPicker from "gif-picker-react";
import { authUtils } from "@/lib/navigation";
import { siteConfig } from "@/config/site.config";

interface Follower {
  id: string;
  firstName: string;
  lastName: string;
  username?: string;
  avatar: string;
}

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost?: (postData: PostData) => void;
}

interface PostData {
  content: string;
  image?: string;
  privacy: "public" | "almost-private" | "private";
  selectedFollowers?: string[];
}

let postFile: File;

export function NewPostModal({ isOpen, onClose, onPost }: NewPostModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<
    "public" | "almost-private" | "private"
  >("public");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [showFollowerSelection, setShowFollowerSelection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { loggedIn, user } = await authUtils.checkAuth();
        if (loggedIn && user) setCurrentUser(user);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch followers when component mounts Hna zid api dyal tjib followers dyalo bach ibano f lista ki ydir private f post
  useEffect(() => {
    if (privacy !== "private") return;
    const fetchFollowers = async () => {
      try {
        const response = await fetch(`${siteConfig.domain}/api/get-followers`, {
          method: "POST",
          credentials: "include",
        });
        const data = await response.json();
        setFollowers(data || []);
      } catch (err) {
        console.error("Error fetching followers:", err);
      }
    };
    fetchFollowers();
  }, [privacy]);

  // Handle privacy change to show/hide follower selection
  const handlePrivacyChange = (
    newPrivacy: "public" | "almost-private" | "private"
  ) => {
    setPrivacy(newPrivacy);
    if (newPrivacy === "private") {
      setShowFollowerSelection(true);
    } else {
      setShowFollowerSelection(false);
      setSelectedFollowers([]);
    }
  };

  // Toggle follower selection
  const toggleFollowerSelection = (followerId: string) => {
    setSelectedFollowers((prev) =>
      prev.includes(followerId)
        ? prev.filter((id) => id !== followerId)
        : [...prev, followerId]
    );
  };

  // Select all followers
  const selectAllFollowers = () => {
    setSelectedFollowers(followers.map((f) => f.id));
  };

  // Deselect all followers
  const deselectAllFollowers = () => {
    setSelectedFollowers([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    postFile = file;
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent((prev) => prev + emoji);
    // Don't close emoji picker - let user add multiple emojis
  };

  const handleGifSelect = (gifUrl: string) => {
    setSelectedImage(gifUrl);
    setShowGifPicker(false);
  };

  const handleClose = () => {
    setContent("");
    setSelectedImage(null);
    setPrivacy("public");
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setSelectedFollowers([]);
    setShowFollowerSelection(false);
    onClose();
  };

  const handlePost = async () => {
    if (!content.trim() && !selectedImage) return;

    const postData: PostData = {
      content: content.trim(),
      image: selectedImage || undefined,
      privacy,
      selectedFollowers: privacy === "private" ? selectedFollowers : undefined,
    };

    if (postFile) {
      const avatarForm = new FormData();
      avatarForm.append("post", postFile);
      try {
        const res = await fetch(`${siteConfig.domain}/api/upload-post-file`, {
          method: "POST",
          body: avatarForm,
          credentials: "include",
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Upload failed:", errorText);
          throw new Error(errorText || "Failed to upload image");
        }

        const data = await res.json();
        console.log(data.postUrl);
        postData.image = data.postUrl;
      } catch (err) {
        console.error("Error uploading image:", err);
        // Don't proceed with post creation if image upload failed
        return;
      }
    }

    try {
      const res = await fetch(`${siteConfig.domain}/api/create-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(postData),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Error creating post:", text);
        return;
      }
      const createdPost = await res.json();
      onPost?.(createdPost);

      handleClose();
    } catch (err) {
      console.error("Network error:", err);
    }
  };

  const getPrivacyIcon = (type: string) => {
    switch (type) {
      case "public":
        return <Globe className="h-4 w-4" />;
      case "almost-private":
        return <Users className="h-4 w-4" />;
      case "private":
        return <Lock className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  if (!currentUser)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading user...
      </div>
    );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] w-full glass-card border-0 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b border-border/40 bg-white/5">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Create New Post
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarImage
                src={`${siteConfig.domain}/${currentUser.avatar}`}
                alt={currentUser.fullName}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {currentUser.firstName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-foreground">
                {currentUser.firstName + " " + currentUser.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Select
                  value={privacy}
                  onValueChange={(v: "public" | "almost-private" | "private") =>
                    handlePrivacyChange(v)
                  }
                >
                  <SelectTrigger className="h-7 text-xs bg-muted/50 border-0 rounded-full px-3 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-1.5">
                      {getPrivacyIcon(privacy)}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="almost-private">Followers</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Textarea */}
          <div className="relative">
            <Textarea
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px] resize-none border-0 bg-transparent text-lg placeholder:text-muted-foreground/70 focus-visible:ring-0 p-0 leading-relaxed"
              maxLength={500}
            />
            <div className="absolute bottom-0 right-0">
              <span
                className={`text-xs font-medium ${
                  content.length > 450
                    ? "text-red-500"
                    : "text-muted-foreground/60"
                }`}
              >
                {content.length}/500
              </span>
            </div>
          </div>

          {/* Image Preview */}
          {selectedImage && (
            <div className="relative group rounded-xl overflow-hidden border border-border/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage}
                alt="Selected"
                className="w-full max-h-80 object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setSelectedImage(null)}
                  className="rounded-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          )}

          {/* Emoji & GIF */}
          {showEmojiPicker && (
            <div className="relative z-10">
              <div className="absolute bottom-full left-0 mb-2 shadow-2xl rounded-xl overflow-hidden">
                <EmojiPicker
                  onEmojiClick={(e) => handleEmojiSelect(e.emoji)}
                  theme={Theme.DARK}
                  width={350}
                  height={400}
                />
              </div>
            </div>
          )}
          {showGifPicker && (
            <div className="relative z-10">
              <div className="absolute bottom-full left-0 mb-2 shadow-2xl rounded-xl overflow-hidden bg-card">
                <GifPicker
                  onGifClick={(g) => handleGifSelect(g.url)}
                  tenorApiKey="AIzaSyB78CUkLJjdlA67853bVqpcwjJaywRAlaQ"
                  width={350}
                  theme={Theme.DARK}
                />
              </div>
            </div>
          )}

          {/* Follower Selection for Private Posts */}
          {showFollowerSelection && (
            <div className="border border-border/40 rounded-xl p-4 space-y-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground text-sm">
                  Select Followers
                </h4>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllFollowers}
                    className="text-xs h-7 hover:bg-primary/10 hover:text-primary"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllFollowers}
                    className="text-xs h-7 hover:bg-destructive/10 hover:text-destructive"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {selectedFollowers.length} of {followers.length} followers
                selected
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {followers.length > 0 ? (
                  followers.map((follower) => (
                    <div
                      key={follower.id}
                      onClick={() => toggleFollowerSelection(follower.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                        selectedFollowers.includes(follower.id)
                          ? "bg-primary/15 border border-primary/20"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={`${siteConfig.domain}/${follower.avatar}`}
                          alt={`${follower.firstName} ${follower.lastName}`}
                        />
                        <AvatarFallback className="bg-muted text-foreground text-xs">
                          {follower.firstName[0]}
                          {follower.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {follower.firstName} {follower.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {follower.username && <>@{follower.username}</>}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedFollowers.includes(follower.id)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/50"
                        }`}
                      >
                        {selectedFollowers.includes(follower.id) && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No followers found
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-10 w-10"
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowGifPicker(false);
                }}
                className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-10 w-10"
              >
                <Smile className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  setShowEmojiPicker(false);
                }}
                className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-10 w-10"
              >
                <ImagePlay className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePost}
                disabled={
                  (!content.trim() && !selectedImage) ||
                  (privacy === "private" && selectedFollowers.length === 0)
                }
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 font-semibold shadow-lg shadow-primary/25"
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
