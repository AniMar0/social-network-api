package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/twinj/uuid"
)

func (S *Server) UploadFileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		tools.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// limit size to 5MB
	const maxUploadSize = 5 << 20
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	// type decides: avatar / post / message / comment / avatar-change
	uploadType := r.FormValue("type")
	if uploadType == "" {
		tools.SendJSONError(w, "Missing upload type", http.StatusBadRequest)
		return
	}

	if uploadType != "avatar" {
		_, _, err := S.CheckSession(r)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
	}

	// all forms will send the file in same key
	file, _, err := r.FormFile("file")
	if err != nil {
		tools.SendJSONError(w, "Cannot read file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// detect MIME
	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	if n == 0 {
		tools.SendJSONError(w, "Empty file", http.StatusBadRequest)
		return
	}

	contentType := http.DetectContentType(buf[:n])
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

	// decide folder based on upload type
	var folder string
	switch uploadType {
	case "avatar":
		folder = "uploads/Avatars/"
	case "post":
		folder = "uploads/Posts/"
	case "message":
		folder = "uploads/Messages/"
	case "comment":
		folder = "uploads/Comments/"
	default:
		tools.SendJSONError(w, "Unknown upload type", http.StatusBadRequest)
		return
	}

	// unify name creation
	filePath := folder + uuid.NewV4().String() + ext

	// merge buffered+rest
	reader := io.MultiReader(bytes.NewReader(buf[:n]), file)

	out, err := os.Create(filePath)
	if err != nil {
		fmt.Println("Error creating file:", err)
		tools.SendJSONError(w, "Cannot save file", http.StatusInternalServerError)
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, reader); err != nil {
		tools.SendJSONError(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	// return JSON name depending on upload type
	respKey := map[string]string{
		"avatar":  "avatarUrl",
		"post":    "postUrl",
		"message": "messageImageUrl",
		"comment": "commentImageUrl",
	}[uploadType]

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprintf(`{"%s": "/%s"}`, respKey, filePath)))
}

func (S *Server) ProtectedFileHandler(w http.ResponseWriter, r *http.Request) {
	banned, userID := S.ActionMiddleware(r, http.MethodGet, true, false)
	if banned {
		tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
		return
	}

	// api/file?filetype=...&path=uploads/...

	filetype := r.URL.Query().Get("filetype")
	if filetype == "" {
		tools.SendJSONError(w, "Missing file type", http.StatusBadRequest)
		return
	}

	filePath := r.URL.Query().Get("path")
	if filePath == "" {
		tools.SendJSONError(w, "Missing file path", http.StatusBadRequest)
		return
	}
	if strings.Contains(filePath, "..") {
		tools.SendJSONError(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if !strings.HasPrefix(filePath, "uploads/") {
		tools.SendJSONError(w, "Invalid path", http.StatusBadRequest)
		return
	}

	authorized, err := S.IsFileAccessAuthorized(userID, filetype, filePath)
	if err != nil {
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if !authorized {
		tools.SendJSONError(w, "Unauthorized access to file", http.StatusUnauthorized)
		return
	}

	http.ServeFile(w, r, filePath)
}

func (S *Server) IsFileAccessAuthorized(userID int, filetype, filePath string) (bool, error) {
	switch filetype {
	case "avatar":
		return S.isAvatarFileAccessible(userID, filePath)
	case "message":
		return S.isMessageFileAccessible(userID, filePath)
	case "post":
		return S.isPostFileAccessible(userID, filePath)
	case "comment":
		return S.isCommentFileAccessible(userID, filePath)
	default:
		return false, fmt.Errorf("unknown file type")
	}
}

func (S *Server) isAvatarFileAccessible(userID int, filePath string) (bool, error) {
	var avatarPath string
	err := S.db.QueryRow("SELECT avatar FROM users WHERE id = ?", userID).Scan(&avatarPath)
	if err != nil {
		return false, err
	}
	return avatarPath == filePath, nil
}

func (S *Server) isMessageFileAccessible(userID int, filePath string) (bool, error) {
	var count int
	err := S.db.QueryRow(`
		SELECT COUNT(*) FROM messages
		WHERE image = ? AND (sender_id = ? OR receiver_id = ?)
	`, filePath, userID, userID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (S *Server) isPostFileAccessible(userID int, filePath string) (bool, error) {
	var AuthorID, PostID int
	var privacy string
	err := S.db.QueryRow(`	
		SELECT user_id, id, privacy FROM posts
		WHERE image = ?
	`, filePath).Scan(&AuthorID, &PostID, &privacy)
	if err != nil {
		return false, err
	}

	if AuthorID == userID {
		return true, nil
	}

	return S.CheckPostPrivacy(PostID, AuthorID, userID, privacy)
}

func (S *Server) isCommentFileAccessible(userID int, filePath string) (bool, error) {
	var AuthorPostID, AuthorCommentID, PostID int
	var privacy string
	err := S.db.QueryRow(`	
        SELECT 
			p.id, p.privacy, p.user_id, c.user_id
		FROM comments c
		JOIN posts p ON c.post_id = p.id
		JOIN users u ON c.user_id = u.id
        WHERE image = ?
    `, filePath).Scan(&PostID, &privacy, &AuthorPostID, &AuthorCommentID)
	if err != nil {
		return false, err
	}
	if AuthorCommentID == userID {
		return true, nil
	}
	return S.CheckPostPrivacy(PostID, AuthorPostID, userID, privacy)
}

func (S *Server) CheckPostPrivacy(postID, AuthorID, currentUserID int, privacy string) (bool, error) {
	if AuthorID == 0 {
		err := S.db.QueryRow(`SELECT user_id FROM posts WHERE id = ?`, postID).Scan(&AuthorID)
		if err != nil {
			return false, err
		}
	}

	if AuthorID == currentUserID {
		return true, nil
	}

	if privacy == "" {
		err := S.db.QueryRow(`SELECT privacy FROM posts WHERE id = ?`, postID).Scan(&privacy)
		if err != nil {
			return false, err
		}
	}

	switch privacy {
	case "public":
		return true, nil
	case "almost-private":
		isFollowing, err := S.IsFollowing(currentUserID, "", AuthorID)
		if err != nil {
			return false, err
		}
		if !isFollowing {
			return false, nil
		}
	case "private":
		UserAllowed, err := S.UserAllowedToSeePost(currentUserID, postID)
		if err != nil {
			return false, err
		}
		if AuthorID != currentUserID && !UserAllowed {
			return false, nil
		}
	}
	return AuthorID == currentUserID, nil
}
