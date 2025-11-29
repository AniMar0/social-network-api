package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

func (S *Server) GetUsersHandler(w http.ResponseWriter, r *http.Request) {
	banned, currentUserID := S.ActionMiddleware(r, http.MethodGet, true, false)
	if banned {
		tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
		return
	}

	chats, err := S.GetUsers(currentUserID)
	if err != nil {
		fmt.Println("Get Users Error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chats)
}

func (S *Server) GetUserProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	currentUserID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	ID := r.URL.Path[len("/api/get-users/profile/"):]
	checkUserID, userID := tools.IsNumeric(ID)
	if !checkUserID {
		tools.SendJSONError(w, "invalid user ID", http.StatusBadRequest)
		return
	}

	userData, err := S.GetUserData("", S.GetOtherUserID(currentUserID, userID))
	if err != nil {
		fmt.Println(err)
		tools.RenderErrorPage(w, r, "User Not Found", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userData)
}

func (S *Server) MakeChatHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}
	currentUserID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	ID := r.URL.Path[len("/api/make-message/"):]
	checkOtherUserID, otherUserID := tools.IsNumeric(ID)
	if !checkOtherUserID {
		tools.SendJSONError(w, "invalid user ID", http.StatusBadRequest)
		return
	}

	if !S.FoundChat(currentUserID, otherUserID) {
		S.MakeChat(currentUserID, otherUserID)
	}

	chatId := S.GetChatID(currentUserID, otherUserID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chatId)
}

func (S *Server) MakeChat(currentUserID, otherUserID int) {
	query := `INSERT INTO chats (user1_id, user2_id) VALUES (?, ?)`
	_, err := S.db.Exec(query, currentUserID, otherUserID)
	if err != nil {
		fmt.Println(err)
	}
}

func (S *Server) FoundChat(currentUserID, otherUserID int) bool {
	query := `SELECT id FROM chats WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`
	var id int
	err := S.db.QueryRow(query, currentUserID, otherUserID, otherUserID, currentUserID).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return false
		}
		fmt.Println("FoundChat", err)
		return false
	}
	return true
}

func (S *Server) SendMessageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	ID := r.URL.Path[len("/api/send-message/"):]

	checkChatID, chatID := tools.IsNumeric(ID)
	if !checkChatID {
		tools.SendJSONError(w, "invalid chat ID", http.StatusBadRequest)
		return
	}

	currentUserID, SessionID, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var message Message
	err = json.NewDecoder(r.Body).Decode(&message)
	if err != nil {
		fmt.Println("send encode error : ", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	message.ChatID = chatID

	S.SendMessage(currentUserID, message)

	resiverID := S.GetOtherUserID(currentUserID, message.ChatID)
	message.SenderID = currentUserID

	if len(S.Users[currentUserID]) > 1 {
		message.IsOwn = true
		S.PushMessage(SessionID, currentUserID, message)
	}

	if S.Users[resiverID] != nil {
		message.IsOwn = false
		S.PushMessage("", resiverID, message)
	}

	message.IsOwn = true
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(message)
}

func (S *Server) SendMessage(currentUserID int, message Message) error {
	query := `INSERT INTO messages (sender_id, id, chat_id, content, is_read, type) VALUES (?,?, ?, ? , ?, ?, ?)`
	_, err := S.db.Exec(query, currentUserID, message.ID, message.ChatID, message.Content, message.IsRead, message.Type)
	if err != nil {
		fmt.Println(err)
		return err
	}
	return nil
}

func (S *Server) GetMessagesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	chatIDstr := r.URL.Path[len("/api/get-messages/"):]
	checkChatID, chatID := tools.IsNumeric(chatIDstr)
	if !checkChatID {
		tools.SendJSONError(w, "invalid chat ID", http.StatusBadRequest)
		return
	}

	currentUserID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	messages, err := S.GetMessages(currentUserID, chatID)
	if err != nil {
		fmt.Println("Get Messages", err)
		tools.RenderErrorPage(w, r, "Messages Not Found", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func (S *Server) GetMessages(currentUserID int, chatID int) ([]Message, error) {
	var messages []Message
	query := `SELECT id, sender_id, content, is_read, type, read_at FROM messages WHERE chat_id = ?`
	rows, err := S.db.Query(query, chatID)
	if err != nil {
		fmt.Println("Get Messages Query Error : ", err)
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var message Message
		var readAt sql.NullTime
		err = rows.Scan(&message.ID, &message.SenderID, &message.Content, &message.IsRead, &message.Type, &readAt)
		if readAt.Valid {
			message.Timestamp = readAt.Time.String()
		}

		if err != nil {
			fmt.Println("Get Messages Scan Error : ", err)
			return nil, err
		}
		message.IsOwn = message.SenderID == currentUserID
		messages = append(messages, message)
	}
	return messages, nil
}

func (S *Server) GetChatID(currentUserID, otherUserID int) int {
	query := `SELECT id FROM chats WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`
	var id int
	err := S.db.QueryRow(query, currentUserID, otherUserID, otherUserID, currentUserID).Scan(&id)
	if err != nil {
		fmt.Println(err)
		return 0
	}
	return id
}

func (S *Server) GetAllChatIDs(currentUserID int) ([]int, error) {
	query := `SELECT id FROM chats WHERE user1_id = ? OR user2_id = ?`
	rows, err := S.db.Query(query, currentUserID, currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int
	for rows.Next() {
		var id int
		err := rows.Scan(&id)
		if err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func (S *Server) GetOtherUserID(currentUserID, chatID int) int {
	query := `SELECT user1_id, user2_id FROM chats WHERE id = ?`
	var user1_id, user2_id int
	err := S.db.QueryRow(query, chatID).Scan(&user1_id, &user2_id)
	if err != nil {
		fmt.Println("Get Other User ID Query Error : ", err)
		return 0
	}
	if user1_id == currentUserID {
		return user2_id
	}
	return user1_id
}

func (S *Server) GetUsers(currentUserID int) ([]Chat, error) {
	query := `
	SELECT u.id, u.nickname, u.first_name || ' ' || u.last_name AS name, u.avatar, u.url, c.id AS chat_id
	FROM
    chats c
    JOIN users u ON u.id = CASE
        WHEN c.user1_id = ? THEN c.user2_id
        ELSE c.user1_id
    END
	WHERE
    c.user1_id = ?
    OR c.user2_id = ?;
	`
	rows, err := S.db.Query(query,
		currentUserID, // 1st ?
		currentUserID, // 2nd ?
		currentUserID, // 3rd ?
	)
	if err != nil {
		fmt.Println("Get Users Query Error : ", err)
		return nil, err
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var c Chat
		var username sql.NullString

		if err := rows.Scan(
			&c.UserID,
			&username,
			&c.Name,
			&c.Avatar,
			&c.Url,
			&c.ChatID,
		); err != nil {
			fmt.Println("Get Users Scan Error : ", err)
			return nil, err
		}
		// Online check
		connections := S.GetConnections(c.UserID)
		if len(connections) > 0 {
			c.IsOnline = true
		}

		if username.Valid {
			c.Username = username.String
		}

		chats = append(chats, c)
	}

	return chats, nil
}

func (S *Server) GetMessageContent(messageID string) Message {
	var message Message
	query := `SELECT id, content, type FROM messages WHERE id = ?`
	S.db.QueryRow(query, messageID).Scan(&message.ID, &message.Content, &message.Type)
	return message
}

func (S *Server) GetChatIDFromMessageID(messageID string) (string, error) {
	var chatID string
	query := `SELECT chat_id FROM messages WHERE id = ?`
	err := S.db.QueryRow(query, messageID).Scan(&chatID)
	if err != nil {
		fmt.Println(err)
		return "", err
	}
	return chatID, nil
}
