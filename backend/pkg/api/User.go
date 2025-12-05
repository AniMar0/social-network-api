package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func (S *Server) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	banned, _ := S.ActionMiddleware(r, http.MethodPost, false, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var user User
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		fmt.Println("decode request body error (RegisterHandler):", err)
		tools.SendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	user.Email = tools.ToLower(user.Email)
	err, found := S.UserFound(user)
	if err != nil || found {
		if found {
			fmt.Println("User already exists")
			tools.SendJSONError(w, "User already exists", http.StatusConflict)
			return
		}
		fmt.Println(err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	user.Age = tools.GetAge(user.DateOfBirth)
	if strings.TrimSpace(user.Nickname) == "" {
		user.Url = tools.ToUsername(user.Email)
	} else {
		user.Url = user.Nickname
	}

	if !S.ValidateRegisterInput(user) {
		tools.SendJSONError(w, "Invalid input data", http.StatusBadRequest)
		return
	}

	if err := S.AddUser(user); err != nil {
		fmt.Println("Error adding user to DB:", err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully"})
}
func (S *Server) LoginHandler(w http.ResponseWriter, r *http.Request) {
	banned, _ := S.ActionMiddleware(r, http.MethodPost, false, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var user LoginUser
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		fmt.Println("decode request body error (LoginHandler):", err)
		tools.SendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if user.Identifier == "" || user.Password == "" {
		fmt.Println("Email and password are required")
		tools.SendJSONError(w, "Email and password are required", http.StatusBadRequest)
		return
	}
	url, hashedPassword, id, err := S.GetHashedPasswordFromDB(tools.ToLower(user.Identifier))
	if err != nil {
		fmt.Println("Error getting hashed password from DB:", err)
		tools.SendJSONError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	if err := tools.CheckPassword(hashedPassword, user.Password); err != nil {
		fmt.Println("Password mismatch:", err)
		tools.SendJSONError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	err = S.MakeToken(w, id)
	if err != nil {
		fmt.Println("Error creating session token:", err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	userData, err := S.GetUserData(url, id)
	if err != nil {
		fmt.Println("Error retrieving user data:", err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": userData,
	})
}

func (S *Server) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	banned, _ := S.ActionMiddleware(r, http.MethodPost, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	UserId, sessionid, _ := S.CheckSession(r)

	_, err := S.db.Exec("DELETE FROM sessions WHERE session_id = ? AND user_id = ?", sessionid, UserId)
	if err != nil {
		tools.SendJSONError(w, "Error deleting session", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
		Secure:   false,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"logged out"}`))
}

func (S *Server) MeHandler(w http.ResponseWriter, r *http.Request) {
	banned, userID := S.ActionMiddleware(r, http.MethodGet, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userData, err := S.GetUserData("", userID)
	if err != nil {
		fmt.Println(err)
		tools.SendJSONError(w, "User Not Found", http.StatusBadRequest)
		return
	}

	//userData.ID = ""

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(userData)
}

func (S *Server) AddUser(user User) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user = refactorUserData(user)

	query := `INSERT INTO users (first_name, last_name, birthdate, age, avatar, nickname, about_me,email,password,gender, url)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err = S.db.Exec(query,
		html.EscapeString(user.FirstName),
		html.EscapeString(user.LastName),
		html.EscapeString(user.DateOfBirth),
		user.Age,
		html.EscapeString(user.AvatarUrl),
		html.EscapeString(user.Nickname),
		html.EscapeString(user.AboutMe),
		html.EscapeString(user.Email),
		hashedPassword,
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

func (S *Server) ValidateRegisterInput(user User) bool {
	if !tools.IsValidEmail(user.Email) {
		fmt.Println("Invalid email:", user.Email)
		return false
	}
	if !tools.IsValidPassword(user.Password) {
		fmt.Println("Invalid password:", user.Password)
		return false
	}
	if !tools.IsValidTextLength(user.FirstName, 3, 15) {
		fmt.Println("Invalid first name length:", user.FirstName)
		return false
	}
	if !tools.IsValidTextLength(user.LastName, 3, 15) {
		fmt.Println("Invalid last name length:", user.LastName)
		return false
	}
	if !tools.IsValidAge(user.Age) {
		fmt.Println("Invalid age:", user.Age)
		return false
	}
	if user.Gender != "male" && user.Gender != "female" {
		fmt.Println("Invalid gender:", user.Gender)
		return false
	}
	if strings.TrimSpace(user.Url) == "" {
		fmt.Println("Invalid URL:", user.Url)
		return false
	}

	if !tools.AvatarFiles(user.AvatarUrl) {
		fmt.Println("Invalid avatar URL:", user.AvatarUrl)
		return false
	}

	return true
}

func refactorUserData(user User) User {
	user.FirstName = strings.TrimSpace(user.FirstName)
	user.LastName = strings.TrimSpace(user.LastName)
	user.Nickname = strings.ToLower(strings.TrimSpace(user.Nickname))
	user.Email = strings.ToLower(strings.TrimSpace(user.Email))
	user.AboutMe = strings.TrimSpace(user.AboutMe)
	return user
}
