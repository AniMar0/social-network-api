package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"fmt"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/twinj/uuid"
)

type Client struct {
	ID        string           `json:"id"`
	Conn      *websocket.Conn  `json:"-"`
	Send      chan interface{} `json:"-"`
	UserID    int              `json:"user_id"`
	SessionID string           `json:"session_id"`
}

func (S *Server) WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	banned, _ := S.ActionMiddleware(r, http.MethodGet, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, SessionID, _ := S.CheckSession(r)

	conn, err := S.upgrader.Upgrade(w, r, nil)
	if err != nil {
		tools.SendJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	client := &Client{
		ID:        uuid.NewV4().String(),
		Conn:      conn,
		UserID:    userID,
		SessionID: SessionID,
		Send:      make(chan interface{}, 10),
	}

	// add client
	S.Lock()
	if S.Users[userID] == nil {
		S.Users[userID] = []*Client{}
	}
	S.Users[userID] = append(S.Users[userID], client)
	S.Unlock()

	if len(S.Users[userID]) == 1 {
		S.BroadcastOnlineStatus(userID, "online")
	}

	// start writer
	go S.StartWriter(client)

	// start reader
	go S.StartReader(client)
}

func (S *Server) StartReader(client *Client) {
	defer func() {
		client.Conn.Close()
		S.Lock()
		conns := S.Users[client.UserID]
		for i, c := range conns {
			if c == client {
				S.Users[client.UserID] = append(conns[:i], conns[i+1:]...)
				break
			}
		}
		S.Unlock()

		if len(S.Users[client.UserID]) == 0 {
			S.BroadcastOnlineStatus(client.UserID, "offline")
		}
	}()

	for {
		var msg map[string]interface{}
		if err := client.Conn.ReadJSON(&msg); err != nil {
			return
		}
		// unified channel switch
		switch msg["channel"] {
		}

	}
}

func (S *Server) StartWriter(c *Client) {
	defer func() {
		c.Conn.Close()
		close(c.Send)
	}()

	for msg := range c.Send {
		if err := c.Conn.WriteJSON(msg); err != nil {
			fmt.Println("Error writing to client:", err)
			return
		}
	}
}

func (S *Server) PushNotification(notifType string, userID int, notif interface{}) {
	S.RLock()
	defer S.RUnlock()
	for _, Session := range S.Users[userID] {
		//fmt.Println("Sending notification to user", userID)
		// fmt.Println("Notification:", notif)
		Session.Send <- map[string]interface{}{
			"channel": "notifications" + notifType,

			"to":      userID,
			"payload": notif,
		}
	}
}

func (S *Server) PushMessage(SessionID string, userID int, msg interface{}) {
	S.RLock()
	defer S.RUnlock()
	for _, Session := range S.Users[userID] {
		if Session.SessionID != SessionID {
			Session.Send <- map[string]interface{}{
				"channel": "chat",
				"payload": msg,
			}
		}
	}
}

func (S *Server) GetConnections(userID int) []*Client {
	S.RLock()
	defer S.RUnlock()
	// fmt.Println("Getting connections for user", userID)
	// fmt.Println("Connections:", S.Users[userID])
	return S.Users[userID]
}

func (S *Server) BroadcastOnlineStatus(userID int, status string) {
	S.RLock()
	defer S.RUnlock()
	UsersOnline := S.GetUsersStatus()

	for _, ID := range UsersOnline["online"] {
		if ID == userID {
			continue
		}
		chatID := S.GetChatID(userID, ID)
		for _, Session := range S.Users[ID] {
			Session.Send <- map[string]interface{}{
				"channel": "status",
				"user":    chatID,
				"status":  status == "online",
			}
		}
	}
}

func (S *Server) GetUsersStatus() map[string][]int {
	S.RLock()
	defer S.RUnlock()

	usersOnlineStatus := make(map[string][]int)
	for userID, connections := range S.Users {
		if len(connections) > 0 {
			usersOnlineStatus["online"] = append(usersOnlineStatus["online"], userID)
		} else {
			usersOnlineStatus["offline"] = append(usersOnlineStatus["offline"], userID)
		}
	}
	return usersOnlineStatus
}

func (S *Server) PushNewChat(userID int, message map[string]interface{}) {
	S.RLock()
	defer S.RUnlock()
	for _, Session := range S.Users[userID] {
		Session.Send <- map[string]interface{}{
			"channel": "new-chat",
			"payload": message,
		}
	}
}

func (S *Server) PushNewPost(userID int, message map[string]interface{}) {
	S.RLock()
	defer S.RUnlock()
	for _, Session := range S.Users[userID] {
		Session.Send <- map[string]interface{}{
			"channel": "new-post",
			"payload": message,
		}
	}
}
