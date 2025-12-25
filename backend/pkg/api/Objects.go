package backend

import (
	"time"
)

type User struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	DateOfBirth string `json:"dateOfBirth"`
	Nickname    string `json:"nickname"`
	AboutMe     string `json:"aboutMe"`
	Age         int    `json:"-"`
	Gender      string `json:"gender"`
	Url         string `json:"url"`
	AvatarUrl   string `json:"avatarUrl"`
	CreatedAt   string `json:"createdAt"`
}

type UserData struct {
	ID                  string `json:"id"`
	FirstName           string `json:"firstName"`
	LastName            string `json:"lastName"`
	Nickname            string `json:"nickname,omitempty"`
	Email               string `json:"email"`
	DateOfBirth         string `json:"dateOfBirth"`
	Avatar              string `json:"avatar,omitempty"`
	AboutMe             string `json:"aboutMe,omitempty"`
	Age                 int    `json:"age"`
	IsPrivate           bool   `json:"isPrivate"`
	FollowersCount      int    `json:"followersCount"`
	FollowingCount      int    `json:"followingCount"`
	PostsCount          int    `json:"postsCount"`
	JoinedDate          string `json:"joinedDate"`
	Url                 string `json:"url"`
	Isfollowing         bool   `json:"isfollowing"`
	FollowRequestStatus string `json:"followRequestStatus"`
}

type LoginUser struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

type Post struct {
	ID                int      `json:"id"`
	UserID            int      `json:"-"`
	GroupID           int      `json:"groupId,omitempty"`
	Content           string   `json:"content"`
	Image             *string  `json:"image,omitempty"`
	Privacy           string   `json:"privacy"`
	CreatedAt         string   `json:"createdAt"`
	Likes             int      `json:"likes"`
	Comments          int      `json:"comments"`
	Author            Author   `json:"author"`
	SelectedFollowers []string `json:"selectedFollowers,omitempty"`
}

type Notification struct {
	ID        int       `json:"id"`
	Type      string    `json:"type"`
	Content   string    `json:"content"`
	IsRead    bool      `json:"isRead"`
	CreatedAt time.Time `json:"timestamp"`
	ActorID   int       `json:"actorId"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	Avatar    string    `json:"avatar"`
}

type Author = struct {
	Name      string `json:"name"`
	Username  string `json:"username"`
	Avatar    string `json:"avatar"`
	IsPrivate bool   `json:"isPrivate"`
	Url       string `json:"url"`
}

type Message struct {
	ID        string `json:"id"`
	ChatID    int    `json:"chat_id"`
	SenderID  int    `json:"sender_id"`
	Content   string `json:"content"`
	Type      string `json:"type"`
	IsOwn     bool   `json:"isOwn"`
	Timestamp string `json:"timestamp"`
}

type Chat struct {
	ChatID   int    `json:"id"`
	Name     string `json:"name"`
	UserID   int    `json:"userId,omitempty"`
	Url      string `json:"otherUserId,omitempty"`
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
	IsOnline bool   `json:"isOnline,omitempty"`
}

type Follower struct {
	ID        string `json:"id"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Nickname  string `json:"username,omitempty"`
	Avatar    string `json:"avatar"`
}

type Comment struct {
	ID     string `json:"id"`
	Author struct {
		Name     string `json:"name,omitempty"`
		Username string `json:"username,omitempty"`
		Avatar   string `json:"avatar,omitempty"`
	} `json:"author,omitempty"`
	Content   string `json:"content"`
	Type      string `json:"type"`
	CreatedAt string `json:"createdAt"`
}

type CommentRequest struct {
	PostID  int    `json:"postId"`
	Content string `json:"content"`
	Type    string `json:"type"`
}

type Group struct {
	ID          int    `json:"id"`
	CreatorID   int    `json:"creatorId"`
	Title       string `json:"title"`
	Description string `json:"description"`
	CreatedAt   string `json:"createdAt"`
	IsMember    bool   `json:"isMember,omitempty"`
	IsCreator   bool   `json:"isCreator,omitempty"`
}

type GroupMember struct {
	GroupID  int    `json:"groupId"`
	UserID   int    `json:"userId"`
	JoinedAt string `json:"joinedAt"`
	User     User   `json:"user,omitempty"`
}

type GroupRequest struct {
	ID          int    `json:"id"`
	GroupID     int    `json:"groupId"`
	UserID      int    `json:"userId"`
	RequesterID int    `json:"requesterId"`
	Type        string `json:"type"` // 'invite' or 'request'
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
	User        User   `json:"user,omitempty"`      // The user involved
	Requester   User   `json:"requester,omitempty"` // The one who made the request
	Group       Group  `json:"group,omitempty"`
}

type GroupEvent struct {
	ID            int    `json:"id"`
	GroupID       int    `json:"groupId"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	EventDatetime string `json:"eventDatetime"`
	CreatedAt     string `json:"createdAt"`
	GoingCount    int    `json:"goingCount"`
	NotGoingCount int    `json:"notGoingCount"`
	UserStatus    string `json:"userStatus,omitempty"` // 'going', 'not-going', or empty
}

type GroupMemberResponse struct {
	UserId    int     `json:"userId"`
	Url       string  `json:"url"`
	FirstName string  `json:"firstName"`
	LastName  string  `json:"lastName"`
	Nickname  *string `json:"nickname,omitempty"`
	AvatarUrl *string `json:"avatar,omitempty"`
	IsPrivate bool    `json:"isPrivate"`
}
