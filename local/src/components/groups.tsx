"use client";

import { useState, useEffect } from "react";
import { SidebarNavigation } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Users,
  Plus,
  Search,
  CalendarIcon,
  MessageSquare,
  Settings,
  UserPlus,
  Check,
  X,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  MapPin,
  ChevronDownIcon,
  Group,
} from "lucide-react";
import { useNotificationCount } from "@/lib/notifications";
import { GroupChat } from "./group-chat";

// Interfaces
interface Group {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName?: string;
  memberCount?: number;
  isPrivate?: boolean;
  createdAt: string;
  avatar?: string;
  isOwner?: boolean;
  isMember?: boolean;
  hasPendingRequest?: boolean;
  isCreator?: boolean;
}

interface GroupPost {
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
  isLiked: boolean;
}

interface GroupEvent {
  id: string;
  title: string;
  description: string;
  creatorId?: string;
  creatorName?: string;
  eventDatetime: string;
  location?: string;
  goingCount: number;
  notGoingCount: number;
  userStatus: "going" | "not-going" | null;
  createdAt: string;
}

interface GroupsPageProps {
  onNewPost?: () => void;
}

interface GroupMember {
  url: number;
  firstName: string;
  lastName: string;
  nickname?: string;
  avatar?: string;
  isPrivate: boolean;
}

export function GroupsPage({ onNewPost }: GroupsPageProps) {
  const notificationCount = useNotificationCount();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupPosts, setGroupPosts] = useState<GroupPost[]>([]);
  const [groupEvents, setGroupEvents] = useState<GroupEvent[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  // Create group dialog state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupPrivacy, setNewGroupPrivacy] = useState("public");

  // Create post dialog state
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");

  // Create event dialog state
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventDate, setNewEventDate] = useState<Date | undefined>(undefined);
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Group chat state
  const [isGroupChatOpen, setIsGroupChatOpen] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupPosts(selectedGroup.id);
      fetchGroupEvents(selectedGroup.id);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/groups", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        // Map backend data to frontend interface if needed
        // Assuming backend returns array of groups
        setGroups(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    }
  };

  const fetchGroupPosts = async (groupId: string) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/groups/posts/${groupId}`,
        {
          credentials: "include",
        }
      );
      if (res.ok) {
        const data = await res.json();
        setGroupPosts(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch group posts:", error);
    }
  };

  const fetchGroupEvents = async (groupId: string) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/groups/events/${groupId}`,
        {
          credentials: "include",
        }
      );
      if (res.ok) {
        const data = await res.json();
        setGroupEvents(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch group events:", error);
    }
  };

  const handleNewPost = () => {
    onNewPost?.();
    console.log("New post clicked");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const filteredGroups = groups.filter(
    (group) =>
      group.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateGroup = async () => {
    if (newGroupTitle.trim() && newGroupDescription.trim()) {
      try {
        const res = await fetch("http://localhost:8080/api/groups/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newGroupTitle,
            description: newGroupDescription,
          }),
          credentials: "include",
        });

        if (res.ok) {
          const newGroup = await res.json();
          setGroups([newGroup, ...groups]);
          setNewGroupTitle("");
          setNewGroupDescription("");
          setNewGroupPrivacy("public");
          setIsCreateGroupOpen(false);
        }
      } catch (error) {
        console.error("Failed to create group:", error);
      }
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const res = await fetch("http://localhost:8080/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: parseInt(groupId) }),
        credentials: "include",
      });

      if (res.ok) {
        setGroups(
          groups.map((group) =>
            group.id === groupId ? { ...group, hasPendingRequest: true } : group
          )
        );
      }
    } catch (error) {
      console.error("Failed to join group:", error);
    }
  };

  const handleCreatePost = async () => {
    if (newPostContent.trim() && selectedGroup) {
      try {
        const res = await fetch(
          "http://localhost:8080/api/groups/posts/create",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              groupId: parseInt(selectedGroup.id),
              content: newPostContent,
              privacy: "public", // Group posts are public within group
            }),
            credentials: "include",
          }
        );

        if (res.ok) {
          const newPost = await res.json();
          setGroupPosts([newPost, ...groupPosts]);
          setNewPostContent("");
          setIsCreatePostOpen(false);
        }
      } catch (error) {
        console.error("Failed to create post:", error);
      }
    }
  };

  const handleCreateEvent = async () => {
    if (
      newEventTitle.trim() &&
      newEventDescription.trim() &&
      newEventDate &&
      newEventTime &&
      selectedGroup
    ) {
      const eventDatetime = `${
        newEventDate.toISOString().split("T")[0]
      }T${newEventTime}:00Z`;

      try {
        const res = await fetch(
          "http://localhost:8080/api/groups/events/create",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              groupId: parseInt(selectedGroup.id),
              title: newEventTitle,
              description: newEventDescription,
              eventDatetime: eventDatetime,
            }),
            credentials: "include",
          }
        );

        if (res.ok) {
          const newEvent = await res.json();
          setGroupEvents([...groupEvents, newEvent]);
          setNewEventTitle("");
          setNewEventDescription("");
          setNewEventDate(undefined);
          setNewEventTime("");
          setNewEventLocation("");
          setIsCreateEventOpen(false);
        }
      } catch (error) {
        console.error("Failed to create event:", error);
      }
    }
  };

  const handleEventResponse = async (
    eventId: string,
    response: "going" | "not-going"
  ) => {
    try {
      const res = await fetch(
        "http://localhost:8080/api/groups/events/respond",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: parseInt(eventId),
            status: response,
          }),
          credentials: "include",
        }
      );

      if (res.ok) {
        setGroupEvents(
          groupEvents.map((event) => {
            if (event.id === eventId) {
              const oldResponse = event.userStatus;
              const newEvent = { ...event, userStatus: response };

              // Update counts
              if (oldResponse === "going") newEvent.goingCount--;
              else if (oldResponse === "not-going") newEvent.notGoingCount--;

              if (response === "going") newEvent.goingCount++;
              else if (response === "not-going") newEvent.notGoingCount++;

              return newEvent;
            }
            return event;
          })
        );
      }
    } catch (error) {
      console.error("Failed to respond to event:", error);
    }
  };

  const GetGroupMembers = async () => {
    console.log("Fetching group members...");
    if (!selectedGroup) return;
    console.log("Selected group ID:", selectedGroup.id);
    try {
      const res = await fetch(`/api/groups/members/${selectedGroup.id}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      const members = await res.json();
      setGroupMembers(members);
    } catch (error) {
      console.error("Failed to fetch group members", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNavigation
        activeItem="groups"
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
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Groups</h1>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus-visible:ring-primary/30 rounded-xl"
                />
              </div>

              <Dialog
                open={isCreateGroupOpen}
                onOpenChange={setIsCreateGroupOpen}
              >
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-panel border-border/50 sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                      Create New Group
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-base font-medium">
                        Group Title
                      </Label>
                      <Input
                        id="title"
                        value={newGroupTitle}
                        onChange={(e) => setNewGroupTitle(e.target.value)}
                        placeholder="Enter group title"
                        className="bg-background/50 border-border/50 h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="description"
                        className="text-base font-medium"
                      >
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        placeholder="Describe your group"
                        rows={4}
                        className="bg-background/50 border-border/50 resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="privacy"
                        className="text-base font-medium"
                      >
                        Privacy
                      </Label>
                      <Select
                        value={newGroupPrivacy}
                        onValueChange={setNewGroupPrivacy}
                      >
                        <SelectTrigger className="bg-background/50 border-border/50 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleCreateGroup}
                        className="flex-1 bg-primary hover:bg-primary/90 h-11 rounded-xl"
                      >
                        Create Group
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateGroupOpen(false)}
                        className="flex-1 h-11 rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/30 p-1 rounded-xl mb-8">
                <TabsTrigger
                  value="browse"
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  Browse Groups
                </TabsTrigger>
                <TabsTrigger
                  value="my-groups"
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  My Groups
                </TabsTrigger>
              </TabsList>

              {/* Browse Groups Tab */}
              <TabsContent
                value="browse"
                className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className="glass-card rounded-2xl overflow-hidden border border-border/40 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group flex flex-col h-full"
                    >
                      <div className="h-24 bg-gradient-to-r from-primary/20 to-purple-500/20 relative">
                        <div className="absolute -bottom-8 left-6">
                          <Avatar className="h-16 w-16 ring-4 ring-background shadow-md">
                            <AvatarImage
                              src={group.avatar}
                              alt={group.title}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                              {group.title.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                      <div className="p-6 pt-10 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold text-foreground truncate pr-2">
                            {group.title}
                          </h3>
                          <Badge
                            variant={group.isPrivate ? "secondary" : "outline"}
                            className="bg-background/50 backdrop-blur-sm"
                          >
                            {group.isPrivate ? "Private" : "Public"}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                          {group.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {group.memberCount} members
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(group.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="mt-auto">
                          {group.isMember ? (
                            <Button
                              onClick={() => {
                                setSelectedGroup(group);
                                setActiveTab("group-view");
                              }}
                              className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-xl"
                            >
                              View Group
                            </Button>
                          ) : group.hasPendingRequest ? (
                            <Button
                              variant="outline"
                              disabled
                              className="w-full rounded-xl opacity-70"
                            >
                              Request Pending
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleJoinGroup(group.id)}
                              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/20"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              {group.isPrivate
                                ? "Request to Join"
                                : "Join Group"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* My Groups Tab */}
              <TabsContent
                value="my-groups"
                className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groups
                    .filter((group) => group.isMember)
                    .map((group) => (
                      <div
                        key={group.id}
                        className="glass-card rounded-2xl overflow-hidden border border-border/40 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group flex flex-col h-full"
                      >
                        <div className="h-24 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 relative">
                          <div className="absolute top-4 right-4">
                            {group.isOwner && (
                              <Badge className="bg-primary text-primary-foreground shadow-sm">
                                Owner
                              </Badge>
                            )}
                          </div>
                          <div className="absolute -bottom-8 left-6">
                            <Avatar className="h-16 w-16 ring-4 ring-background shadow-md">
                              <AvatarImage
                                src={group.avatar}
                                alt={group.title}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                                {group.title.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        <div className="p-6 pt-10 flex-1 flex flex-col">
                          <h3 className="text-xl font-bold text-foreground truncate mb-2">
                            {group.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                            {group.description}
                          </p>
                          <Button
                            onClick={() => {
                              setSelectedGroup(group);
                              setActiveTab("group-view");
                            }}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/20 mt-auto"
                          >
                            Open Group
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>

              {/* Group View Tab */}
              {selectedGroup && (
                <TabsContent
                  value="group-view"
                  className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  {/* Group Header */}
                  <div className="glass-card rounded-3xl overflow-hidden border border-border/50 shadow-xl">
                    <div className="h-48 bg-gradient-to-r from-primary/30 via-purple-500/20 to-blue-500/20 relative">
                      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
                    </div>
                    <div className="px-8 pb-8 relative">
                      <div className="flex flex-col md:flex-row gap-6 items-start -mt-12">
                        <Avatar className="h-32 w-32 ring-4 ring-background shadow-2xl rounded-2xl">
                          <AvatarImage
                            src={selectedGroup.avatar}
                            alt={selectedGroup.title}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-3xl bg-muted font-bold">
                            {selectedGroup.title.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 pt-14 md:pt-12 space-y-4">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h2 className="text-3xl font-bold text-foreground">
                                {selectedGroup.title}
                              </h2>
                              {selectedGroup.isOwner && (
                                <Badge className="bg-primary text-primary-foreground">
                                  Owner
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className="border-primary/30 text-primary bg-primary/5"
                              >
                                {selectedGroup.isPrivate
                                  ? "Private Group"
                                  : "Public Group"}
                              </Badge>
                            </div>
                            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                              {selectedGroup.description}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
                              <Users className="h-4 w-4 text-primary" />
                              <span className="font-medium text-foreground">
                                {selectedGroup.memberCount}
                              </span>{" "}
                              members
                            </div>
                            <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
                              <CalendarIcon className="h-4 w-4 text-primary" />
                              Created{" "}
                              {new Date(
                                selectedGroup.createdAt
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-14 md:pt-12 w-full md:w-auto">
                          <Button
                            onClick={() => setIsGroupChatOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl px-6"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Group Chat
                          </Button>
                          {selectedGroup.isOwner && (
                            <Button
                              variant="outline"
                              className="rounded-xl border-border/50 hover:bg-muted/50"
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Settings
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group Content Tabs */}
                  <Tabs defaultValue="posts" className="w-full">
                    <TabsList className="bg-muted/30 p-1 rounded-xl mb-6 inline-flex">
                      <TabsTrigger value="posts" className="rounded-lg px-6">
                        Posts
                      </TabsTrigger>
                      <TabsTrigger value="events" className="rounded-lg px-6">
                        Events
                      </TabsTrigger>
                      <TabsTrigger
                        value="members"
                        className="rounded-lg px-6"
                        onClick={GetGroupMembers}
                      >
                        Members
                      </TabsTrigger>
                    </TabsList>

                    {/* Posts Tab */}
                    <TabsContent value="posts" className="space-y-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <span className="bg-primary/10 p-1.5 rounded-lg text-primary">
                            <MessageCircle className="h-5 w-5" />
                          </span>
                          Group Posts
                        </h3>
                        <Dialog
                          open={isCreatePostOpen}
                          onOpenChange={setIsCreatePostOpen}
                        >
                          <DialogTrigger asChild>
                            <Button className="rounded-xl shadow-md">
                              <Plus className="h-4 w-4 mr-2" />
                              Create Post
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="glass-panel border-border/50">
                            <DialogHeader>
                              <DialogTitle>Create Group Post</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <Textarea
                                value={newPostContent}
                                onChange={(e) =>
                                  setNewPostContent(e.target.value)
                                }
                                placeholder="What's on your mind?"
                                rows={5}
                                className="bg-background/50 border-border/50 resize-none text-lg"
                              />
                              <div className="flex gap-3">
                                <Button
                                  onClick={handleCreatePost}
                                  className="flex-1 rounded-xl"
                                >
                                  Post
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsCreatePostOpen(false)}
                                  className="flex-1 rounded-xl"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="space-y-6">
                        {groupPosts.map((post) => (
                          <div
                            key={post.id}
                            className="glass-card rounded-2xl p-0 overflow-hidden border border-border/40 hover:shadow-md transition-all"
                          >
                            <div className="p-5 flex items-center gap-4 border-b border-border/40 bg-white/5">
                              <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                                <AvatarImage
                                  src={post.author.avatar}
                                  alt={post.author.name}
                                />
                                <AvatarFallback>
                                  {post.author.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-foreground">
                                  {post.author.name}
                                </p>
                                <p className="text-xs text-muted-foreground font-medium">
                                  {new Date(post.createdAt).toLocaleString(
                                    undefined,
                                    { dateStyle: "medium", timeStyle: "short" }
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="p-5 space-y-4">
                              <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                {post.content}
                              </p>
                              {post.image && (
                                <div className="rounded-xl overflow-hidden bg-black/5 border border-border/20">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={post.image}
                                    alt="Post image"
                                    className="w-full h-auto max-h-[500px] object-contain"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="px-5 py-3 flex items-center gap-4 border-t border-border/40 bg-muted/20">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors"
                              >
                                <Heart
                                  className={`h-4 w-4 mr-2 ${
                                    post.isLiked
                                      ? "fill-current text-red-500"
                                      : ""
                                  }`}
                                />
                                {post.likes}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                {post.comments}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full hover:bg-green-500/10 hover:text-green-500 transition-colors ml-auto"
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </Button>
                            </div>
                          </div>
                        ))}
                        {groupPosts.length === 0 && (
                          <div className="text-center py-12 glass-card rounded-2xl border-dashed border-2 border-border/50">
                            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground">
                              No posts yet. Be the first to post!
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Events Tab */}
                    <TabsContent value="events" className="space-y-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <span className="bg-primary/10 p-1.5 rounded-lg text-primary">
                            <CalendarIcon className="h-5 w-5" />
                          </span>
                          Group Events
                        </h3>
                        <Dialog
                          open={isCreateEventOpen}
                          onOpenChange={setIsCreateEventOpen}
                        >
                          <DialogTrigger asChild>
                            <Button className="rounded-xl shadow-md">
                              <Plus className="h-4 w-4 mr-2" />
                              Create Event
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="glass-panel border-border/50 sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>Create Group Event</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="event-title">Event Title</Label>
                                <Input
                                  id="event-title"
                                  value={newEventTitle}
                                  onChange={(e) =>
                                    setNewEventTitle(e.target.value)
                                  }
                                  placeholder="Enter event title"
                                  className="bg-background/50 border-border/50"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="event-description">
                                  Description
                                </Label>
                                <Textarea
                                  id="event-description"
                                  value={newEventDescription}
                                  onChange={(e) =>
                                    setNewEventDescription(e.target.value)
                                  }
                                  placeholder="Describe your event"
                                  rows={3}
                                  className="bg-background/50 border-border/50 resize-none"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Date</Label>
                                  <Popover
                                    open={datePickerOpen}
                                    onOpenChange={setDatePickerOpen}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="w-full justify-between font-normal bg-background/50 border-border/50"
                                      >
                                        {newEventDate
                                          ? newEventDate.toLocaleDateString()
                                          : "Select date"}
                                        <ChevronDownIcon className="h-4 w-4 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="w-auto p-0"
                                      align="start"
                                    >
                                      <Calendar
                                        mode="single"
                                        selected={newEventDate}
                                        onSelect={(date) => {
                                          setNewEventDate(date);
                                          setDatePickerOpen(false);
                                        }}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <div className="space-y-2">
                                  <Label>Time</Label>
                                  <Input
                                    type="time"
                                    value={newEventTime}
                                    onChange={(e) =>
                                      setNewEventTime(e.target.value)
                                    }
                                    className="bg-background/50 border-border/50"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="event-location">
                                  Location (Optional)
                                </Label>
                                <Input
                                  id="event-location"
                                  value={newEventLocation}
                                  onChange={(e) =>
                                    setNewEventLocation(e.target.value)
                                  }
                                  placeholder="Enter event location"
                                  className="bg-background/50 border-border/50"
                                />
                              </div>
                              <div className="flex gap-3 pt-2">
                                <Button
                                  onClick={handleCreateEvent}
                                  className="flex-1 rounded-xl"
                                >
                                  Create Event
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsCreateEventOpen(false)}
                                  className="flex-1 rounded-xl"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="space-y-4">
                        {groupEvents.map((event) => (
                          <div
                            key={event.id}
                            className="glass-card rounded-2xl p-6 border border-border/40 hover:shadow-md transition-all flex flex-col md:flex-row gap-6"
                          >
                            <div className="flex-shrink-0 bg-primary/10 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] text-center border border-primary/20">
                              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                {new Date(event.eventDatetime).toLocaleString(
                                  "default",
                                  { month: "short" }
                                )}
                              </span>
                              <span className="text-3xl font-bold text-foreground my-1">
                                {new Date(event.eventDatetime).getDate()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.eventDatetime).toLocaleString(
                                  "default",
                                  { weekday: "short" }
                                )}
                              </span>
                            </div>

                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-xl text-foreground mb-2">
                                    {event.title}
                                  </h4>
                                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                                    <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                                      <Clock className="h-4 w-4 text-primary" />
                                      {new Date(
                                        event.eventDatetime
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                    {event.location && (
                                      <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {event.location}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Button
                                    variant={
                                      event.userStatus === "going"
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      handleEventResponse(event.id, "going")
                                    }
                                    className={`rounded-lg ${
                                      event.userStatus === "going"
                                        ? "bg-green-600 hover:bg-green-700"
                                        : "hover:text-green-600 hover:border-green-600/50"
                                    }`}
                                  >
                                    <Check className="h-4 w-4 mr-1" /> Going
                                  </Button>
                                  <Button
                                    variant={
                                      event.userStatus === "not-going"
                                        ? "destructive"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      handleEventResponse(event.id, "not-going")
                                    }
                                    className={`rounded-lg ${
                                      event.userStatus === "not-going"
                                        ? ""
                                        : "hover:text-red-600 hover:border-red-600/50"
                                    }`}
                                  >
                                    <X className="h-4 w-4 mr-1" /> Not Going
                                  </Button>
                                </div>
                              </div>

                              <p className="text-foreground/80 mb-4 leading-relaxed">
                                {event.description}
                              </p>

                              <div className="flex items-center gap-4 text-sm font-medium pt-4 border-t border-border/30">
                                <span className="text-green-500 flex items-center gap-1">
                                  <Check className="h-3 w-3" />{" "}
                                  {event.goingCount} going
                                </span>
                                <span className="text-red-500 flex items-center gap-1">
                                  <X className="h-3 w-3" />{" "}
                                  {event.notGoingCount} not going
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {groupEvents.length === 0 && (
                          <div className="text-center py-12 glass-card rounded-2xl border-dashed border-2 border-border/50">
                            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground">
                              No upcoming events.
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Members Tab */}
                    <TabsContent value="members" className="space-y-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <span className="bg-primary/10 p-1.5 rounded-lg text-primary">
                            <Users className="h-5 w-5" />
                          </span>
                          Group Members
                        </h3>
                        {selectedGroup.isOwner && (
                          <Button variant="outline" className="rounded-xl">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite Members
                          </Button>
                        )}
                      </div>

                      {/* Members would be loaded from API */}
                      <div className="text-center text-muted-foreground py-16 glass-card rounded-2xl border-dashed border-2 border-border/50">
                        <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        {groupMembers?.map((member) => (
                          <div
                            key={member.url}
                            className="flex items-center gap-4 mb-4"
                          >
                            <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                              <AvatarImage
                                src={`http://localhost:8080/${member.avatar}` || undefined}
                                alt={member.firstName + " " + member.lastName}
                              />
                              <AvatarFallback>
                                {(
                                  member.firstName.charAt(0) +
                                  member.lastName.charAt(0)
                                ).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-left">
                              <p className="font-medium text-foreground">
                                {member.firstName} {member.lastName}{" "}
                                {member.nickname && (
                                  <span className="text-sm text-muted-foreground">
                                    ({member.nickname})
                                  </span>
                                )}
                              </p>
                              {member.isPrivate && (
                                <Badge className="bg-muted/30 text-muted-foreground">
                                  Private Account
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Group Chat Modal */}
      {selectedGroup && (
        <GroupChat
          groupId={selectedGroup.id}
          groupTitle={selectedGroup.title}
          isOpen={isGroupChatOpen}
          onClose={() => setIsGroupChatOpen(false)}
        />
      )}
    </div>
  );
}

export default GroupsPage;
