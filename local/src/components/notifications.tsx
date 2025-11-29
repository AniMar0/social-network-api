"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getWebSocket } from "@/lib/websocket";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Star,
  Heart,
  UserPlus,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Check,
  MailOpen,
} from "lucide-react";
import { SidebarNavigation } from "./sidebar";
import {
  fetchNotifications,
  markNotificationAsRead,
  deleteNotification,
  type Notification,
} from "@/lib/notifications";
import { siteConfig } from "@/config/site.config";

interface NotificationsPageProps {
  onNewPost?: () => void;
}

function NotificationsPage({ onNewPost }: NotificationsPageProps) {
  // Use shared notification utilities
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const useNotificationCount = () => {
    useEffect(() => {
      const init = async () => {
        try {
          const res = await fetch(`${siteConfig.domain}/api/notifications`, {
            credentials: "include",
          });
          const data = await res.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const unread = data?.filter((n: any) => !n.isRead).length || 0;

          setNotifications(data || []);
          setCount(unread);
        } catch (err) {
          console.error("Failed to fetch initial notifications", err);
        }
      };
      init();

      const ws = getWebSocket();
      if (!ws) return;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.channel === "notifications-new") {
          init();
        }

        if (data.channel === "notifications-read") {
          setCount((prev) => Math.max(prev - 1, 0));
        }

        if (data.channel === "notifications-delete") {
          init();
        }

        if (data.channel === "notifications-all-read") {
          setCount(0);
        }
      };
    }, []);

    return count;
  };

  // Load notifications when component mounts
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const fetchedNotifications = await fetchNotifications();
        setNotifications(fetchedNotifications);
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };

    loadNotifications();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-4 w-4 text-pink-500" />;
      case "follow":
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "comment":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "follow_request":
        return <UserPlus className="h-4 w-4 text-yellow-500" />;
      default:
        return <Star className="h-4 w-4 text-purple-500" />;
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleFollowRequest = async (
    notificationId: number,
    action: "accept" | "decline"
  ) => {
    console.log(`Follow request ${action}ed for notification:`, notificationId);
    // TODO: Add backend logic here to handle follow requests
    await fetch(
      `${siteConfig.domain}/api/${action}-follow-request/${notificationId}`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    handleDelete(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markNotificationAsRead(0, true);
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      //ubdate notification count
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
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
        activeItem="notifications"
        onNewPost={handleNewPost}
        notificationCount={useNotificationCount()}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={toggleMobileMenu}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-72 min-w-0">
        <div className="max-w-3xl mx-auto py-8 px-4">
          {/* Header */}
          <div className="glass-card rounded-2xl p-6 mb-6 flex items-center justify-between sticky top-4 z-10 backdrop-blur-xl border border-border/50 shadow-lg">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="bg-primary/20 p-2 rounded-lg">
                <Star className="h-6 w-6 text-primary" />
              </div>
              Notifications
            </h1>

            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <MailOpen className="h-4 w-4 mr-2" /> Mark all as read
            </Button>
          </div>

          {/* Notifications List */}
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-3xl border-dashed border-2 border-border/50">
                <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  All caught up!
                </h3>
                <p className="text-muted-foreground">
                  You have no new notifications at the moment.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`glass-card p-5 rounded-2xl transition-all duration-300 border border-border/40 hover:border-primary/30 hover:shadow-md group ${
                      !notification.isRead
                        ? "bg-primary/5 border-primary/20"
                        : "bg-card/40"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Notification Icon */}
                      <div
                        className={`flex-shrink-0 mt-1 p-2.5 rounded-xl ${
                          notification.type === "like"
                            ? "bg-pink-500/10"
                            : notification.type === "follow"
                            ? "bg-blue-500/10"
                            : notification.type === "comment"
                            ? "bg-green-500/10"
                            : notification.type === "follow_request"
                            ? "bg-yellow-500/10"
                            : "bg-purple-500/10"
                        }`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* User Avatar */}
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarImage
                            src={
                              `${siteConfig.domain}/${notification.user.avatar}` ||
                              `${siteConfig.domain}/uploads/default.jpg`
                            }
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {notification.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {!notification.isRead && (
                          <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background"></span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <p className="text-[15px] leading-snug text-foreground/90">
                              <span className="font-bold text-foreground hover:underline cursor-pointer">
                                {notification.user.name}
                              </span>{" "}
                              <span className="text-muted-foreground">
                                {notification.content}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground font-medium">
                              {new Date(notification.timestamp).toLocaleString(
                                undefined,
                                { dateStyle: "medium", timeStyle: "short" }
                              )}
                            </p>

                            {/* Follow Request Actions */}
                            {notification.type === "follow_request" && (
                              <div className="flex gap-3 mt-3 animate-in slide-in-from-top-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleFollowRequest(
                                      notification.id,
                                      "accept"
                                    )
                                  }
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-full px-6"
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleFollowRequest(
                                      notification.id,
                                      "decline"
                                    )
                                  }
                                  className="rounded-full px-6 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                >
                                  Decline
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Options Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="glass-panel border-border/50"
                            >
                              {!notification.isRead && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleMarkAsRead(notification.id)
                                  }
                                  className="cursor-pointer"
                                >
                                  <Check className="h-4 w-4 mr-2 text-primary" />
                                  Mark as read
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(notification.id)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
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

export { NotificationsPage };
export default NotificationsPage;
