"use client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MessageHandler = (data: any) => void;
let ws: WebSocket | null = null;
const listeners: Set<MessageHandler> = new Set();

export function initWebSocket(userId: number) {
  if (ws && ws.readyState === WebSocket.OPEN) return ws;

  ws = new WebSocket("ws://localhost:8080/ws");

  ws.onopen = () => console.log("WebSocket connected for user", userId);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      listeners.forEach((listener) => listener(data));
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  };

  ws.onclose = () => {
    console.log("WebSocket closed for user", userId);
    ws = null;
  };

  return ws;
}

export const getWebSocket = () => ws;

export const addMessageListener = (handler: MessageHandler) => {
  listeners.add(handler);
  return () => listeners.delete(handler);
};

export const closeWebSocket = () => {
  if (ws) {
    ws.close();
    ws = null;
    listeners.clear();
  }
};
