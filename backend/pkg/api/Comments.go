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
	banned, currentUserID := S.ActionMiddleware(r, http.MethodPost, true, false)
	if banned {
		tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
		return
	}

	var commnet CommentRequest

	err := json.NewDecoder(r.Body).Decode(&commnet)
	if err != nil {
		fmt.Println("decode error : ", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(commnet.Content) == "" {
		http.Error(w, "Content cannot be empty", http.StatusBadRequest)
		return
	}

	

	// type 'text', 'emoji', 'image', 'gif'
	
	

	commentID, err := S.CreateComment(currentUserID, commnet)
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

func (S *Server) CreateComment(userID int, comment CommentRequest) (int, error) {
	sqlRes, err := S.db.Exec("INSERT INTO comments (user_id, content, post_id, type) VALUES (?, ?, ?, ?)", userID, comment.Content, comment.PostID, comment.Type)
	if err != nil {
		return 0, err
	}
	lastID, _ := sqlRes.LastInsertId()
	return int(lastID), nil
}

func (S *Server) GetComments(postID int, r *http.Request) ([]Comment, error) {
	rows, err := S.db.Query(`
		SELECT 
			c.id, c.content, c.created_at,
			u.first_name || ' ' || u.last_name AS name, 
			u.nickname, u.avatar
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC
	`, postID)
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
	row := S.db.QueryRow(`
		SELECT 
			c.id, c.content, c.created_at,
			u.first_name || ' ' || u.last_name AS name, 
			u.nickname, u.avatar
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.id = ?
	`, commentID)

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
