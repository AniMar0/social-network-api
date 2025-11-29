"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { SidebarNavigation } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  ImagePlay,
  ImageIcon,
  Smile,
  Send,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import { useNotificationCount } from "@/lib/notifications";
import EmojiPicker, { Theme } from "emoji-picker-react";
import GifPicker from "gif-picker-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { getWebSocket } from "@/lib/websocket";
import { timeAgo } from "@/lib/tools";
import { siteConfig } from "@/config/site.config";

interface Message {
  id: string;
  content: string;
  timestamp: string;
  seen?: string;
  isOwn: boolean;
  isRead: boolean;
  type: "text" | "emoji" | "gif" | "image";
  replyTo?: {
    id: string;
    content: string;
    type: "text" | "emoji" | "gif" | "image";
    isOwn: boolean;
  };
}

interface Chat {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
  lastMessageId: string;
  lastMessageType: string;
  sender_id: number;
  timestamp: string;
  unreadCount: number;
  isVerified?: boolean;
  isOnline?: boolean;
}

interface UserProfile {
  age: string;
  aboutMe: string;
  joinedDate: string;
  followersCount: string;
}

interface MessagesPageProps {
  onNewPost?: () => void;
  onUserProfileClick?: string;
  currentUserId?: string;
}

export function MessagesPage({
  onNewPost,
  onUserProfileClick,
  currentUserId = "",
}: MessagesPageProps) {
  // --- states (kept original names where relevant) ---
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    age: "",
    aboutMe: "",
    joinedDate: "",
    followersCount: "",
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // typing indicators
  const [isTyping, setIsTyping] = useState(false); // other user's typing for UI
  const [isUserTyping, setIsUserTyping] = useState(false); // my typing state

  // removed typingTimeout & userTypingTimeout states (use refs instead)
  const typingRef = useRef<NodeJS.Timeout | null>(null); // for other user
  const userTypingRef = useRef<NodeJS.Timeout | null>(null); // for my typing debounce

  const router = useRouter();

  const [userOnlineStatus, setUserOnlineStatus] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);

  const notificationCount = useNotificationCount();

  const [chats, setChats] = useState<Chat[]>([]);

  // keep a ref to ws to add/remove handlers cleanly
  const wsRef = useRef<WebSocket | null>(null);

  // ===========================
  //  WebSocket setup & handlers
  //  - moved logic into named functions for clarity
  // ===========================
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, onUserProfileClick]); // keep dependency minimal; handler uses latest selectedChat via closures

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleWsEvent = (data: any) => {
    switch (data.channel) {
      case "status":
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id == data.user ? { ...c, isOnline: data.status } : c
          )
        );
        if (selectedChat?.id == data.user) {
          setUserOnlineStatus(data.status);
        }
        break;

      case "typing-start":
        handleOtherUserTypingStart(data.payload.chat_id);
        break;

      case "typing-stop":
        handleOtherUserTypingStop(data.payload.chat_id);
        break;

      case "chat":
        if (onUserProfileClick && onUserProfileClick == data.payload.chat_id) {
          const ws = wsRef.current;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                channel: "chat-seen",
                chat_id: onUserProfileClick,
                to: data.payload.sender_id,
              })
            );
          }

          setMessages((prev) =>
            //skipe the prev withe the same id
            prev ? [...prev, data.payload] : [data.payload]
          );

          setChats((prevChats) =>
            prevChats.map((c) => {
              if (c.id == data.payload.chat_id) {
                c = {
                  ...c,
                  lastMessage: data.payload.content,
                  lastMessageType: data.payload.type,
                  lastMessageId: data.payload.id,
                  timestamp: data.payload.timestamp,
                  sender_id: data.payload.sender_id,
                };
                return c;
              } else {
                return c;
              }
            })
          );
        } else {
          setChats((prevChats) =>
            prevChats.map((c) => {
              if (c.id == data.payload.chat_id) {
                c = {
                  ...c,
                  unreadCount: c.unreadCount + 1,
                  lastMessage: data.payload.content,
                  lastMessageType: data.payload.type,
                  lastMessageId: data.payload.id,
                  timestamp: data.payload.timestamp,
                  sender_id: data.payload.sender_id,
                };
                return c;
              } else {
                return c;
              }
            })
          );
        }
        break;

      case "chat-seen":
        if (onUserProfileClick && onUserProfileClick == data.payload.chat_id) {
          setMessages((prev) => {
            if (!prev || prev.length === 0) return [];
            const lastIndex = prev.length - 1;
            const lastMessage = prev[lastIndex];
            if (lastMessage.isRead) return prev;
            const updated = [...prev];
            updated[lastIndex] = {
              ...lastMessage,
              isRead: true,
              timestamp: data.payload.message.timestamp,
            };
            return updated;
          });
        }
        break;

      case "chat-delete":
        if (onUserProfileClick && onUserProfileClick == data.payload.chat_id) {
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== data.payload.old_message_id)
          );
        }
        setChats((prevChats) =>
          prevChats.map((c) => {
            if (
              c.id == data.payload.chat_id &&
              c.lastMessageId == data.payload.old_message_id
            ) {
              return {
                ...c,
                unreadCount: c.unreadCount == 0 ? 0 : c.unreadCount - 1,
                lastMessage: data.payload.new_message.content,
                lastMessageType: data.payload.new_message.type,
                lastMessageId: data.payload.new_message.id,
                timestamp: data.payload.new_message.timestamp,
                sender_id: data.payload.new_message.sender_id,
              };
            } else {
              return c;
            }
          })
        );
        break;
      case "new-chat":
        setChats((prevChats) => [...prevChats, data.payload.user]);
        break;

      default:
        break;
    }
  };

  // ===========================
  //  Fetch chats & messages when selectedChat changes
  //  (kept your original flow but structured)
  // ===========================
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch(`${siteConfig.domain}/api/get-users`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch chats");
        const data: Chat[] = await res.json();
        setChats(data || []);
        if (onUserProfileClick && !selectedChat && data) {
          const chat = data.find((c) => c.id === onUserProfileClick);
          if (chat) setSelectedChat(chat);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchChats();

    if (selectedChat) {
      fetchUserProfile(selectedChat.id);
      fetchUserOnlineStatus(selectedChat.id);
      fetchMessages(selectedChat.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  // reduce frequency of seen display updates (was 100ms -> now 1000ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) => {
        if (!prev || prev.length === 0) return [];
        const lastIndex = prev.length - 1;
        const lastMessage = prev[lastIndex];
        if (!lastMessage.isRead) return prev;
        const updated = [...prev];
        updated[lastIndex] = {
          ...lastMessage,
          seen: timeAgo(lastMessage.timestamp),
        };
        return updated;
      });
    }, 1000); // changed to 1s to reduce CPU overhead

    return () => clearInterval(interval);
  }, [messages]);

  const fetchMessages = async (userId: string) => {
    try {
      setMessagesLoading(true);
      const response = await fetch(
        `${siteConfig.domain}/api/get-messages/${userId}`,
        {
          credentials: "include",
        }
      );
      const messagesData = await response.json();
      setMessages(messagesData);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const response = await fetch(
        `${siteConfig.domain}/api/get-users/profile/${userId}`,
        {
          credentials: "include",
        }
      );
      const profileData = await response.json();
      setUserProfile(profileData);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchUserOnlineStatus = (userId: string) => {
    const chat = chats.find((c) => c.id == userId);
    if (chat) {
      setUserOnlineStatus(chat.isOnline || false);
    }
  };

  // scroll helpers (kept)
  const scrollToBottom = (force = false) => {
    if (force || isUserAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const checkIfAtBottom = () => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const threshold = 100;
    const isAtBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + threshold;
    setIsUserAtBottom(isAtBottom);
  };

  useEffect(() => {
    if (messages?.length > previousMessageCount) {
      scrollToBottom();
      setPreviousMessageCount(messages?.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // =========================== // Sorted chats by last message // ===========================
  const filteredAndSortedChats = (chats ?? [])
    .filter(
      (chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime; // newest first
    });

  useEffect(() => {
    if (selectedChat) {
      setIsUserAtBottom(true);
      setPreviousMessageCount(messages?.length);
      setTimeout(() => scrollToBottom(true), 100);

      // Reset typing states when switching chats
      setIsTyping(false);
      setIsUserTyping(false);
      if (userTypingRef.current) {
        clearTimeout(userTypingRef.current);
        userTypingRef.current = null;
      }
      if (typingRef.current) {
        clearTimeout(typingRef.current);
        typingRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  // ===========================
  //  Typing effect for my typing (debounced)
  //  - useRef for timeout, send start once, send stop after debounce
  // ===========================
  useEffect(() => {
    // If input non-empty -> start typing (send once), reset debounce timer
    if (!selectedChat || !onUserProfileClick) return;

    const ws = wsRef.current;
    if (newMessage.length > 0) {
      setIsUserTyping(true);
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(
            JSON.stringify({
              channel: "typing-start",
              chat_id: onUserProfileClick,
            })
          );
        } catch (err) {
          console.error("Error sending typing-start:", err);
        }
      }

      // reset debounce timer to stop typing after 3s of inactivity
      if (userTypingRef.current) clearTimeout(userTypingRef.current);
      userTypingRef.current = setTimeout(() => {
        // stop typing
        setIsUserTyping(false);
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(
              JSON.stringify({
                channel: "typing-stop",
                chat_id: selectedChat.id,
              })
            );
          } catch (err) {
            console.error("Error sending typing-stop:", err);
          }
        }
        userTypingRef.current = null;
      }, 3000);
    } else {
      // empty input => stop immediately
      if (isUserTyping) {
        setIsUserTyping(false);
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(
              JSON.stringify({
                channel: "typing-stop",
                chat_id: selectedChat.id,
              })
            );
          } catch (err) {
            console.error("Error sending typing-stop:", err);
          }
        }
      }
      if (userTypingRef.current) {
        clearTimeout(userTypingRef.current);
        userTypingRef.current = null;
      }
    }

    // cleanup on effect rerun: do NOT clear userTypingRef here (we rely on it)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newMessage, selectedChat]);

  // ===========================
  // Other user typing handlers (kept names, simplified)
  // - use typingRef for debounce
  // ===========================
  const handleOtherUserTypingStart = (chatId: string) => {
    if (onUserProfileClick && chatId === onUserProfileClick) {
      setIsTyping(true);

      // reset timeout to clear typing after 3s if no new event
      if (typingRef.current) clearTimeout(typingRef.current);
      typingRef.current = setTimeout(() => {
        setIsTyping(false);
        typingRef.current = null;
      }, 3000);
    }
  };

  const handleOtherUserTypingStop = (chatId: string) => {
    if (onUserProfileClick && chatId === onUserProfileClick) {
      setIsTyping(false);
      if (typingRef.current) {
        clearTimeout(typingRef.current);
        typingRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      // clear any pending timeouts on unmount
      if (typingRef.current) {
        clearTimeout(typingRef.current);
        typingRef.current = null;
      }
      if (userTypingRef.current) {
        clearTimeout(userTypingRef.current);
        userTypingRef.current = null;
      }
    };
  }, []);

  // handleInputChange now only updates state; typing logic handled in useEffect above
  const handleInputChange = (value: string) => {
    setNewMessage(value);
  };

  // Send message (kept same, minor cleanup)
  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedChat) {
      const isOnlyEmojis =
        /^[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]+$/u.test(
          newMessage.trim()
        );

      const tempId = uuidv4();
      const message: Message = {
        id: tempId,
        content: newMessage.trim(),
        timestamp: new Date().toLocaleString(),
        isOwn: true,
        isRead: false,
        type: isOnlyEmojis ? "emoji" : "text",
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              content: replyingTo.content,
              type: replyingTo.type,
              isOwn: replyingTo.isOwn,
            }
          : undefined,
      };

      setMessages((prev) => (prev ? [...prev, message] : [message]));

      try {
        const response = await fetch(
          `${siteConfig.domain}/api/send-message/${onUserProfileClick}`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message),
          }
        );
        if (!response.ok) throw new Error("Failed to send message");
        if (replyingTo) {
          // keep behavior
        }
        const data = await response.json();
        setChats((prevChats) =>
          prevChats.map((c) => {
            if (c.id == data.chat_id) {
              c = {
                ...c,
                lastMessage: data.content,
                lastMessageType: data.type,
                lastMessageId: data.id,
                timestamp: data.timestamp,
                sender_id: data.sender_id,
              };
              return c;
            } else {
              return c;
            }
          })
        );
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      }

      setNewMessage("");
      setReplyingTo(null);

      // stop typing immediately after send
      const ws = wsRef.current;
      setIsUserTyping(false);
      if (userTypingRef.current) {
        clearTimeout(userTypingRef.current);
        userTypingRef.current = null;
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(
            JSON.stringify({
              channel: "typing-stop",
              chat_id: selectedChat.id,
            })
          );
        } catch (err) {
          console.error("Error sending typing-stop:", err);
        }
      }
    }
  };

  const handleNewPost = () => {
    onNewPost?.();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    // Don't close emoji picker - let user add multiple emojis
  };

  const handleGifSelect = async (gifUrl: string) => {
    const message: Message = {
      id: uuidv4(),
      content: gifUrl,
      timestamp: new Date().toLocaleString(),
      isOwn: true,
      isRead: false,
      type: "gif",
    };

    setMessages((prev) => [...prev, message]);
    setShowGifPicker(false);

    try {
      const response = await fetch(
        `${siteConfig.domain}/api/send-message/${onUserProfileClick}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        }
      );
      if (!response.ok) throw new Error("Failed to send message");
      const data = await response.json();
      console.log("Image uploaded successfully:", data);
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id == data.chat_id) {
            c = {
              ...c,
              lastMessage: data.content,
              lastMessageType: data.type,
              lastMessageId: data.id,
              timestamp: data.timestamp,
              sender_id: data.sender_id,
            };
            return c;
          } else {
            return c;
          }
        })
      );
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
    }
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    const avatarForm = new FormData();
    let avatarUrl = "";
    avatarForm.append("image", file);

    await fetch(`${siteConfig.domain}/api/upoad-file`, {
      method: "POST",
      body: avatarForm,
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Upload failed");
        }
        return res.json();
      })
      .then((data) => {
        avatarUrl = data.messageImageUrl;
      })
      .catch((err) => {
        console.error(err);
      });

    const message: Message = {
      id: uuidv4(),
      content: avatarUrl || imageUrl,
      timestamp: new Date().toLocaleString(),
      isOwn: true,
      isRead: false,
      type: "image",
    };

    setMessages((prev) => [...prev, message]);

    try {
      const response = await fetch(
        `${siteConfig.domain}/api/send-message/${onUserProfileClick}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        }
      );
      if (!response.ok) throw new Error("Failed to send message");
      const data = await response.json();
      console.log("Image uploaded successfully:", data);
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id == data.chat_id) {
            c = {
              ...c,
              lastMessage: data.content,
              lastMessageType: data.type,
              lastMessageId: data.id,
              timestamp: data.timestamp,
              sender_id: data.sender_id,
            };
            return c;
          } else {
            return c;
          }
        })
      );
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
    }

    event.target.value = "";
  };

  const handleUnsendMessage = async (messageId: string) => {
    try {
      const response = await fetch(
        `${siteConfig.domain}/api/unsend-message/${messageId}`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to unsend message");
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      const data = await response.json();
      console.log("Unsent message:", data);
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id == data.chat_id && c.lastMessageId == messageId) {
            return {
              ...c,
              lastMessage: data.content,
              lastMessageType: data.type,
              lastMessageId: data.id,
              timestamp: data.timestamp,
              sender_id: data.sender_id,
            };
          } else {
            return c;
          }
        })
      );
    } catch (error) {
      console.error("Error unsending message:", error);
    }
  };

  const handleReplyToMessage = async (message: Message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const renderReplyContent = (replyTo: Message["replyTo"]) => {
    if (!replyTo) return null;
    switch (replyTo.type) {
      case "emoji":
        return replyTo.content;
      case "image":
        return "📷 Image";
      case "gif":
        return "🎞️ GIF";
      default:
        return replyTo.content;
    }
  };

  const setSeenChat = (chatId: string) => {
    fetch(`${siteConfig.domain}/api/set-seen-chat/${chatId}`, {
      method: "POST",
      credentials: "include",
    }).catch((err) => console.error(err));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function formatChatMeta(chat: any) {
    const hideTime =
      chat.sender_id == parseInt(currentUserId) || !chat.timestamp;
    let message = "";
    let messageType = "";
    switch (chat.lastMessageType) {
      case "image":
        message = "📷 Image";
        break;
      case "gif":
        message = "🎞️ GIF";
        break;
      default:
        message = chat.lastMessage;
        messageType = "Message";
        break;
    }
    switch (hideTime && chat.sender_id == parseInt(currentUserId)) {
      case true:
        return (
          <span className="text-sm text-muted-foreground truncate">
            {messageType == "Message" ? (
              <>{"You sent an " + messageType}</>
            ) : (
              <>{"You sent an " + message}</>
            )}
          </span>
        );
      default:
        return (
          <span className="text-sm text-muted-foreground truncate">
            {message}{" "}
            {!hideTime && chat.timestamp && (
              <>{timeAgo(chat.timestamp, true)}</>
            )}
          </span>
        );
    }
  }

  // --- JSX Refactored for Glassmorphism ---
  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile/Desktop Sidebar Navigation */}
      <SidebarNavigation
        activeItem="messages"
        onNewPost={handleNewPost}
        notificationCount={notificationCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={toggleMobileMenu}
      />

      <div className="flex flex-1 lg:ml-72 h-screen overflow-hidden">
        {/* Messages Sidebar - Full width on mobile when no chat selected */}
        <div
          className={`${
            selectedChat ? "hidden lg:flex lg:w-96" : "w-full lg:flex lg:w-96"
          } flex-col border-r border-border/40 bg-card/30 backdrop-blur-xl transition-all duration-300 h-full`}
        >
          <div className="p-5 border-b border-border/40">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Messages
              </h1>
            </div>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search Direct Messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 focus-visible:ring-primary/30 rounded-xl h-11"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {/* Chat List */}
            {filteredAndSortedChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => {
                  if (window.innerWidth >= 1024) {
                    router.replace(`/messages/${chat.id}`);
                  }
                  setSelectedChat(chat);
                  setSeenChat(chat.id);
                }}
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedChat?.id === chat.id
                    ? "bg-primary/15 border border-primary/20 shadow-sm"
                    : "hover:bg-white/5 border border-transparent hover:border-white/10"
                }`}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-background">
                    <AvatarImage
                      src={`${siteConfig.domain}/${chat.avatar}`}
                      alt={chat.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {chat.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {chat.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm" />
                  )}
                  {chat.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center rounded-full px-1 shadow-sm border border-background">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`font-semibold truncate ${
                        selectedChat?.id === chat.id
                          ? "text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {chat.name}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {!(
                        !chat.timestamp ||
                        (chat.sender_id == parseInt(currentUserId) &&
                          !chat.timestamp)
                      ) && timeAgo(chat.timestamp, true)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="truncate pr-2">{formatChatMeta(chat)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        {selectedChat ? (
          <div className="w-full lg:flex-1 flex flex-col min-w-0 bg-background/40 backdrop-blur-sm relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none"></div>

            {/* Chat Header */}
            <div className="p-4 border-b border-border/40 bg-card/50 backdrop-blur-md flex items-center justify-between z-10 shadow-sm">
              <div className="flex items-center gap-3 lg:gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedChat(null)}
                  className="lg:hidden -ml-2 text-muted-foreground"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <div className="relative">
                  <Avatar className="h-10 w-10 lg:h-11 lg:w-11 border border-border/50">
                    <AvatarImage
                      src={`${siteConfig.domain}/${selectedChat.avatar}`}
                      alt={selectedChat.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {selectedChat.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {userOnlineStatus && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-foreground text-base lg:text-lg leading-tight">
                    {selectedChat.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    {userOnlineStatus ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                        Online
                      </>
                    ) : (
                      "Offline"
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages List */}
            <div
              ref={messagesContainerRef}
              onScroll={checkIfAtBottom}
              className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar space-y-6"
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="glass-panel p-6 rounded-2xl flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Loading conversation...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Profile Summary at top of chat */}
                  <div className="flex flex-col items-center justify-center py-8 pb-12 opacity-80 hover:opacity-100 transition-opacity">
                    <Avatar className="h-24 w-24 mb-4 ring-4 ring-background shadow-xl">
                      <AvatarImage
                        src={`${siteConfig.domain}/${selectedChat.avatar}`}
                      />
                      <AvatarFallback className="text-2xl bg-muted">
                        {selectedChat.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-bold text-foreground">
                      {selectedChat.name}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      @{selectedChat.username}
                    </p>
                    <div className="mt-4 text-xs text-muted-foreground bg-muted/30 px-4 py-2 rounded-full border border-border/50">
                      Joined{" "}
                      {new Date(userProfile.joinedDate).toLocaleDateString()} ·{" "}
                      {userProfile.followersCount} followers
                    </div>
                  </div>

                  {messages &&
                    messages.map((message, index) => {
                      const isSequence =
                        index > 0 &&
                        messages[index - 1].isOwn === message.isOwn;
                      return (
                        <div
                          key={message.id}
                          className={`flex w-full ${
                            message.isOwn ? "justify-end" : "justify-start"
                          } ${isSequence ? "mt-1" : "mt-4"}`}
                        >
                          <div
                            className={`flex max-w-[85%] lg:max-w-[70%] ${
                              message.isOwn ? "flex-row-reverse" : "flex-row"
                            } items-end gap-2`}
                          >
                            {/* Avatar for non-owned messages (only show on last of sequence) */}
                            {!message.isOwn && (
                              <Avatar
                                className={`h-8 w-8 flex-shrink-0 ${
                                  isSequence ? "opacity-0" : "opacity-100"
                                }`}
                              >
                                <AvatarImage
                                  src={`${siteConfig.domain}/${selectedChat.avatar}`}
                                />
                                <AvatarFallback>
                                  {selectedChat.name[0]}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div
                              className={`flex flex-col ${
                                message.isOwn ? "items-end" : "items-start"
                              }`}
                            >
                              <ContextMenu>
                                <ContextMenuTrigger>
                                  <div
                                    className={`relative px-4 py-2.5 shadow-sm text-sm lg:text-[15px] leading-relaxed
                                                ${
                                                  message.type === "emoji" ||
                                                  message.type === "image" ||
                                                  message.type === "gif"
                                                    ? "bg-transparent shadow-none p-0"
                                                    : ""
                                                }
                                                ${
                                                  message.isOwn
                                                    ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                                                    : "bg-card border border-border/50 text-foreground rounded-2xl rounded-tl-sm"
                                                }
                                                ${
                                                  message.replyTo
                                                    ? "rounded-tl-none rounded-tr-none"
                                                    : ""
                                                }
                                                `}
                                  >
                                    {/* Reply Context */}
                                    {message.replyTo && (
                                      <div
                                        className={`mb-2 px-3 py-2 rounded-lg text-xs bg-black/10 dark:bg-black/20 border-l-2 border-white/30 backdrop-blur-sm`}
                                      >
                                        <div className="font-bold opacity-90 mb-0.5">
                                          {message.isOwn
                                            ? "You"
                                            : selectedChat.name}{" "}
                                          replied:
                                        </div>
                                        <div className="opacity-80 truncate max-w-[200px]">
                                          {renderReplyContent(message.replyTo)}
                                        </div>
                                      </div>
                                    )}

                                    {/* Content */}
                                    {message.type === "emoji" ? (
                                      <div className="text-5xl sm:text-6xl leading-none hover:scale-110 transition-transform cursor-pointer">
                                        {message.content}
                                      </div>
                                    ) : message.type === "gif" ? (
                                      <div className="rounded-xl overflow-hidden border border-border/50 shadow-md max-w-[280px]">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={message.content}
                                          alt="GIF"
                                          className="w-full h-auto"
                                        />
                                      </div>
                                    ) : message.type === "image" ? (
                                      <div className="rounded-xl overflow-hidden border border-border/50 shadow-md max-w-[280px] group relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={`${siteConfig.domain}/${message.content}`}
                                          alt="Shared image"
                                          className="w-full h-auto cursor-pointer transition-transform duration-500 group-hover:scale-105"
                                          onClick={() =>
                                            window.open(
                                              message.content,
                                              "_blank"
                                            )
                                          }
                                        />
                                      </div>
                                    ) : (
                                      <span className="whitespace-pre-wrap break-words">
                                        {message.content}
                                      </span>
                                    )}
                                  </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent className="glass-panel border-border/50">
                                  {message.isOwn ? (
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleUnsendMessage(message.id)
                                      }
                                      className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
                                    >
                                      Unsend Message
                                    </ContextMenuItem>
                                  ) : (
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleReplyToMessage(message)
                                      }
                                      className="cursor-pointer"
                                    >
                                      Reply
                                    </ContextMenuItem>
                                  )}
                                </ContextMenuContent>
                              </ContextMenu>

                              {/* Timestamp & Read Status */}
                              <div
                                className={`flex items-center gap-1 mt-1 text-[10px] text-muted-foreground font-medium ${
                                  message.isOwn
                                    ? "justify-end"
                                    : "justify-start"
                                } px-1`}
                              >
                                {message.isOwn && message.isRead && (
                                  <span className="text-primary">Read</span>
                                )}
                                <span>{timeAgo(message.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card/50 backdrop-blur-md border-t border-border/40 z-10">
              {/* Typing Indicator */}
              {isTyping && (
                <div className="absolute -top-10 left-6 bg-card/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-medium text-muted-foreground border border-border/50 shadow-sm animate-in slide-in-from-bottom-2 fade-in">
                  {selectedChat.name} is typing...
                </div>
              )}

              {/* Reply Preview */}
              {replyingTo && (
                <div className="mb-3 flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-xl backdrop-blur-sm animate-in slide-in-from-bottom-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary mb-0.5">
                      Replying to{" "}
                      {replyingTo.isOwn ? "yourself" : selectedChat?.name}
                    </p>
                    <p className="text-sm text-foreground/80 truncate">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {renderReplyContent({
                        ...replyingTo,
                        isOwn: replyingTo.isOwn,
                      } as any)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancelReply}
                    className="h-8 w-8 rounded-full hover:bg-primary/20 text-primary"
                  >
                    <span className="text-lg">×</span>
                  </Button>
                </div>
              )}

              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <div className="flex gap-1 pb-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleImageSelect}
                    className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowGifPicker(!showGifPicker);
                      setShowEmojiPicker(false);
                    }}
                    className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <ImagePlay className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowGifPicker(false);
                    }}
                    className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex-1 relative bg-muted/40 rounded-2xl border border-border/50 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                  <Input
                    placeholder={
                      replyingTo ? "Type your reply..." : "Type a message..."
                    }
                    value={newMessage}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="border-0 bg-transparent focus-visible:ring-0 py-3 px-4 min-h-[48px] max-h-32"
                  />
                </div>

                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  className={`h-12 w-12 rounded-full shadow-lg transition-all duration-300 ${
                    newMessage.trim()
                      ? "bg-primary hover:bg-primary/90 scale-100"
                      : "bg-muted text-muted-foreground scale-90 opacity-70"
                  }`}
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-5 w-5 ml-0.5" />
                </Button>
              </div>

              {/* Pickers */}
              {(showEmojiPicker || showGifPicker) && (
                <div className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-border/50 animate-in zoom-in-95 duration-200">
                  {showEmojiPicker && (
                    <EmojiPicker
                      onEmojiClick={(e) => handleEmojiSelect(e.emoji)}
                      theme={Theme.DARK}
                      width={320}
                      height={400}
                    />
                  )}
                  {showGifPicker && (
                    <GifPicker
                      onGifClick={(g) => handleGifSelect(g.url)}
                      tenorApiKey="AIzaSyB78CUkLJjdlA67853bVqpcwjJaywRAlaQ"
                      theme={Theme.DARK}
                      width={320}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="hidden lg:flex lg:flex-1 flex-col items-center justify-center bg-background/40 backdrop-blur-sm text-center p-8">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Your Messages
            </h2>
            <p className="text-muted-foreground max-w-md text-lg">
              Select a conversation from the sidebar or start a new one to
              connect with your friends.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessagesPage;
