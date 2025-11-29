"use client";

import { useState } from "react";
import { SidebarNavigation } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, UserCheck, Compass } from "lucide-react";
import { useNotificationCount } from "@/lib/notifications";

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  isFollowing: boolean;
}

interface ExplorePageProps {
  onNavigate?: (page: string) => void;
  onNewPost?: () => void;
}

const sampleUsers: User[] = [
  {
    id: "1",
    name: "John Doe",
    username: "@johndoe",
    avatar: "https://i.imgur.com/aSlIJks.png",
    bio: "Software engineer passionate about building great products",
    followers: 1234,
    following: 567,
    isFollowing: false,
  },
  {
    id: "2",
    name: "Jane Smith",
    username: "@janesmith",
    avatar: "https://i.imgur.com/aSlIJks.png",
    bio: "Designer & creator. Love to make things beautiful ✨",
    followers: 890,
    following: 234,
    isFollowing: true,
  },
  {
    id: "3",
    name: "Alex Johnson",
    username: "@alexj",
    avatar: "https://i.imgur.com/aSlIJks.png",
    bio: "Basketball player 🏀 | Coffee enthusiast ☕",
    followers: 2345,
    following: 123,
    isFollowing: false,
  },
  {
    id: "4",
    name: "Sarah Wilson",
    username: "@sarahw",
    avatar: "https://i.imgur.com/aSlIJks.png",
    bio: "Travel blogger exploring the world 🌎",
    followers: 567,
    following: 789,
    isFollowing: false,
  },
];

export function ExplorePage({ onNavigate, onNewPost }: ExplorePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>(sampleUsers);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get notification count for sidebar
  const notificationCount = useNotificationCount();

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
        // TODO: Replace with actual API call
        // const response = await fetch(`${siteConfig.domain}/api/users/search?q=${encodeURIComponent(query)}`);
        // const searchResults = await response.json();
        // setUsers(searchResults);

        // For now, using filtered sample data
        setTimeout(() => {
          setIsSearching(false);
        }, 500);
      } catch (error) {
        console.error("Error searching users:", error);
        setIsSearching(false);
      }
    } else {
      // Reset to all users when search is cleared
      setUsers(sampleUsers);
    }
  };

  const handleFollowToggle = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    try {
      console.log(
        user.isFollowing ? "Unfollowing user:" : "Following user:",
        userId
      );
      // TODO: Replace with actual API call
      // const response = await fetch(`${siteConfig.domain}/api/users/${userId}/follow`, {
      //     method: user.isFollowing ? 'DELETE' : 'POST',
      //     headers: {
      //         'Content-Type': 'application/json',
      //     }
      // });
      //
      // if (!response.ok) {
      //     throw new Error('Failed to update follow status');
      // }

      // Update local state immediately for instant feedback
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                isFollowing: !u.isFollowing,
                followers: u.isFollowing ? u.followers - 1 : u.followers + 1,
              }
            : u
        )
      );
    } catch (error) {
      console.error("Error updating follow status:", error);
    }
  };

  const handleUserClick = (user: User) => {
    console.log("Navigating to user profile:", user.username);
    // TODO: Navigate to user profile
    onNavigate?.(`/profile/${user.username}`);
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
            {searchQuery && filteredUsers.length === 0 ? (
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
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
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
