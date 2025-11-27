package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

func (S *Server) CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	currentUserID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var body struct {
		Content         string  `json:"content"`
		ParentCommentId *string `json:"parentCommentId,omitempty"`
		PostID          int     `json:"postId"`
	}

	err = json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		fmt.Println("decode error : ", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	commentID, err := S.CreateComment(currentUserID, body.Content, body.PostID, body.ParentCommentId)
	if err != nil {
		http.Error(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	fmt.Println(commentID)

	comment, err := S.GetCommentByID(commentID, r)
	if err != nil {
		http.Error(w, "Failed to get comment", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(comment)
}

func (S *Server) GetCommentsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	postID := strings.TrimPrefix(r.URL.Path, "/api/get-comments/")

	comments, err := S.GetComments(tools.StringToInt(postID), r)
	if err != nil {
		http.Error(w, "Failed to get comments", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(comments)
}

func (S *Server) CreateComment(userID int, content string, postID int, parentCommentID *string) (int, error) {
	sqlRes, err := S.db.Exec("INSERT INTO comments (user_id, content, post_id, parent_comment_id) VALUES (?, ?, ?, ?)", userID, content, postID, parentCommentID)
	if err != nil {
		return 0, err
	}
	lastID, _ := sqlRes.LastInsertId()
	return int(lastID), nil
}

func (S *Server) GetComments(postID int, r *http.Request) ([]Comment, error) {
	currentUserID, _, _ := S.CheckSession(r)

	rows, err := S.db.Query(`
		SELECT 
			c.id, c.content, c.created_at, c.parent_comment_id,c.likes as like_count,
			u.first_name || ' ' || u.last_name AS name, 
			u.nickname, u.avatar,
			EXISTS(SELECT 1 FROM likes l WHERE l.comment_id = c.id AND l.user_id = ?) as is_liked
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC
	`, currentUserID, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var allComments []Comment

	for rows.Next() {
		var comment Comment
		var authorName, authorUsername, authorAvatar sql.NullString

		if err := rows.Scan(
			&comment.ID,
			&comment.Content,
			&comment.CreatedAt,
			&authorName,
			&authorUsername,
			&authorAvatar,
		); err != nil {
			return nil, err
		}
		
		// author
		comment.Author.Name = authorName.String
		comment.Author.Username = authorUsername.String
		comment.Author.Avatar = authorAvatar.String
		
		allComments = append(allComments, comment)
		

	}

	return allComments, nil
}

func (S *Server) GetCommentByID(commentID int, r *http.Request) (Comment, error) {
	currentUserID, _, _ := S.CheckSession(r)

	row := S.db.QueryRow(`
		SELECT 
			c.id, c.content, c.created_at, c.parent_comment_id,c.likes as like_count,
			u.first_name || ' ' || u.last_name AS name, 
			u.nickname, u.avatar,
			EXISTS(SELECT 1 FROM likes l WHERE l.comment_id = c.id AND l.user_id = ?) as is_liked
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.id = ?
	`, currentUserID, commentID)

	var comment Comment
	var authorName, authorUsername, authorAvatar sql.NullString

	err := row.Scan(
		&comment.ID,
		&comment.Content,
		&comment.CreatedAt,
		&authorName,
		&authorUsername,
		&authorAvatar,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return Comment{}, nil // comment not found
		}
		fmt.Println("get one comment error : ", err)
		return Comment{}, err
	}
	
	// author
	comment.Author.Name = authorName.String
	comment.Author.Username = authorUsername.String
	comment.Author.Avatar = authorAvatar.String

	return comment, nil
}

func (S *Server) GetCommentAuthorID(commentID int) (int, error) {
	var userID int
	err := S.db.QueryRow("SELECT user_id FROM comments WHERE id = ?", commentID).Scan(&userID)
	if err != nil {
		return 0, err
	}
	return userID, nil
}
