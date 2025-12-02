package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"strings"
)

func (S *Server) CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	banned, currentUserID := S.ActionMiddleware(r, http.MethodPost, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusForbidden)
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

	authorized, err := S.CheckPostPrivacy(commnet.PostID, 0, currentUserID, "")
	if err != nil {
		http.Error(w, "Failed to validate post privacy", http.StatusInternalServerError)
		return
	}
	if !authorized {
		http.Error(w, "Unauthorized to comment on this post", http.StatusUnauthorized)
		return
	}

	if commnet.Type != "text" && tools.ContainsHTML(commnet.Content) {
		S.ActionMiddleware(r, http.MethodPost, true, true)
		tools.SendJSONError(w, "Unauthorized", http.StatusForbidden)
		return
	} else if commnet.Type == "text" && tools.ContainsHTML(commnet.Content) {
		commnet.Content = html.EscapeString(commnet.Content)
	}

	commentID, err := S.CreateComment(currentUserID, commnet)
	if err != nil {
		http.Error(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	comment, err := S.GetCommentByID(commentID)
	if err != nil {
		http.Error(w, "Failed to get comment", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(comment)
}

func (S *Server) GetCommentsHandler(w http.ResponseWriter, r *http.Request) {
	banned, currentUserID := S.ActionMiddleware(r, http.MethodGet, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusForbidden)
		return
	}
	ID := strings.TrimPrefix(r.URL.Path, "/api/get-comments/")

	checkifnumber, postID := tools.IsNumeric(ID)
	if !checkifnumber {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	authorized, err := S.CheckPostPrivacy((postID), 0, currentUserID, "")
	if err != nil {
		http.Error(w, "Failed to validate post privacy", http.StatusInternalServerError)
		return
	}
	if !authorized {
		http.Error(w, "Unauthorized to view comments on this post", http.StatusUnauthorized)
		return
	}

	comments, err := S.GetComments((postID))
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

func (S *Server) GetComments(postID int) ([]Comment, error) {
	rows, err := S.db.Query(`
		SELECT 
			c.id, c.content, c.created_at, c.type,
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
			&comment.Type,
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

func (S *Server) GetCommentByID(commentID int) (Comment, error) {
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
