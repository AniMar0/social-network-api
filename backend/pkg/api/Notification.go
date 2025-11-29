package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

func (S *Server) GetNotificationsHandler(w http.ResponseWriter, r *http.Request) {
	banned, userID := S.ActionMiddleware(r, http.MethodGet, true, false)
	if banned {
		tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
		return
	}

	rows, err := S.db.QueryContext(r.Context(), `
		SELECT n.id, n.type, n.content, n.is_read, n.created_at,
		       u.id, u.first_name, u.last_name, u.avatar
		FROM notifications n
		JOIN users u ON u.id = n.actor_id
		WHERE n.user_id = ?
		ORDER BY n.created_at DESC
	`, userID)
	if err != nil {
		fmt.Println("DB error:", err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var notifs []map[string]interface{}
	for rows.Next() {
		var notif Notification
		if err := rows.Scan(&notif.ID, &notif.Type, &notif.Content, &notif.IsRead, &notif.CreatedAt,
			&notif.ActorID, &notif.FirstName, &notif.LastName, &notif.Avatar); err != nil {
			fmt.Println("Error scanning row:", err)
			tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		notifs = append(notifs, map[string]interface{}{
			"id":        notif.ID,
			"type":      notif.Type,
			"content":   notif.Content,
			"isRead":    notif.IsRead,
			"timestamp": notif.CreatedAt,
			"user": map[string]interface{}{
				"id":     notif.ActorID,
				"name":   notif.FirstName + " " + notif.LastName,
				"avatar": notif.Avatar,
			},
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifs)
}

func (S *Server) InsertNotification(notif Notification) error {
	_, err := S.db.Exec(`
		INSERT INTO notifications (user_id, actor_id, type, content, is_read)
		VALUES (?, ?, ?, ?, ?)
	`, notif.ID, notif.ActorID, notif.Type, notif.Content, notif.IsRead)
	return err
}

func (S *Server) MarkNotificationAsReadHandler(w http.ResponseWriter, r *http.Request) {
	banned, _ := S.ActionMiddleware(r, http.MethodPut, true, false)
	if banned {
		tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
		return
	}
	ID := r.URL.Path[len("/api/mark-notification-as-read/"):]

	checknotificationID, notificationID := tools.IsNumeric(ID)
	if !checknotificationID {
		tools.SendJSONError(w, "invalid notification ID", http.StatusBadRequest)
		return
	}
	_, err := S.db.Exec(`
		UPDATE notifications
		SET is_read = 1
		WHERE id = ?
	`, notificationID)
	if err != nil {
		if err != sql.ErrNoRows {
			S.ActionMiddleware(r, http.MethodPut, true, true)
			tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
			return
		}
		fmt.Println("DB error:", err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	_, receiverID, err := S.GetSenderAndReceiverIDs(notificationID)
	if err != nil {
		fmt.Println("DB error:", err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	S.PushNotification("-read", receiverID, Notification{})
}

func (S *Server) DeleteNotificationHandler(w http.ResponseWriter, r *http.Request) {
	banned, UserId := S.ActionMiddleware(r, http.MethodDelete, true, false)

	notificationID := r.URL.Path[len("/api/delete-notification/"):]

	senderID, receiverID, err := S.GetSenderAndReceiverIDs(notificationID)

	if banned || (receiverID != tools.IntToString(UserId) && senderID == tools.IntToString(UserId)) {
		S.ActionMiddleware(r, http.MethodDelete, true, true)
		tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
		return
	}

	if err != nil {
		if err == sql.ErrNoRows {
			S.ActionMiddleware(r, http.MethodDelete, true, true)
			tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
			return
		}
		fmt.Println("DB error:", err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	_, err = S.db.Exec(`
		DELETE FROM notifications
		WHERE id = ?
	`, notificationID)
	if err != nil {
		fmt.Println("DB error:", err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	S.PushNotification("-delete", tools.StringToInt(receiverID), Notification{})
}

func (S *Server) DeleteNotification(senderID, resiverID int, notificationType string) error {
	_, err := S.db.Exec(`
		DELETE FROM notifications
		WHERE actor_id = ? AND user_id = ? AND type = ?
	`, senderID, resiverID, notificationType)

	return err
}

func (S *Server) GetSenderAndReceiverIDs(notificationID int) (int, int, error) {
	var senderID, receiverID int
	err := S.db.QueryRow(`
		SELECT actor_id, user_id
		FROM notifications
		WHERE id = ?
	`, notificationID).Scan(&senderID, &receiverID)
	if err != nil {
		return 0, 0, err
	}
	return senderID, receiverID, nil
}

func (S *Server) MarkAllNotificationAsReadHandler(w http.ResponseWriter, r *http.Request) {
	banned, currentUserID := S.ActionMiddleware(r, http.MethodPut, true, false)
	if banned {
		tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
		return
	}

	_, err := S.db.Exec(`
		UPDATE notifications
		SET is_read = 1
		WHERE user_id = ?
	`, currentUserID)
	if err != nil {
		tools.SendJSONError(w, "DB error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	S.PushNotification("-all-read", currentUserID, Notification{})
}
