package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/twinj/uuid"
)

func (S *Server) UploadPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	file, header, err := r.FormFile("post")
	if err != nil {
		http.Error(w, "Cannot read post", http.StatusBadRequest)
		return
	}
	defer file.Close()
	postPath := "uploads/Posts/" + uuid.NewV4().String() + tools.GetTheExtension(header.Filename)

	out, err := os.Create(postPath)
	if err != nil {
		fmt.Println("Error creating file:", err)
		http.Error(w, "Cannot save post", http.StatusInternalServerError)
		return
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		http.Error(w, "Failed to save post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprintf(`{"postUrl": "/%s"}`, postPath)))
}

func (S *Server) CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized - No session", http.StatusUnauthorized)
		return
	}

	var post Post
	err = json.NewDecoder(r.Body).Decode(&post)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(post.Content) == "" && post.Image == nil {
		http.Error(w, "Content cannot be empty", http.StatusBadRequest)
		return
	}

	// Insert into database
	res, err := S.db.Exec(`
        INSERT INTO posts (user_id, content, image, privacy)
        VALUES (?, ?, ?, ?)`,
		userID, html.EscapeString(post.Content), post.Image, post.Privacy,
	)

	if err != nil {
		fmt.Println("Error inserting post:", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	lastID, _ := res.LastInsertId()
	post.ID = int(lastID)
	post.UserID = userID
	post.CreatedAt = time.Now().Format(time.RFC3339)

	if post.Privacy == "private" {
		for _, followerID := range post.SelectedFollowers {
			_, err = S.db.Exec(`
				INSERT INTO posts_private (post_id, user_id)
				VALUES (?, ?)`,
				post.ID, followerID,
			)
			if err != nil {
				fmt.Println("Error inserting follower:", err)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				return
			}
		}
	}

	Post, err := S.GetPostFromID(post.ID, userID)
	if err != nil {
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	S.PushNewPost(userID, map[string]interface{}{
		"post": Post,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(Post)
}

func (S *Server) GetUserPosts(userID int, currentUserID int) ([]Post, error) {
	rows, err := S.db.Query(`
	SELECT 
		p.id, p.content, p.image, p.created_at, p.privacy,
		u.id, u.first_name, u.last_name, u.nickname, u.avatar, u.is_private, u.url,
		(SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
	FROM posts p
	JOIN users u ON p.user_id = u.id
	WHERE p.user_id = ? AND p.group_id IS NULL
	ORDER BY p.created_at DESC
`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var post Post
		var authorID int
		var firstName, lastName, nickname, avatar, url sql.NullString
		var isPrivate, isFollowing bool
		if err := rows.Scan(
			&post.ID, &post.Content, &post.Image, &post.CreatedAt, &post.Privacy,
			&authorID, &firstName, &lastName, &nickname, &avatar, &isPrivate, &url, &post.Comments,
		); err != nil {
			return nil, err
		}
		if post.Privacy == "almost-private" && authorID != currentUserID {
			isFollowing, err = S.IsFollowing(currentUserID, "", strconv.Itoa(authorID))
			if err != nil {
				return nil, err
			}
			if !isFollowing {
				continue
			}
		} else if post.Privacy == "private" {
			UserAllowed, err := S.UserAllowedToSeePost(currentUserID, post.ID)
			if err != nil {
				return nil, err
			}
			if authorID != currentUserID && !UserAllowed {
				continue
			}
		}

		post.Author = Author{
			Name:      firstName.String + " " + lastName.String,
			Username:  nickname.String,
			Avatar:    avatar.String,
			IsPrivate: isPrivate,
			Url:       url.String,
		}
		post.UserID = userID
		posts = append(posts, post)
	}

	return posts, nil
}

func (S *Server) GetUserIdFromPostID(postID int) (int, error) {
	var userID int
	err := S.db.QueryRow("SELECT user_id FROM posts WHERE id = ?", postID).Scan(&userID)
	if err != nil {
		return 0, err
	}
	return userID, nil
}

func (S *Server) GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	var allPosts []Post
	ids, err := S.GetAllUsers()
	if err != nil {
		fmt.Println("GetPostsHandler GetAllUsers error : ", err)
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	for _, userID := range ids {
		posts, err := S.GetUserPosts(userID, userID)
		if err != nil {
			fmt.Println(err)
			http.Error(w, "DB Error", http.StatusInternalServerError)
			return
		}
		allPosts = append(allPosts, posts...)

	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"posts": allPosts,
		"user": map[string]interface{}{
			"userID": userID,
		},
	})
}

func (S *Server) UserAllowedToSeePost(userID int, postID int) (bool, error) {
	query := "SELECT id FROM posts_private WHERE post_id = ? AND user_id = ?"

	var id int
	err := S.db.QueryRow(query, postID, userID).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}

		return false, err
	}
	return true, nil
}

func (S *Server) GetPostFromID(postID int, currentUserID int) (Post, error) {
	row := S.db.QueryRow(`
	SELECT 
		p.id, p.content, p.image, p.created_at, p.privacy, p.group_id,
		u.id, u.first_name, u.last_name, u.nickname, u.avatar, u.is_private,
		(SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.parent_comment_id IS NULL) as comment_count,
	FROM posts p
	JOIN users u ON p.user_id = u.id
	WHERE p.id = ?
`, currentUserID, postID)

	var post Post
	var authorID int
	var firstName, lastName, nickname, avatar sql.NullString
	var isPrivate bool
	var groupID sql.NullInt64

	err := row.Scan(
		&post.ID, &post.Content, &post.Image, &post.CreatedAt, &post.Privacy, &groupID,
		&authorID, &firstName, &lastName, &nickname, &avatar, &isPrivate,
		&post.Comments,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return Post{}, nil // post not found
		}
		return Post{}, err
	}

	if groupID.Valid {
		post.GroupID = int(groupID.Int64)
	}

	// privacy check
	if post.Privacy == "almost-private" && authorID != currentUserID {
		isFollowing, err := S.IsFollowing(currentUserID, "", strconv.Itoa(authorID))
		if err != nil {
			return Post{}, err
		}
		if !isFollowing {
			return Post{}, nil
		}
	} else if post.Privacy == "private" {
		UserAllowed, err := S.UserAllowedToSeePost(currentUserID, post.ID)
		if err != nil {
			return Post{}, err
		}
		if authorID != currentUserID && !UserAllowed {
			return Post{}, nil
		}
	}

	// convert NullString
	post.Author = Author{
		Name:      firstName.String + " " + lastName.String,
		Username:  nickname.String,
		Avatar:    avatar.String,
		IsPrivate: isPrivate,
	}
	post.UserID = authorID
	post.Comments = 0

	return post, nil

}
