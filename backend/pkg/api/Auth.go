package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/twinj/uuid"
)

func (S *Server) LoggedHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}
	id, _, err := S.CheckSession(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"user":     nil,
			"loggedIn": false,
		})
		return
	}

	userData, err := S.GetUserData("", id)
	if err != nil {
		fmt.Println(err)
		tools.RenderErrorPage(w, r, "User Not Found", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user":     userData,
		"loggedIn": true,
	})
}
func (S *Server) MakeToken(Writer http.ResponseWriter, id int) {
	sessionID := uuid.NewV4().String()
	expirationTime := time.Now().Add(24 * time.Hour)

	_, err := S.db.Exec("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
		sessionID, id, expirationTime)
	if err != nil {
		fmt.Println("Error creating session:", err)
		http.Error(Writer, "Error creating session", http.StatusInternalServerError)
		return
	}

	http.SetCookie(Writer, &http.Cookie{
		Name:     "session_token",
		Value:    sessionID,
		Expires:  expirationTime,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
		Secure:   false,
	})
}
func (S *Server) CheckSession(r *http.Request) (int, string, error) {

	cookie, err := r.Cookie("session_token")
	if err != nil {
		return 0, "", fmt.Errorf("no session cookie")
	}
	sessionID := cookie.Value
	var userID int
	err = S.db.QueryRow(`
        SELECT user_id FROM sessions 
        WHERE session_id = ? AND expires_at > CURRENT_TIMESTAMP
    `, sessionID).Scan(&userID)

	if err != nil {
		return 0, "", fmt.Errorf("invalid or expired session")
	}
	return userID, sessionID, nil
}