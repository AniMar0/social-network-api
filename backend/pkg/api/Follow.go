package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

func (S *Server) CancelFollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	banned, UserID := S.ActionMiddleware(r, http.MethodPost, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	var body struct {
		FollowerID  string `json:"follower"`
		FollowingID string `json:"following"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		tools.SendJSONError(w, "invalid body", http.StatusBadRequest)
		return
	}

	checkifnumberFollower, followerID := tools.IsNumeric(body.FollowerID)
	checkifnumberFollowing, followingID := tools.IsNumeric(body.FollowingID)

	if !checkifnumberFollower || !checkifnumberFollowing {
		tools.SendJSONError(w, "follower and following must be numeric", http.StatusBadRequest)
		return
	}

	if followerID == 0 || followingID == 0 {
		tools.SendJSONError(w, "follower and following cannot be zero", http.StatusBadRequest)
		return
	}

	if followerID == followingID || UserID != followerID {
		S.ActionMiddleware(r, http.MethodPost, true, true)
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	_, err := S.db.Exec(`
		DELETE FROM follow_requests 
		WHERE sender_id = ? AND receiver_id = ?`,
		body.FollowerID, body.FollowingID,
	)
	if err != nil {
		tools.SendJSONError(w, "failed to cancel follow request", http.StatusInternalServerError)
		return
	}
	//dellete notification from database
	S.DeleteNotification(followerID, followingID, "follow_request")

	S.PushNotification("-delete", followingID, Notification{})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "follow request cancelled"})
}
func (S *Server) AcceptFollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	banned, UserID := S.ActionMiddleware(r, http.MethodPost, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	id := r.URL.Path[len("/api/accept-follow-request/"):]

	CheckNotification, notificationID := tools.IsNumeric(id)
	if !CheckNotification {
		tools.SendJSONError(w, "invalid notification ID", http.StatusBadRequest)
		return
	}

	FollowerID, FollowingID, err := S.GetSenderAndReceiverIDs(notificationID)
	if err != nil {
		fmt.Println(err)
		tools.SendJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	if UserID != FollowingID {
		S.ActionMiddleware(r, http.MethodPost, true, true)
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tx, err := S.db.Begin()
	if err != nil {
		tools.SendJSONError(w, "failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		DELETE FROM follow_requests 
		WHERE sender_id = ? AND receiver_id = ?`,
		FollowerID, FollowingID,
	)
	if err != nil {
		tools.SendJSONError(w, "failed to delete follow request", http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec(`
		INSERT INTO follows (follower_id, following_id) 
		VALUES (?, ?)`,
		FollowerID, FollowingID,
	)
	if err != nil {
		tools.SendJSONError(w, "failed to accept follow request", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		tools.SendJSONError(w, "failed to commit transaction", http.StatusInternalServerError)
		return
	}

	notification := Notification{
		ID:        (FollowerID),
		ActorID:   (FollowingID),
		Type:      "follow",
		Content:   "Follow Request Accepted",
		IsRead:    false,
		CreatedAt: time.Now(),
	}

	if err := S.InsertNotification(notification); err != nil {
		tools.SendJSONError(w, "Error inserting notification: "+err.Error(), http.StatusInternalServerError)
		return
	}

	S.PushNotification("-new", FollowerID, notification)
	S.PushNotification("-read", FollowingID, notification)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "follow request accepted"})
}
func (S *Server) DeclineFollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	banned, UserID := S.ActionMiddleware(r, http.MethodPost, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	id := r.URL.Path[len("/api/decline-follow-request/"):]

	CheckNotification, notificationID := tools.IsNumeric(id)
	if !CheckNotification {
		tools.SendJSONError(w, "invalid notification ID", http.StatusBadRequest)
		return
	}

	FollowerID, FollowingID, err := S.GetSenderAndReceiverIDs(notificationID)
	if err != nil {
		tools.SendJSONError(w, "invalid IDs", http.StatusBadRequest)
		return
	}

	if UserID != FollowingID {
		S.ActionMiddleware(r, http.MethodPost, true, true)
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	_, err = S.db.Exec(`
		DELETE FROM follow_requests 
		WHERE sender_id = ? AND receiver_id = ?`,
		FollowerID, FollowingID,
	)
	if err != nil {
		tools.SendJSONError(w, "failed to decline follow request", http.StatusInternalServerError)
		return
	}
	S.DeleteNotification(FollowerID, FollowingID, "follow_request")

	S.PushNotification("-read", FollowingID, Notification{})
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "follow request declined"})
}

func (S *Server) SendFollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	banned, UserID := S.ActionMiddleware(r, http.MethodPost, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Follower  string `json:"follower"`
		Following string `json:"following"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fmt.Printf("Error decoding request body: %v\n", err)
		tools.SendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	checkifnumberFollower, followerID := tools.IsNumeric(req.Follower)
	checkifnumberFollowing, followingID := tools.IsNumeric(req.Following)
	if !checkifnumberFollower || !checkifnumberFollowing {

		fmt.Printf("Invalid follower or following ID: follower=%s, following=%s\n", req.Follower, req.Following)
		tools.SendJSONError(w, "follower and following must be numeric", http.StatusBadRequest)
		return
	}

	if followerID == 0 || followingID == 0 {

		fmt.Printf("Invalid follower or following ID: followerID=%d, followingID=%d\n", followerID, followingID)
		tools.SendJSONError(w, "follower and following cannot be zero", http.StatusBadRequest)
		return
	}

	if req.Follower == req.Following || UserID != followerID || S.ContainsHTML([]byte(req.Follower)) || S.ContainsHTML([]byte(req.Following)) {

		fmt.Printf("Invalid request: follower=%s, following=%s, UserID=%d, followerID=%d\n", req.Follower, req.Following, UserID, followerID)
		S.ActionMiddleware(r, http.MethodPost, true, true)
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// check duplicate
	var exists int
	err := S.db.QueryRow(`
		SELECT COUNT(*) 
		FROM follow_requests 
		WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
	`, req.Follower, req.Following).Scan(&exists)
	if err != nil {
		fmt.Printf("Error checking duplicate: %v\n", err)
		tools.SendJSONError(w, "DB error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if exists > 0 {
		fmt.Printf("Follow request already sent: sender=%s, receiver=%s\n", req.Follower, req.Following)
		tools.SendJSONError(w, "Follow request already sent", http.StatusConflict)
		return
	}

	_, err = S.db.Exec(`
		INSERT INTO follow_requests (sender_id, receiver_id, status) 
		VALUES (?, ?, 'pending')
	`, req.Follower, req.Following)
	if err != nil {
		fmt.Printf("Error inserting follow request: %v\n", err)
		tools.SendJSONError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	notification := Notification{
		ID:        followingID,
		ActorID:   followerID,
		Type:      "follow_request",
		Content:   "Follow request",
		IsRead:    false,
		CreatedAt: time.Now(),
	}
	if err := S.InsertNotification(notification); err != nil {

		fmt.Printf("Error inserting notification: %v\n", err)
		tools.SendJSONError(w, "Error inserting notification: "+err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("Notification inserted successfully: actor=%d, target=%d\n", followerID, followingID)
	S.PushNotification("-new", followingID, notification)

	json.NewEncoder(w).Encode(map[string]string{
		"message": "Follow request sent",
	})
}
func (S *Server) FollowHandler(w http.ResponseWriter, r *http.Request) {
	banned, UserId := S.ActionMiddleware(r, http.MethodPost, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fmt.Printf("FollowHandler called with body: %+v\n", r.Body)

	var body struct {
		Follower  string `json:"follower"`
		Following string `json:"following"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {

		fmt.Printf("Error decoding body: %v\n", err)
		tools.SendJSONError(w, "invalid body", http.StatusBadRequest)
		return
	}

	checkifnumberFollower, followerID := tools.IsNumeric(body.Follower)
	checkifnumberFollowing, followingID := tools.IsNumeric(body.Following)
	if !checkifnumberFollower || !checkifnumberFollowing {

		fmt.Printf("Invalid follower or following ID: follower=%s, following=%s\n", body.Follower, body.Following)
		tools.SendJSONError(w, "follower and following must be numeric", http.StatusBadRequest)
		return
	}

	if UserId != followerID || followerID == followingID {

		fmt.Printf("Unauthorized access: UserId=%d, followerID=%d, followingID=%d\n", UserId, followerID, followingID)
		S.ActionMiddleware(r, http.MethodPost, true, true)
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := S.FollowUser(body.Follower, body.Following); err != nil {

		fmt.Printf("Error following user: %v\n", err)
		tools.SendJSONError(w, "failed to follow", http.StatusInternalServerError)
		return
	}

	fmt.Printf("User followed successfully: follower=%d, following=%d\n", followerID, followingID)

	notification := Notification{
		ID:        followingID,
		ActorID:   followerID,
		Type:      "follow",
		Content:   "Follow",
		IsRead:    false,
		CreatedAt: time.Now(),
	}

	if err := S.InsertNotification(notification); err != nil {
		fmt.Printf("Error inserting notification: %v\n", err)
		tools.SendJSONError(w, "Error inserting notification: "+err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("Notification pushed successfully: actor=%d, target=%d\n", followerID, followingID)
	S.PushNotification("-new", followingID, notification)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "followed successfully",
	})
}
func (S *Server) UnfollowHandler(w http.ResponseWriter, r *http.Request) {
	banned, UserId := S.ActionMiddleware(r, http.MethodPost, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var body struct {
		Follower  string `json:"follower"`
		Following string `json:"following"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		tools.SendJSONError(w, "invalid body", http.StatusBadRequest)
		return
	}

	checkifnumberFollower, followerID := tools.IsNumeric(body.Follower)
	checkifnumberFollowing, followingID := tools.IsNumeric(body.Following)
	if !checkifnumberFollower || !checkifnumberFollowing {
		tools.SendJSONError(w, "follower and following must be numeric", http.StatusBadRequest)
		return
	}

	if UserId != followerID || followerID == followingID {
		S.ActionMiddleware(r, http.MethodPost, true, true)
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := S.UnfollowUser(body.Follower, body.Following); err != nil {
		tools.SendJSONError(w, "failed to unfollow", http.StatusInternalServerError)
		return
	}

	S.DeleteNotification(followerID, followingID, "follow")

	S.PushNotification("-delete", followingID, Notification{})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "unfollowed successfully",
	})
}
func (S *Server) FollowUser(follower, following string) error {
	query := `
		INSERT INTO follows (follower_id, following_id) VALUES (?, ?) 
		ON CONFLICT(follower_id, following_id) DO NOTHING`

	_, err := S.db.Exec(query, follower, following)

	return err
}
func (S *Server) UnfollowUser(follower, following string) error {
	_, err := S.db.Exec(`
		DELETE FROM follows WHERE follower_id = ? AND following_id = ?
	`, follower, following)

	return err
}
func (S *Server) GetFollowersCount(url string) (int, error) {
	row := S.db.QueryRow(`
		SELECT COUNT(*) 
		FROM follows f
		JOIN users u ON u.id = f.following_id
		WHERE u.url = ?
	`, url)

	var count int
	if err := row.Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}
func (S *Server) GetFollowingCount(url string) (int, error) {
	row := S.db.QueryRow(`
		SELECT COUNT(*) 
		FROM follows f
		JOIN users u ON u.id = f.follower_id
		WHERE u.url = ?
	`, url)

	var count int
	if err := row.Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}
func (S *Server) GetFollowRequestStatus(r *http.Request, followingURL string) (string, error) {
	follower, _, _ := S.CheckSession(r)
	var followingID int
	err := S.db.QueryRow(`SELECT id FROM users WHERE url = ?`, followingURL).Scan(&followingID)
	if err != nil {
		return "", err
	}

	var status string
	if err := S.db.QueryRow(`
		SELECT status 
		FROM follow_requests 
		WHERE sender_id = ? AND receiver_id = ?
	`, follower, followingID).Scan(&status); err != nil {
		return "", err
	}
	return status, nil
}
func (S *Server) IsFollowing(followerID int, followingURL string, followingID int) (bool, error) {
	if followingID == 0 {
		err := S.db.QueryRow(`SELECT id FROM users WHERE url = ?`, followingURL).Scan(&followingID)
		if err != nil {
			return false, err
		}
	}
	var isFollowing bool
	err := S.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?)`, followerID, followingID).Scan(&isFollowing)
	if err != nil {
		return false, err
	}

	return isFollowing, nil
}
func (S *Server) IsFollower(followerID int, followingURL string, followingID int) (bool, error) {
	if followingID == 0 {
		err := S.db.QueryRow(`SELECT id FROM users WHERE url = ?`, followingURL).Scan(&followingID)
		if err != nil {
			return false, err
		}
	}
	var isFollowing bool
	err := S.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?)`, followingID, followerID).Scan(&isFollowing)
	if err != nil {
		return false, err
	}

	return isFollowing, nil
}
func (S *Server) GetFollowersHandler(w http.ResponseWriter, r *http.Request) {
	banned, currentUser := S.ActionMiddleware(r, http.MethodGet, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	followers, err := S.GetFollowers(currentUser)
	if err != nil {
		tools.SendJSONError(w, "failed to get followers", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(followers)
}

func (S *Server) GetFollowingsHandler(w http.ResponseWriter, r *http.Request) {
	banned, currentUser := S.ActionMiddleware(r, http.MethodGet, true, false)
	if banned {
		tools.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	followings, err := S.GetFollowings(currentUser)
	if err != nil {
		tools.SendJSONError(w, "failed to get followings", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(followings)
}

func (S *Server) GetFollowers(User int) ([]Follower, error) {
	var followers []Follower
	query := `SELECT 
    	u.id,
    	u.first_name,
    	u.last_name,
    	u.nickname,
    	u.avatar
	FROM follows f
	JOIN users u ON u.id = f.follower_id
	WHERE f.following_id = ?;
	`
	rows, err := S.db.Query(query, User)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var follower Follower
		var nickname sql.NullString
		if err := rows.Scan(&follower.ID, &follower.FirstName, &follower.LastName, &nickname, &follower.Avatar); err != nil {
			return nil, err
		}
		if nickname.Valid {
			follower.Nickname = nickname.String
		}
		followers = append(followers, follower)
	}
	return followers, nil
}

func (S *Server) GetFollowings(User int) ([]Follower, error) {
	var followings []Follower
	query := `SELECT 
		u.id,
		u.first_name,
		u.last_name,
		u.nickname,
		u.avatar
	FROM follows f
	JOIN users u ON u.id = f.following_id
	WHERE f.follower_id = ?;
	`
	rows, err := S.db.Query(query, User)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var following Follower
		var nickname sql.NullString
		if err := rows.Scan(&following.ID, &following.FirstName, &following.LastName, &nickname, &following.Avatar); err != nil {
			return nil, err
		}
		if nickname.Valid {
			following.Nickname = nickname.String
		}
		followings = append(followings, following)
	}
	return followings, nil
}
