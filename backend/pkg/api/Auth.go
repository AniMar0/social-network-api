package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"time"

	"github.com/twinj/uuid"
)

func (S *Server) LoggedHandler(w http.ResponseWriter, r *http.Request) {
	banned, _ := S.ActionMiddleware(r, http.MethodPost, true, false)
	if banned {
		tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
		return
	}

	id, _, err := S.CheckSession(r)
	if err != nil {
		if err.Error() == "user is banned" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"user":     nil,
				"loggedIn": false,
				"banned":   true,
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"user":     nil,
			"loggedIn": false,
		})
		return
	}

	userData, err := S.GetUserData("", id)
	if err != nil {
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user":     userData,
		"loggedIn": true,
	})
}
func (S *Server) MakeToken(Writer http.ResponseWriter, id int) error {
	sessionID := uuid.NewV4().String()
	expirationTime := time.Now().Add(24 * time.Hour)

	_, err := S.db.Exec("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
		sessionID, id, expirationTime)
	if err != nil {
		fmt.Println("Error creating session:", err)
		return err
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
	return nil
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
	var banned bool
	err = S.db.QueryRow(`SELECT is_blocked FROM users WHERE id = ?`, userID).Scan(&banned)
	if err != nil {
		return 0, "", fmt.Errorf("failed to check user status")
	}
	if banned {
		S.db.Exec("DELETE FROM sessions WHERE session_id = ?", sessionID)
		return 0, "", fmt.Errorf("user is banned")
	}
	return userID, sessionID, nil
}

func (S *Server) AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, _, err := S.CheckSession(r)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	}
}

func (S *Server) ActionMiddleware(r *http.Request, Method string, logged bool, banned bool) (bool, int) {
	NeedToBaned := false
	if r.Method != Method {
		NeedToBaned = true
	}
	UserId, _, err := S.CheckSession(r)
	if err == nil && !logged {
		NeedToBaned = true
	}

	if NeedToBaned || banned {
		S.db.Exec("UPDATE users SET is_blocked = 1 WHERE id = ?",
			UserId,
		)
	}

	return NeedToBaned, UserId
}

func (S *Server) ContainsHTML(body []byte) bool {
	htmlRegex := regexp.MustCompile(`(?i)<\/?\w+[\s\S]*?>`)
	return htmlRegex.Match(body)
}
