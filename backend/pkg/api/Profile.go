package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/twinj/uuid"
)

func (S *Server) ProfileHandler(w http.ResponseWriter, r *http.Request) {
	url := strings.TrimPrefix(r.URL.Path, "/api/profile/")

	if url == "" {
		http.Error(w, "url required", http.StatusBadRequest)
		return
	}

	followers, err := S.GetFollowersCount(url)
	if err != nil {
		http.Error(w, "error getting followers", http.StatusInternalServerError)
		return
	}

	following, err := S.GetFollowingCount(url)
	if err != nil {
		http.Error(w, "error getting following", http.StatusInternalServerError)
		return
	}
	user, err := S.GetUserData(url, 0)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	userID, err := strconv.Atoi(user.ID)
	if err != nil {
		http.Error(w, "error converting user ID", http.StatusInternalServerError)
		return
	}
	posts, err := S.GetUserPosts(userID, r)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "error getting posts", http.StatusInternalServerError)
		return
	}

	var isFollowing bool
	isFollowing, err = S.IsFollowing(r, user.Url, "")
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Failed to check following status", http.StatusInternalServerError)
		return
	}

	var IsFollower bool
	IsFollower, err = S.IsFollower(r, user.Url, "")
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Failed to check follower status", http.StatusInternalServerError)
		return
	}

	if !isFollowing && user.IsPrivate {
		user.FollowRequestStatus, err = S.GetFollowRequestStatus(r, user.Url)
		if err != nil {
			if err.Error() == "sql: no rows in result set" {
				user.FollowRequestStatus = "none"
			} else {
				fmt.Println(err)
				http.Error(w, "Failed to get follow request status", http.StatusInternalServerError)
				return
			}
		}
	}

	resp := map[string]interface{}{
		"posts":       posts,
		"user":        user,
		"followers":   followers,
		"following":   following,
		"isfollowing": isFollowing,
		"isfollower":  IsFollower,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
func (S *Server) UploadAvatarHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("called AvatarHandeler")
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		http.Error(w, "Cannot read avatar", http.StatusBadRequest)
		return
	}
	defer file.Close()
	avatarPath := "uploads/Avatars/" + uuid.NewV4().String() + tools.GetTheExtension(header.Filename)

	out, err := os.Create(avatarPath)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Cannot save avatar", http.StatusInternalServerError)
		return
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		http.Error(w, "Failed to save avatar", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprintf(`{"avatarUrl": "/%s"}`, avatarPath)))
}
func (S *Server) UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var user UserData
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	id, _ := strconv.Atoi(user.ID)
	err := S.RemoveOldAvatar(id, *user.Avatar)
	if err != nil {
		http.Error(w, "Failed to remove old avatar", http.StatusInternalServerError)
		return
	}

	if user.Nickname != nil {
		user.Url = *user.Nickname
	}
	_, err = S.db.ExecContext(r.Context(), `
        UPDATE users
        SET first_name = ?, last_name = ?, nickname = ?, email = ?, birthdate = ?, avatar = ?, about_me = ?, is_private = ?, url = ?
		WHERE id = ?
	`, user.FirstName, user.LastName, user.Nickname, user.Email, user.DateOfBirth, user.Avatar, user.AboutMe, user.IsPrivate, user.Url, user.ID,
	)
	if err != nil {
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
	})
}
func (S *Server) UserFound(user User, cnx context.Context) (error, bool) {
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

	err := S.db.QueryRowContext(cnx, query, args...).Scan(&exists)
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
