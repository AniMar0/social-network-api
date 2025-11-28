package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/twinj/uuid"
)

func (S *Server) ProfileHandler(w http.ResponseWriter, r *http.Request) {
	banned, currentUser := S.ActionMiddleware(r, http.MethodGet, true, false)
	if banned {
		tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
		return
	}
	url := strings.TrimPrefix(r.URL.Path, "/api/profile/")
	if url == "" {
		tools.SendJSONError(w, "url required", http.StatusBadRequest)
		return
	}

	targetedUserID, err := S.GetUserIdFromUrl(url)
	if err != nil {
		tools.SendJSONError(w, "user not found", http.StatusNotFound)
		return
	}

	if targetedUserID == currentUser {
		http.Redirect(w, r, "/api/me", http.StatusSeeOther)
		return
	}

	user, err := S.GetUserData("", targetedUserID)
	if err != nil {
		tools.SendJSONError(w, "user not found", http.StatusNotFound)
		return
	}

	posts, err := S.GetUserPosts(targetedUserID, currentUser)
	if err != nil {
		fmt.Println(err)
		tools.SendJSONError(w, "error getting posts", http.StatusInternalServerError)
		return
	}

	isFollowing, err := S.IsFollowing(currentUser, user.Url, strconv.Itoa(targetedUserID))
	if err != nil {
		fmt.Println("Failed to check following status:", err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	IsFollower, err := S.IsFollower(currentUser, user.Url, strconv.Itoa(targetedUserID))
	if err != nil {
		fmt.Println("Failed to check follower status:", err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if !isFollowing && user.IsPrivate {
		user.FollowRequestStatus, err = S.GetFollowRequestStatus(r, user.Url)
		if err != nil {
			if err.Error() == "sql: no rows in result set" {
				user.FollowRequestStatus = "none"
			} else {
				fmt.Println("Failed to get follow request status:", err)
				tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
				return
			}
		}
	}

	if IsFollower && !isFollowing && user.IsPrivate {
		user.FollowRequestStatus = "follow-back"
	}

	user.ID = ""

	resp := map[string]interface{}{
		"posts":       posts,
		"user":        user,
		"followers":   user.FollowersCount,
		"following":   user.FollowingCount,
		"isfollowing": isFollowing,
		"isfollower":  IsFollower,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
func (S *Server) UploadAvatarHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		tools.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// limit size to 5MB
	const maxUploadSize = 5 << 20 // 5 MB
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	file, _, err := r.FormFile("avatar")
	if err != nil {
		tools.SendJSONError(w, "Cannot read avatar", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read first 512 bytes to detect content type
	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	if n == 0 {
		tools.SendJSONError(w, "Empty file", http.StatusBadRequest)
		return
	}
	contentType := http.DetectContentType(buf[:n])

	// allowed MIME types
	allowed := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/gif":  ".gif",
		"image/webp": ".webp",
	}

	ext, ok := allowed[contentType]
	if !ok {
		tools.SendJSONError(w, "Unsupported file type", http.StatusUnsupportedMediaType)
		return
	}

	// create a reader that starts with the bytes we've already read
	reader := io.MultiReader(bytes.NewReader(buf[:n]), file)

	avatarPath := "uploads/Avatars/" + uuid.NewV4().String() + ext

	out, err := os.Create(avatarPath)
	if err != nil {
		fmt.Println(err)
		tools.SendJSONError(w, "Cannot save avatar", http.StatusInternalServerError)
		return
	}
	defer out.Close()

	// copy the full content (including the 512 bytes we buffered)
	if _, err := io.Copy(out, reader); err != nil {
		tools.SendJSONError(w, "Failed to save avatar", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprintf(`{"avatarUrl": "/%s"}`, avatarPath)))
}

func (S *Server) UpdateUserHandler(w http.ResponseWriter, r *http.Request) {
	banned, _ := S.ActionMiddleware(r, http.MethodPut, true, false)
	if banned {
		tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
		return
	}

	var user UserData
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		tools.SendJSONError(w, "Bad Request", http.StatusBadRequest)
		return
	}

	id, _ := strconv.Atoi(user.ID)
	err := S.RemoveOldAvatar(id, user.Avatar)
	if err != nil {
		tools.SendJSONError(w, "Failed to remove old avatar", http.StatusInternalServerError)
		return
	}

	if user.Nickname != "" {
		user.Url = user.Nickname
	}
	_, err = S.db.ExecContext(r.Context(), `
        UPDATE users
        SET first_name = ?, last_name = ?, nickname = ?, email = ?, birthdate = ?, avatar = ?, about_me = ?, is_private = ?, url = ?
		WHERE id = ?
	`, html.EscapeString(user.FirstName), html.EscapeString(user.LastName), html.EscapeString(user.Nickname), html.EscapeString(user.Email), html.EscapeString(user.DateOfBirth), user.Avatar, html.EscapeString(user.AboutMe), user.IsPrivate, html.EscapeString(user.Url), user.ID,
	)
	if err != nil {
		tools.SendJSONError(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
	})
}
func (S *Server) UserFound(user User) (error, bool) {
	user = refactorUserData(user)
	var exists int
	var query string
	var args []interface{}

	if user.Nickname != "" {
		// Check both email and nickname if nickname is provided
		query = "SELECT COUNT(*) FROM users WHERE email = ? OR nickname = ?"
		args = []interface{}{user.Email, user.Nickname}
	} else {
		// Only check email if nickname is empty (we allow multiple NULL nicknames)
		query = "SELECT COUNT(*) FROM users WHERE email = ?"
		args = []interface{}{user.Email}
	}

	err := S.db.QueryRow(query, args...).Scan(&exists)
	if err != nil {
		return err, false
	}
	if exists > 0 {
		return nil, true
	}
	return nil, false
}

func (S *Server) RemoveOldAvatar(userID int, newAvatar string) error {
	// Get the avatar filename from the database
	var oldAvatar string
	err := S.db.QueryRow(`SELECT avatar FROM users WHERE id = ?`, userID).Scan(&oldAvatar)
	if err != nil {
		return err
	}

	if oldAvatar == "/uploads/default.jpg" || oldAvatar == newAvatar {
		return nil
	}
	// Remove the avatar file from uploads folder if it exists and is not empty
	if oldAvatar != "" {
		avatarPath := fmt.Sprintf(".%s", oldAvatar)
		if err := os.Remove(avatarPath); err != nil && !os.IsNotExist(err) {
			return err
		}
	}

	return nil
}

func (S *Server) GetUserIdFromUrl(url string) (int, error) {
	var userID int
	err := S.db.QueryRow(`SELECT id FROM users WHERE url = ?`, url).Scan(&userID)
	if err != nil {
		return 0, err
	}
	return userID, nil
}
