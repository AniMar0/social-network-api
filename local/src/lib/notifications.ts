// Utility functions for managing notifications
"use client";

import { useState, useEffect } from "react";
import { getWebSocket } from "@/lib/websocket";
import { siteConfig } from "@/config/site.config";
export interface Notification {
  id: number;
  type: "like" | "follow" | "comment" | "mention" | "follow_request";
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  content?: string;
  timestamp: string;
  isRead: boolean;
  actionData?: {
    postId?: string;
    commentId?: string;
  };
}

// Hook to get unread notification count
export const useNotificationCount = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`${siteConfig.domain}/api/notifications`, {
          credentials: "include",
        });
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unread = data?.filter((n: any) => !n.isRead).length || 0;
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
        setCount((prev) => prev + 1);
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
// Function to fetch notifications from API (placeholder)
export const fetchNotifications = async (): Promise<Notification[]> => {
  try {
    // TODO: Replace with actual API call
    const response = await fetch(`${siteConfig.domain}/api/notifications`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch notifications");
    const data = await response.json();
    console.log("Fetched notifications", data);

    if (!data) return [];
    return data;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

// Function to mark notification as read
export const markNotificationAsRead = async (
  notificationId?: number,
  AllNotifications?: boolean
): Promise<void> => {
  if (AllNotifications) {
    try {
      // TODO: Replace with actual API call
      await fetch(`${siteConfig.domain}/api/mark-all-notification-as-read`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  } else if (notificationId) {
    try {
      // TODO: Replace with actual API call
      await fetch(
        `${siteConfig.domain}/api/mark-notification-as-read/${notificationId}`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }
};

// Function to delete notification
export const deleteNotification = async (
  notificationId: number
): Promise<void> => {
  try {
    // TODO: Replace with actual API call
    await fetch(
      `${siteConfig.domain}/api/delete-notification/${notificationId}`,
      {
        method: "POST",
        credentials: "include",
      }
    );
  } catch (error) {
    console.error("Error deleting notification:", error);
  }
};
