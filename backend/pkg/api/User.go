package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func (S *Server) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	var user User
	err := json.NewDecoder(r.Body).Decode(&user)

	if err != nil {
		fmt.Println(err)
		tools.SendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	user.Email = tools.ToLower(user.Email)
	err, found := S.UserFound(user, r.Context())
	if err != nil {
		fmt.Println(err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if found {
		fmt.Println("User already exists")
		tools.SendJSONError(w, "User already exists", http.StatusConflict)
		return
	}

	user.Age = tools.GetAge(user.DateOfBirth)

	if user.Nickname == "" {
		user.Url = tools.ToUsername(user.Email)
	} else {
		user.Url = user.Nickname
	}

	if err := S.AddUser(user, r.Context()); err != nil {
		fmt.Println(err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully"})
}
func (S *Server) LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		tools.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var user LoginUser
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		tools.SendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if user.Identifier == "" || user.Password == "" {
		tools.SendJSONError(w, "Email and password are required", http.StatusBadRequest)
		return
	}
	url, hashedPassword, id, err := S.GetHashedPasswordFromDB(tools.ToLower(user.Identifier))
	if err != nil {
		tools.SendJSONError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}
	if err := tools.CheckPassword(hashedPassword, user.Password); err != nil {
		tools.SendJSONError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}
	S.MakeToken(w, id)

	userData, err := S.GetUserData(url, id)
	if err != nil {
		fmt.Println(err)
		tools.SendJSONError(w, "Failed to retrieve user data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": userData,
	})

	// S.broadcastUserStatusChange()
}

func (S *Server) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		fmt.Println("Method not allowed:", r.Method)
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	cookie, err := r.Cookie("session_token")
	if err != nil {
		http.Error(w, "No session", http.StatusBadRequest)
		return
	}

	var userID int
	S.db.QueryRow("SELECT user_id FROM sessions WHERE session_id = ?", cookie.Value).Scan(&userID)

	_, err = S.db.Exec("DELETE FROM sessions WHERE session_id = ?", cookie.Value)
	if err != nil {
		http.Error(w, "Error deleting session", http.StatusInternalServerError)
		return
	}

	// S.RLock()
	// if clients, exists := S.clients[username]; exists {
	// 	for _, client := range clients {
	// 		client.Send <- map[string]string{
	// 			"event":   "logout",
	// 			"message": "Session terminated",
	// 		}
	// 		client.Conn.Close()
	// 	}
	// 	delete(S.clients, username)
	// }
	// S.RUnlock()

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
		Secure:   false,
	})

	// Broadcast user status change to remaining connected clients
	// go func() {
	// 	time.Sleep(100 * time.Millisecond)
	// 	S.broadcastUserStatusChange()
	// }()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"logged out"}`))
}

func (S *Server) MeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	id, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userData, err := S.GetUserData("", id)
	if err != nil {
		fmt.Println(err)
		tools.RenderErrorPage(w, r, "User Not Found", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(userData)
}

func (S *Server) AddUser(user User, ctx context.Context) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Handle nullable nickname - insert NULL if empty
	var nickname interface{}
	if user.Nickname == "" {
		nickname = nil
	} else {
		nickname = html.EscapeString(user.Nickname)
	}

	// Handle nullable aboutMe - insert NULL if empty
	var aboutMe interface{}
	if user.AboutMe == "" {
		aboutMe = nil
	} else {
		aboutMe = html.EscapeString(user.AboutMe)
	}

	query := `INSERT INTO users (first_name, last_name, birthdate, age, avatar, nickname, about_me,email,password,gender, url)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err = S.db.ExecContext(ctx, query,
		html.EscapeString(user.FirstName),
		html.EscapeString(user.LastName),
		html.EscapeString(user.DateOfBirth),
		user.Age,
		html.EscapeString(user.AvatarUrl),
		nickname,
		aboutMe,
		html.EscapeString(user.Email),
		string(hashedPassword),
		html.EscapeString(user.Gender),
		html.EscapeString(user.Url))
	if err != nil {
		return err
	}
	return nil
}

func (S *Server) GetHashedPasswordFromDB(identifier string) (string, string, int, error) {
	var hashedPassword, url string
	var id int

	err := S.db.QueryRow(`
		SELECT password, id, url FROM users 
		WHERE nickname = ? OR email = ?
	`, identifier, identifier).Scan(&hashedPassword, &id, &url)

	if err != nil {
		if err == sql.ErrNoRows {
			return "", "", 0, fmt.Errorf("this user does not exist")
		}
		return "", "", 0, err
	}
	return url, hashedPassword, id, nil
}

func (S *Server) GetUserData(url string, id int) (UserData, error) {
	var user UserData

	err := S.db.QueryRow(`
		SELECT id, first_name, last_name, nickname, email, birthdate, avatar, about_me, is_private, created_at, url, age
		FROM users 
		WHERE url = ? OR id = ?
	`, url, id).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Nickname,
		&user.Email,
		&user.DateOfBirth,
		&user.Avatar,
		&user.AboutMe,
		&user.IsPrivate,
		&user.JoinedDate,
		&user.Url,
		&user.Age,
	)
	if err != nil {
		return UserData{}, err
	}

	user.FollowersCount, _ = S.GetFollowersCount(user.Url)

	user.FollowingCount, _ = S.GetFollowingCount(user.Url)

	// row := S.db.QueryRow(`SELECT COUNT(*) FROM posts WHERE author_id = ?`, user.ID)
	// row.Scan(&user.PostsCount)

	return user, nil
}

// get all users ids from users table
func (S *Server) GetAllUsers() ([]int, error) {
	rows, err := S.db.Query(`SELECT id FROM users`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}
