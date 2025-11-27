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
)

// CreateGroupHandler creates a new group
func (S *Server) CreateGroupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var group Group
	if err := json.NewDecoder(r.Body).Decode(&group); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(group.Title) == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	// Insert group
	res, err := S.db.Exec("INSERT INTO groups (creator_id, title, description) VALUES (?, ?, ?)", userID, html.EscapeString(group.Title), html.EscapeString(group.Description))
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	groupID, _ := res.LastInsertId()

	// Add creator as member
	_, err = S.db.Exec("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", groupID, userID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	group.ID = int(groupID)
	group.CreatorID = userID
	group.CreatedAt = time.Now().Format(time.RFC3339)
	group.IsMember = true
	group.IsCreator = true

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(group)
}

// GetGroupsHandler returns all groups
func (S *Server) GetGroupsHandler(w http.ResponseWriter, r *http.Request) {
	userID, _, _ := S.CheckSession(r) // Optional: check if user is logged in to show membership status

	rows, err := S.db.Query("SELECT id, creator_id, title, description, created_at FROM groups ORDER BY created_at DESC")
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var groups []Group
	for rows.Next() {
		var g Group
		if err := rows.Scan(&g.ID, &g.CreatorID, &g.Title, &g.Description, &g.CreatedAt); err != nil {
			continue
		}
		if userID != 0 {
			var count int
			S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", g.ID, userID).Scan(&count)
			g.IsMember = count > 0
			g.IsCreator = g.CreatorID == userID
		}
		groups = append(groups, g)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}

// GetGroupHandler returns a specific group
func (S *Server) GetGroupHandler(w http.ResponseWriter, r *http.Request) {
	groupIDStr := r.URL.Path[len("/api/groups/"):]
	groupID := tools.StringToInt(groupIDStr)

	userID, _, _ := S.CheckSession(r)

	var g Group
	err := S.db.QueryRow("SELECT id, creator_id, title, description, created_at FROM groups WHERE id = ?", groupID).Scan(&g.ID, &g.CreatorID, &g.Title, &g.Description, &g.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Group not found", http.StatusNotFound)
		} else {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		return
	}

	if userID != 0 {
		var count int
		S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", g.ID, userID).Scan(&count)
		g.IsMember = count > 0
		g.IsCreator = g.CreatorID == userID
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(g)
}

// UpdateGroupHandler updates a group (Owner only)
func (S *Server) UpdateGroupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var group Group
	if err := json.NewDecoder(r.Body).Decode(&group); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	// Check ownership
	var creatorID int
	err = S.db.QueryRow("SELECT creator_id FROM groups WHERE id = ?", group.ID).Scan(&creatorID)
	if err != nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	if creatorID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	_, err = S.db.Exec("UPDATE groups SET title = ?, description = ? WHERE id = ?", html.EscapeString(group.Title), html.EscapeString(group.Description), group.ID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteGroupHandler deletes a group (Owner only)
func (S *Server) DeleteGroupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	groupIDStr := r.URL.Path[len("/api/groups/delete/"):]
	groupID := tools.StringToInt(groupIDStr)

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Check ownership
	var creatorID int
	err = S.db.QueryRow("SELECT creator_id FROM groups WHERE id = ?", groupID).Scan(&creatorID)
	if err != nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	if creatorID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	_, err = S.db.Exec("DELETE FROM groups WHERE id = ?", groupID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// JoinGroupRequestHandler handles join requests
func (S *Server) JoinGroupRequestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		GroupID int `json:"groupId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	// Check if already member
	var count int
	S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", req.GroupID, userID).Scan(&count)
	if count > 0 {
		http.Error(w, "Already a member", http.StatusBadRequest)
		return
	}

	// Check if already requested
	S.db.QueryRow("SELECT COUNT(*) FROM group_requests WHERE group_id = ? AND user_id = ? AND type = 'request' AND status = 'pending'", req.GroupID, userID).Scan(&count)
	if count > 0 {
		http.Error(w, "Request already pending", http.StatusBadRequest)
		return
	}

	_, err = S.db.Exec("INSERT INTO group_requests (group_id, user_id, requester_id, type, status) VALUES (?, ?, ?, 'request', 'pending')", req.GroupID, userID, userID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// InviteGroupMemberHandler handles invitations
func (S *Server) InviteGroupMemberHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		GroupID int `json:"groupId"`
		UserID  int `json:"userId"` // User to invite
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	// Check if requester is member
	var count int
	S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", req.GroupID, userID).Scan(&count)
	if count == 0 {
		http.Error(w, "Not a member", http.StatusForbidden)
		return
	}

	// Check if invited user is already member
	S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", req.GroupID, req.UserID).Scan(&count)
	if count > 0 {
		http.Error(w, "User already a member", http.StatusBadRequest)
		return
	}

	// Check if already invited
	S.db.QueryRow("SELECT COUNT(*) FROM group_requests WHERE group_id = ? AND user_id = ? AND type = 'invite' AND status = 'pending'", req.GroupID, req.UserID).Scan(&count)
	if count > 0 {
		http.Error(w, "Invitation already pending", http.StatusBadRequest)
		return
	}

	_, err = S.db.Exec("INSERT INTO group_requests (group_id, user_id, requester_id, type, status) VALUES (?, ?, ?, 'invite', 'pending')", req.GroupID, req.UserID, userID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// AcceptGroupRequestHandler accepts a request or invite
func (S *Server) AcceptGroupRequestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	requestIDStr := r.URL.Path[len("/api/groups/requests/accept/"):]
	requestID := tools.StringToInt(requestIDStr)

	var req GroupRequest
	err = S.db.QueryRow("SELECT id, group_id, user_id, requester_id, type, status FROM group_requests WHERE id = ?", requestID).Scan(&req.ID, &req.GroupID, &req.UserID, &req.RequesterID, &req.Type, &req.Status)
	if err != nil {
		http.Error(w, "Request not found", http.StatusNotFound)
		return
	}

	if req.Status != "pending" {
		http.Error(w, "Request not pending", http.StatusBadRequest)
		return
	}

	if req.Type == "invite" {
		// User accepting invite
		if req.UserID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
	} else if req.Type == "request" {
		// Creator accepting join request
		var creatorID int
		S.db.QueryRow("SELECT creator_id FROM groups WHERE id = ?", req.GroupID).Scan(&creatorID)
		if creatorID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
	}

	// Add to members
	_, err = S.db.Exec("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", req.GroupID, req.UserID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Update request status
	_, err = S.db.Exec("UPDATE group_requests SET status = 'accepted' WHERE id = ?", req.ID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeclineGroupRequestHandler declines a request or invite
func (S *Server) DeclineGroupRequestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	requestIDStr := r.URL.Path[len("/api/groups/requests/decline/"):]
	requestID := tools.StringToInt(requestIDStr)

	var req GroupRequest
	err = S.db.QueryRow("SELECT id, group_id, user_id, requester_id, type, status FROM group_requests WHERE id = ?", requestID).Scan(&req.ID, &req.GroupID, &req.UserID, &req.RequesterID, &req.Type, &req.Status)
	if err != nil {
		http.Error(w, "Request not found", http.StatusNotFound)
		return
	}

	if req.Status != "pending" {
		http.Error(w, "Request not pending", http.StatusBadRequest)
		return
	}

	if req.Type == "invite" {
		// User declining invite
		if req.UserID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
	} else if req.Type == "request" {
		// Creator declining join request
		var creatorID int
		S.db.QueryRow("SELECT creator_id FROM groups WHERE id = ?", req.GroupID).Scan(&creatorID)
		if creatorID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
	}

	// Update request status
	_, err = S.db.Exec("UPDATE group_requests SET status = 'rejected' WHERE id = ?", req.ID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// GetGroupRequestsHandler returns pending requests for a group (for creator) or invites for a user
func (S *Server) GetGroupRequestsHandler(w http.ResponseWriter, r *http.Request) {
	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupIDStr := r.URL.Query().Get("groupId")
	var rows *sql.Rows

	if groupIDStr != "" {
		// Get requests for a specific group (Creator only)
		groupID := tools.StringToInt(groupIDStr)
		var creatorID int
		S.db.QueryRow("SELECT creator_id FROM groups WHERE id = ?", groupID).Scan(&creatorID)
		if creatorID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		rows, err = S.db.Query(`
			SELECT r.id, r.group_id, r.user_id, r.requester_id, r.type, r.status, r.created_at,
			       u.first_name, u.last_name, u.nickname, u.avatar
			FROM group_requests r
			JOIN users u ON r.user_id = u.id
			WHERE r.group_id = ? AND r.type = 'request' AND r.status = 'pending'`, groupID)
	} else {
		// Get invites for the user
		rows, err = S.db.Query(`
			SELECT r.id, r.group_id, r.user_id, r.requester_id, r.type, r.status, r.created_at,
			       g.title, g.description
			FROM group_requests r
			JOIN groups g ON r.group_id = g.id
			WHERE r.user_id = ? AND r.type = 'invite' AND r.status = 'pending'`, userID)
	}

	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var requests []map[string]interface{}
	for rows.Next() {
		var r GroupRequest
		var extra1, extra2, extra3, extra4 sql.NullString
		if groupIDStr != "" {
			rows.Scan(&r.ID, &r.GroupID, &r.UserID, &r.RequesterID, &r.Type, &r.Status, &r.CreatedAt, &extra1, &extra2, &extra3, &extra4)
			r.User = User{FirstName: extra1.String, LastName: extra2.String, Nickname: extra3.String, AvatarUrl: extra4.String}
		} else {
			rows.Scan(&r.ID, &r.GroupID, &r.UserID, &r.RequesterID, &r.Type, &r.Status, &r.CreatedAt, &extra1, &extra2)
			r.Group = Group{ID: r.GroupID, Title: extra1.String, Description: extra2.String}
		}

		// Map to a generic structure or use GroupRequest with nested objects
		reqMap := map[string]interface{}{
			"id":          r.ID,
			"groupId":     r.GroupID,
			"userId":      r.UserID,
			"requesterId": r.RequesterID,
			"type":        r.Type,
			"status":      r.Status,
			"createdAt":   r.CreatedAt,
		}
		if groupIDStr != "" {
			reqMap["user"] = r.User
		} else {
			reqMap["group"] = r.Group
		}
		requests = append(requests, reqMap)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

// CreateGroupPostHandler creates a post in a group
func (S *Server) CreateGroupPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var post struct {
		Post
		GroupID int `json:"groupId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&post); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	// Check membership
	var count int
	S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", post.GroupID, userID).Scan(&count)
	if count == 0 {
		http.Error(w, "Not a member", http.StatusForbidden)
		return
	}

	if strings.TrimSpace(post.Content) == "" && post.Image == nil {
		http.Error(w, "Content cannot be empty", http.StatusBadRequest)
		return
	}

	// Insert into database
	res, err := S.db.Exec(`
        INSERT INTO posts (user_id, content, image, privacy, group_id)
        VALUES (?, ?, ?, 'public', ?)`, // Group posts are public within the group context, or we can use 'group' privacy if we added it. But schema has 'public' default.
		userID, html.EscapeString(post.Content), post.Image, post.GroupID,
	)

	if err != nil {
		fmt.Println("Error inserting group post:", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	lastID, _ := res.LastInsertId()
	post.ID = int(lastID)
	post.UserID = userID
	post.CreatedAt = time.Now().Format(time.RFC3339)

	// Fetch full post details
	fullPost, err := S.GetPostFromID(post.ID, r)
	if err != nil {
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(fullPost)
}

// GetGroupPostsHandler returns posts for a group
func (S *Server) GetGroupPostsHandler(w http.ResponseWriter, r *http.Request) {
	groupIDStr := r.URL.Path[len("/api/groups/posts/"):]
	groupID := tools.StringToInt(groupIDStr)

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Check membership
	var count int
	S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&count)
	if count == 0 {
		http.Error(w, "Not a member", http.StatusForbidden)
		return
	}

	rows, err := S.db.Query(`
	SELECT 
		p.id, p.content, p.image, p.created_at, p.privacy,
		u.id, u.first_name, u.last_name, u.nickname, u.avatar, u.is_private,
		(SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count,
		(SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.parent_comment_id IS NULL) as comment_count,
		EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) as is_liked
	FROM posts p
	JOIN users u ON p.user_id = u.id
	WHERE p.group_id = ?
	ORDER BY p.created_at DESC
`, userID, groupID)

	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var post Post
		var authorID int
		var firstName, lastName, nickname, avatar sql.NullString
		var isPrivate bool
		if err := rows.Scan(
			&post.ID, &post.Content, &post.Image, &post.CreatedAt, &post.Privacy,
			&authorID, &firstName, &lastName, &nickname, &avatar, &isPrivate,
			&post.Likes, &post.Comments, &post.IsLiked,
		); err != nil {
			continue
		}

		post.Author = Author{
			Name:      firstName.String + " " + lastName.String,
			Username:  nickname.String,
			Avatar:    avatar.String,
			IsPrivate: isPrivate,
		}
		post.UserID = authorID
		posts = append(posts, post)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// CreateGroupEventHandler creates an event
func (S *Server) CreateGroupEventHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var event GroupEvent
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	// Check membership
	var count int
	S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", event.GroupID, userID).Scan(&count)
	if count == 0 {
		http.Error(w, "Not a member", http.StatusForbidden)
		return
	}

	res, err := S.db.Exec("INSERT INTO events (group_id, title, description, event_datetime) VALUES (?, ?, ?, ?)", event.GroupID, html.EscapeString(event.Title), html.EscapeString(event.Description), event.EventDatetime)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	eventID, _ := res.LastInsertId()
	event.ID = int(eventID)
	event.CreatedAt = time.Now().Format(time.RFC3339)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(event)
}

// GetGroupEventsHandler returns events for a group
func (S *Server) GetGroupEventsHandler(w http.ResponseWriter, r *http.Request) {
	groupIDStr := r.URL.Path[len("/api/groups/events/"):]
	groupID := tools.StringToInt(groupIDStr)

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Check membership
	var count int
	S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&count)
	if count == 0 {
		http.Error(w, "Not a member", http.StatusForbidden)
		return
	}

	rows, err := S.db.Query(`
		SELECT e.id, e.group_id, e.title, e.description, e.event_datetime, e.created_at,
		(SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id AND ep.status = 'going') as going_count,
		(SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id AND ep.status = 'not-going') as not_going_count,
		(SELECT status FROM event_participants ep WHERE ep.event_id = e.id AND ep.user_id = ?) as user_status
		FROM events e
		WHERE e.group_id = ?
		ORDER BY e.event_datetime ASC
	`, userID, groupID)

	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var events []GroupEvent
	for rows.Next() {
		var e GroupEvent
		var userStatus sql.NullString
		if err := rows.Scan(&e.ID, &e.GroupID, &e.Title, &e.Description, &e.EventDatetime, &e.CreatedAt, &e.GoingCount, &e.NotGoingCount, &userStatus); err != nil {
			continue
		}
		e.UserStatus = userStatus.String
		events = append(events, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// RespondToGroupEventHandler handles going/not-going
func (S *Server) RespondToGroupEventHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		EventID int    `json:"eventId"`
		Status  string `json:"status"` // 'going' or 'not-going'
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if req.Status != "going" && req.Status != "not-going" {
		http.Error(w, "Invalid status", http.StatusBadRequest)
		return
	}

	// Check if user is member of the group that owns the event
	var groupID int
	err = S.db.QueryRow("SELECT group_id FROM events WHERE id = ?", req.EventID).Scan(&groupID)
	if err != nil {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	}

	var count int
	S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&count)
	if count == 0 {
		http.Error(w, "Not a member", http.StatusForbidden)
		return
	}

	// Upsert participant status
	_, err = S.db.Exec(`
		INSERT INTO event_participants (event_id, user_id, status) VALUES (?, ?, ?)
		ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status
	`, req.EventID, userID, req.Status)

	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// GetGroupChatHandler returns chat messages for a group
func (S *Server) GetGroupChatHandler(w http.ResponseWriter, r *http.Request) {
	groupIDStr := r.URL.Path[len("/api/groups/chat/"):]
	groupID := tools.StringToInt(groupIDStr)

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Check membership
	var count int
	S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&count)
	if count == 0 {
		http.Error(w, "Not a member", http.StatusForbidden)
		return
	}

	rows, err := S.db.Query(`
		SELECT m.id, m.group_id, m.sender_id, m.content, m.created_at,
		       u.first_name, u.last_name, u.nickname, u.avatar
		FROM group_messages m
		JOIN users u ON m.sender_id = u.id
		WHERE m.group_id = ?
		ORDER BY m.created_at ASC
	`, groupID)

	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []map[string]interface{}
	for rows.Next() {
		var id, gid, sid int
		var content, createdAt string
		var fname, lname, nick, av sql.NullString
		if err := rows.Scan(&id, &gid, &sid, &content, &createdAt, &fname, &lname, &nick, &av); err != nil {
			continue
		}
		messages = append(messages, map[string]interface{}{
			"id":        id,
			"groupId":   gid,
			"senderId":  sid,
			"content":   content,
			"createdAt": createdAt,
			"sender": map[string]interface{}{
				"firstName": fname.String,
				"lastName":  lname.String,
				"nickname":  nick.String,
				"avatar":    av.String,
			},
			"isOwn": sid == userID,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// SendGroupMessageHandler sends a message to a group
func (S *Server) SendGroupMessageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, sessionID, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var msg struct {
		GroupID int    `json:"groupId"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(msg.Content) == "" {
		http.Error(w, "Content is required", http.StatusBadRequest)
		return
	}

	// Check membership
	var count int
	S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", msg.GroupID, userID).Scan(&count)
	if count == 0 {
		http.Error(w, "Not a member", http.StatusForbidden)
		return
	}

	// Insert message
	res, err := S.db.Exec("INSERT INTO group_messages (group_id, sender_id, content) VALUES (?, ?, ?)", msg.GroupID, userID, html.EscapeString(msg.Content))
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	msgID, _ := res.LastInsertId()

	// Get sender info
	var sender User
	S.db.QueryRow("SELECT first_name, last_name, nickname, avatar FROM users WHERE id = ?", userID).Scan(&sender.FirstName, &sender.LastName, &sender.Nickname, &sender.AvatarUrl)

	messagePayload := map[string]interface{}{
		"id":        msgID,
		"groupId":   msg.GroupID,
		"senderId":  userID,
		"content":   html.EscapeString(msg.Content),
		"createdAt": time.Now().Format(time.RFC3339),
		"sender":    sender,
		"type":      "group_message",
	}

	// Broadcast to all members
	rows, err := S.db.Query("SELECT user_id FROM group_members WHERE group_id = ?", msg.GroupID)
	if err != nil {
		fmt.Println("Error getting group members for broadcast:", err)
	} else {
		defer rows.Close()
		for rows.Next() {
			var memberID int
			if err := rows.Scan(&memberID); err != nil {
				continue
			}

			sid := ""
			if memberID == userID {
				sid = sessionID
			}
			S.PushMessage(sid, memberID, messagePayload)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messagePayload)
}

func (S *Server) GetGroupMembersHandler(w http.ResponseWriter, r *http.Request) {
	groupIDStr := r.URL.Path[len("/api/groups/members/"):]
	groupID := tools.StringToInt(groupIDStr)

	fmt.Println("Getting members for group ID:", groupID)
	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Check membership
	var count int
	S.db.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&count)
	if count == 0 {
		http.Error(w, "Not a member", http.StatusForbidden)
		return
	}

	rows, err := S.db.Query(`
		SELECT u.id, u.first_name, u.last_name, u.nickname, u.avatar, u.is_private, u.url
		FROM group_members gm
		JOIN users u ON gm.user_id = u.id
		WHERE gm.group_id = ?
	`, groupID)

	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	fmt.Println("Rows fetched for group members")

	var members []GroupMemberResponse
	for rows.Next() {
		var u GroupMemberResponse
		if err := rows.Scan(&u.UserId, &u.FirstName, &u.LastName, &u.Nickname, &u.AvatarUrl, &u.IsPrivate, &u.Url); err != nil {
			continue
		}
		members = append(members, u)
	}
	fmt.Println("Members:", members)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}
