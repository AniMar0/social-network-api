"use client";

import { useEffect, useState } from "react";
import { SidebarNavigation } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, UserCheck, Compass } from "lucide-react";
import { useNotificationCount } from "@/lib/notifications";
import { siteConfig } from "@/config/site.config";
import { authUtils } from "@/lib/navigation";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  isFollowing: boolean;
  isRequested?: boolean;
  url?: string;
  isPrivate?: boolean;
}

interface ExplorePageProps {
  onNavigate?: (page: string) => void;
  onNewPost?: () => void;
}

const sampleUsers: User[] = [];

export function ExplorePage({ onNavigate, onNewPost }: ExplorePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>(sampleUsers);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Get notification count for sidebar
  const notificationCount = useNotificationCount();

  useEffect(() => {
    const loadUsersFromPosts = async () => {
      try {
        const res = await fetch(`${siteConfig.domain}/api/get-posts`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch posts");
        const data = await res.json();
        const posts: any[] = data.posts || [];
        const uniqueByUrl = new Map<string, any>();
        posts.forEach((p) => {
          if (p.author?.url && !uniqueByUrl.has(p.author.url)) {
            uniqueByUrl.set(p.author.url, p.author);
          }
        });

        const authors = Array.from(uniqueByUrl.entries());
        const profiles = await Promise.all(
          authors.map(async ([url]) => {
            try {
              const pres = await fetch(`${siteConfig.domain}/api/profile/${url}`, {
                credentials: "include",
              });
              if (!pres.ok) throw new Error("Failed to fetch profile");
              const profile = await pres.json();
              const udata = profile?.user || {};
              const safeUrl = (udata.url || url || udata.nickname || "").toString();
              const first = (udata.firstName || "").toString();
              const last = (udata.lastName || "").toString();
              const id = (udata.id ? String(udata.id) : safeUrl || (udata.nickname || "").toString() || "");
              const displayName = [first, last].filter(Boolean).join(" ") || (udata.nickname || safeUrl || id || "User").toString();
              const handle = (udata.nickname || safeUrl || id || "user").toString();
              const followRequestStatus = (udata.followRequestStatus || "").toString().toLowerCase();
              const isRequested = followRequestStatus === "pending";
              const u: User = {
                id,
                name: displayName,
                username: handle.startsWith("@") ? handle : `@${handle}`,
                avatar: udata.avatar ? `${siteConfig.domain}/${udata.avatar}` : `${siteConfig.domain}/uploads/default.jpg`,
                bio: (udata.aboutMe || "").toString(),
                followers: udata.followersCount ?? profile?.followers ?? 0,
                following: udata.followingCount ?? profile?.following ?? 0,
                isFollowing: Boolean(profile?.isfollowing),
                isRequested,
                url: safeUrl,
                isPrivate: Boolean(udata.isPrivate),
              };
              return u;
            } catch {
              return null;
            }
          })
        );
        setUsers(profiles.filter(Boolean) as User[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUsersFromPosts();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.bio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      try {
        console.log("Searching for users:", query);
        // For now, client-side filter of loaded users
        setTimeout(() => {
          setIsSearching(false);
        }, 500);
      } catch (error) {
        console.error("Error searching users:", error);
        setIsSearching(false);
      }
    } else {
      // No server search; keep current loaded users
      setUsers((prev) => prev);
    }
  };

  const handleFollowToggle = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    try {
      const currentUser = await authUtils.CurrentUser();
      if (!currentUser) throw new Error("Not logged in");

      // Determine action based on current state and privacy
      let targetFollowingId = userId;
      const isNumericId = /^\d+$/.test(String(userId));
      if (!isNumericId) {
        const targetUrl = user.url || user.username.replace(/^@/, "");
        try {
          const pres = await fetch(`${siteConfig.domain}/api/profile/${targetUrl}`, {
            credentials: "include",
          });
          if (pres.ok) {
            const pdata = await pres.json();
            const pid = pdata?.user?.id;
            if (pid) targetFollowingId = String(pid);
          }
        } catch {}
      }
      const body = JSON.stringify({ follower: currentUser.id, following: targetFollowingId });
      let endpoint = "";
      let optimistic: null | { isFollowing?: boolean; followers?: number; isRequested?: boolean } = null;
      // If still not numeric after resolution, avoid navigating away; let user open profile explicitly
      if (!/^\d+$/.test(String(targetFollowingId))) {
        console.warn("Cannot resolve numeric user ID for follow from Explore; open profile to follow.");
        return;
      }
      if (user.isFollowing) {
        endpoint = `${siteConfig.domain}/api/unfollow`;
        optimistic = { isFollowing: false, followers: Math.max(0, user.followers - 1), isRequested: false };
      } else if (user.isPrivate) {
        // Private profile: send follow request, do not flip following in UI
        endpoint = `${siteConfig.domain}/api/send-follow-request`;
        optimistic = { isRequested: true };
      } else {
        endpoint = `${siteConfig.domain}/api/follow`;
        optimistic = { isFollowing: true, followers: user.followers + 1, isRequested: false };
      }

      if (optimistic) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, ...optimistic } : u
          )
        );
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body,
      });
      if (!res.ok) {
        if (res.status === 409) {
          const errJson = await res.json().catch(() => null);
          const errMsg = (errJson && typeof errJson.error === "string" ? errJson.error : "").toLowerCase();
          if (errMsg.includes("follow request already sent")) {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === userId ? { ...u, isRequested: true } : u
              )
            );
            return;
          }
        }
        // revert optimistic update
        if (optimistic) {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    isFollowing: user.isFollowing,
                    followers: user.followers,
                    isRequested: user.isRequested,
                  }
                : u
            )
          );
        }
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to update follow status");
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
    }
  };

  const handleUserClick = (user: User) => {
    console.log("Navigating to user profile:", user.username);
    const target = user.url || user.username.replace(/^@/, "");
    router.push(`/profile/${target}`);
  };

  const handleNewPost = () => {
    onNewPost?.();
    console.log("New post clicked");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNavigation
        activeItem="explore"
        onNewPost={handleNewPost}
        notificationCount={notificationCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={toggleMobileMenu}
      />

      <div className="flex-1 lg:ml-72 min-w-0">
        <div className="max-w-6xl mx-auto py-8 px-4">
          {/* Header */}
          <div className="glass-card rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-4 z-10 backdrop-blur-xl border border-border/50 shadow-lg">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-primary/20 p-2.5 rounded-xl">
                <Compass className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Explore</h1>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 focus-visible:ring-primary/30 rounded-xl h-11"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {loading ? (
              <div className="text-center py-16 glass-card rounded-2xl border-dashed border-2 border-border/50">
                <div className="text-6xl mb-4 opacity-50">⏳</div>
                <h3 className="text-xl font-bold text-foreground mb-2">Loading users...</h3>
                <p className="text-muted-foreground">Fetching people from recent posts</p>
              </div>
            ) : searchQuery && filteredUsers.length === 0 ? (
              <div className="text-center py-16 glass-card rounded-2xl border-dashed border-2 border-border/50">
                <div className="text-6xl mb-4 opacity-50">🔍</div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  No users found
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We couldn&apos;t find anyone matching &quot;{searchQuery}
                  &quot;. Try searching for a different name or username.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredUsers.map((user, idx) => (
                  <div
                    key={`${user.url || user.id || user.username || "user"}-${idx}`}
                    className="glass-card rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group flex flex-col items-center text-center relative overflow-hidden"
                    onClick={() => handleUserClick(user)}
                  >
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-primary/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>

                    <div className="relative z-10 mb-4">
                      <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl group-hover:scale-105 transition-transform duration-300">
                        <AvatarImage
                          src={user.avatar}
                          alt={user.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="relative z-10 w-full flex-1 flex flex-col">
                      <h3 className="font-bold text-xl text-foreground mb-1 group-hover:text-primary transition-colors">
                        {user.name}
                      </h3>
                      <p className="text-sm text-primary/80 font-medium mb-3">
                        {user.username}
                      </p>

                      <p className="text-sm text-muted-foreground mb-6 line-clamp-2 flex-1 px-2">
                        {user.bio}
                      </p>

                      <div className="flex items-center justify-center gap-6 mb-6 text-sm text-muted-foreground bg-muted/30 py-2 rounded-xl w-full">
                        <div className="flex flex-col">
                          <strong className="text-foreground text-lg">
                            {user.followers.toLocaleString()}
                          </strong>
                          <span className="text-xs uppercase tracking-wider opacity-70">
                            Followers
                          </span>
                        </div>
                        <div className="w-px h-8 bg-border/50"></div>
                        <div className="flex flex-col">
                          <strong className="text-foreground text-lg">
                            {user.following.toLocaleString()}
                          </strong>
                          <span className="text-xs uppercase tracking-wider opacity-70">
                            Following
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowToggle(user.id);
                        }}
                        variant={user.isFollowing ? "outline" : "default"}
                        disabled={Boolean(user.isRequested) && !user.isFollowing}
                        className={`w-full rounded-xl h-10 font-medium shadow-md transition-all ${
                          user.isFollowing
                            ? "border-primary/20 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                        }`}
                      >
                        {user.isFollowing ? (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Following
                          </>
                        ) : user.isRequested ? (
                          <>Requested</>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExplorePage;
