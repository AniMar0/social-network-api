"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  Smile,
  ImageIcon,
  MoreVertical,
  Phone,
  Video,
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { initWebSocket, addMessageListener } from "@/lib/websocket";

interface GroupChatMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  timestamp: string;
  type: "text" | "emoji" | "image";
  isOwn: boolean;
}

interface GroupChatProps {
  groupId: string;
  groupTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GroupChat({
  groupId,
  groupTitle,
  isOpen,
  onClose,
}: GroupChatProps) {
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/groups/chat/${groupId}`,
        {
          credentials: "include",
        }
      );
      if (res.ok) {
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedMessages: GroupChatMessage[] = data?.map((msg: any) => ({
          id: msg.id.toString(),
          content: msg.content,
          authorId: msg.senderId.toString(),
          authorName: msg.sender.firstName + " " + msg.sender.lastName,
          authorAvatar: msg.sender.avatar || "",
          timestamp: msg.createdAt,
          type: "text",
          isOwn: msg.isOwn,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [groupId]);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      // Initialize WebSocket (assuming user ID is handled by session/cookie on backend)
      // We pass 0 or dummy ID as initWebSocket mainly sets up the connection
      initWebSocket(0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const removeListener = addMessageListener((data: any) => {
        if (
          data.type === "group_message" &&
          data.groupId === parseInt(groupId)
        ) {
          const newMsg: GroupChatMessage = {
            id: data.id.toString(),
            content: data.content,
            authorId: data.senderId.toString(),
            authorName: data.sender.firstName + " " + data.sender.lastName,
            authorAvatar: data.sender.avatar || "",
            timestamp: data.createdAt,
            type: "text", // Backend currently only supports text content in this payload structure
            isOwn: false, // We'll handle "isOwn" logic by checking senderId against current user if needed,
            // but for incoming WS messages, if it's broadcasted back to sender, we might duplicate.
            // Usually sender adds their own message optimistically or via API response.
            // Let's check if we receive our own messages.
          };

          // Avoid duplicates if we already added it via API response
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      });

      return () => {
        removeListener();
      };
    }
  }, [isOpen, groupId, fetchMessages]);

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      try {
        const res = await fetch("http://localhost:8080/api/groups/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId: parseInt(groupId),
            content: newMessage.trim(),
          }),
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          const sentMsg: GroupChatMessage = {
            id: data.id.toString(),
            content: data.content,
            authorId: data.senderId.toString(),
            authorName: data.sender.FirstName + " " + data.sender.LastName, // Note capitalization from Go struct
            authorAvatar: data.sender.AvatarUrl || "",
            timestamp: data.createdAt,
            type: "text",
            isOwn: true,
          };

          setMessages((prev) => [...(prev || []), sentMsg]);
          setNewMessage("");
          setShowEmojiPicker(false);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };

  const handleImageUpload = () => {
    // Image upload logic would go here, likely needing a separate API endpoint
    // For now, we'll just log it as not implemented fully in backend for chat yet
    console.log("Image upload not yet implemented for group chat");
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[650px] flex flex-col p-0 glass-panel border-border/50 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 border-b border-border/40 bg-background/40 backdrop-blur-md z-10">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-primary-foreground font-bold shadow-lg">
                {groupTitle.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="text-lg font-bold">{groupTitle}</span>
                <p className="text-xs text-muted-foreground font-normal">
                  Group Chat
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-background/50"
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-background/50"
              >
                <Video className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-background/50"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-background/30 to-background/50">
          {messages?.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.isOwn ? "justify-end" : "justify-start"
              } group animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {!message.isOwn && (
                <Avatar className="h-8 w-8 mt-1 ring-2 ring-background shadow-sm">
                  <AvatarImage
                    src={message.authorAvatar}
                    alt={message.authorName}
                  />
                  <AvatarFallback className="bg-muted text-xs">
                    {message.authorName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={`max-w-[75%] lg:max-w-[65%] flex flex-col ${
                  message.isOwn ? "items-end" : "items-start"
                }`}
              >
                {!message.isOwn && (
                  <div className="text-xs text-muted-foreground mb-1 ml-1 font-medium">
                    {message.authorName}
                  </div>
                )}

                <div
                  className={`relative px-4 py-2.5 shadow-sm ${
                    message.isOwn
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                      : "glass-card border border-border/50 text-foreground rounded-2xl rounded-tl-sm"
                  }`}
                >
                  {message.type === "emoji" ? (
                    <div className="text-4xl cursor-pointer hover:scale-110 transition-transform">
                      {message.content}
                    </div>
                  ) : message.type === "image" ? (
                    <div className="overflow-hidden max-w-xs cursor-pointer rounded-lg border border-border/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={message.content}
                        alt="Uploaded image"
                        className="w-full h-auto hover:opacity-90 transition-opacity"
                        onClick={() => window.open(message.content, "_blank")}
                      />
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed">
                      {message.content}
                    </div>
                  )}
                </div>

                <div
                  className={`text-[10px] text-muted-foreground mt-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity ${
                    message.isOwn ? "mr-1" : "ml-1"
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {message.isOwn && (
                <Avatar className="h-8 w-8 mt-1 ring-2 ring-background shadow-sm">
                  <AvatarImage
                    src={message.authorAvatar}
                    alt={message.authorName}
                  />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {message.authorName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-xl overflow-hidden border border-border/50">
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              theme={Theme.DARK}
              width={300}
              height={400}
            />
          </div>
        )}

        {/* Message Input */}
        <div className="p-4 border-t border-border/40 bg-background/40 backdrop-blur-md">
          <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-2xl border border-border/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
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
              title="Upload image"
              className="rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 h-9 w-9"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add emoji"
              className="rounded-xl text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 h-9 w-9"
            >
              <Smile className="h-5 w-5" />
            </Button>

            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 h-9"
            />

            <Button
              onClick={handleSendMessage}
              size="icon"
              className={`rounded-xl h-9 w-9 transition-all ${
                newMessage.trim()
                  ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              disabled={!newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GroupChat;
