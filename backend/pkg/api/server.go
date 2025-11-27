package backend

import (
	"SOCIAL-NETWORK/pkg/db/sqlite"
	"database/sql"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

type Server struct {
	db       *sql.DB
	mux      *http.ServeMux
	upgrader websocket.Upgrader
	Users    map[int][]*Client
	sync.RWMutex
}

func (S *Server) Run(addr string) {
	S.db = sqlite.ConnectAndMigrate("pkg/db/migrations/app.db", "pkg/db/migrations/sqlite")
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
			log.Fatalf("failed to close database: %v", err)
		}
	}(S.db)

	S.mux = http.NewServeMux()
	S.initRoutes()

	S.Users = make(map[int][]*Client)

	// CORS configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
	})

	// Wrap mux with CORS
	handler := c.Handler(S.mux)

	log.Printf("Backend listening on :%s", addr)
	if err := http.ListenAndServe(":"+addr, handler); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func (S *Server) initRoutes() {
	S.mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	//user handlers
	S.mux.HandleFunc("/api/register", S.RegisterHandler)
	S.mux.HandleFunc("/api/upload-avatar", S.UploadAvatarHandler)
	S.mux.HandleFunc("/api/user/update", S.UpdateProfileHandler)

	//notification handlers
	S.mux.HandleFunc("/api/notifications", S.GetNotificationsHandler)
	S.mux.HandleFunc("/api/mark-notification-as-read/", S.MarkNotificationAsReadHandler)
	S.mux.HandleFunc("/api/mark-all-notification-as-read", S.MarkAllNotificationAsReadHandler)
	S.mux.HandleFunc("/api/delete-notification/", S.DeleteNotificationHandler)

	//Websocket handlers
	S.mux.HandleFunc("/ws", S.WebSocketHandler)

	//auth handlers
	S.mux.HandleFunc("/api/login", S.LoginHandler)
	S.mux.HandleFunc("/api/logged", S.LoggedHandler)
	S.mux.HandleFunc("/api/logout", S.LogoutHandler)

	//follow handlers
	S.mux.HandleFunc("/api/follow", S.FollowHandler)
	S.mux.HandleFunc("/api/unfollow", S.UnfollowHandler)
	S.mux.HandleFunc("/api/cancel-follow-request", S.CancelFollowRequestHandler)
	S.mux.HandleFunc("/api/accept-follow-request/", S.AcceptFollowRequestHandler)
	S.mux.HandleFunc("/api/decline-follow-request/", S.DeclineFollowRequestHandler)
	S.mux.HandleFunc("/api/send-follow-request", S.SendFollowRequestHandler)
	S.mux.HandleFunc("/api/get-followers", S.GetFollowersHandler)

	//profile handlers
	S.mux.HandleFunc("/api/profile/", S.ProfileHandler)
	S.mux.HandleFunc("/api/me", S.MeHandler)

	//post handlers
	S.mux.HandleFunc("/api/create-post", S.CreatePostHandler)
	S.mux.HandleFunc("/api/get-posts", S.GetPostsHandler)
	S.mux.HandleFunc("/api/upload-post-file", S.UploadPostHandler)

	//comment handlers
	S.mux.HandleFunc("/api/create-comment", S.CreateCommentHandler)
	S.mux.HandleFunc("/api/get-comments/", S.GetCommentsHandler)
	// S.mux.HandleFunc("/api/delete-comment/", S.DeleteCommentHandler)

	//message handlers
	S.mux.HandleFunc("/api/get-users", S.GetUsersHandler)
	S.mux.HandleFunc("/api/get-users/profile/", S.GetUserProfileHandler)
	S.mux.HandleFunc("/api/make-message/", S.MakeChatHandler)
	S.mux.HandleFunc("/api/send-message/", S.SendMessageHandler)
	S.mux.HandleFunc("/api/get-messages/", S.GetMessagesHandler)
	S.mux.HandleFunc("/api/upoad-file", S.UploadFileHandler)

	// Group handlers
	S.mux.HandleFunc("/api/groups/create", S.CreateGroupHandler)
	S.mux.HandleFunc("/api/groups", S.GetGroupsHandler)
	S.mux.HandleFunc("/api/groups/", S.GetGroupHandler)
	S.mux.HandleFunc("/api/groups/update", S.UpdateGroupHandler)
	S.mux.HandleFunc("/api/groups/delete/", S.DeleteGroupHandler)
	S.mux.HandleFunc("/api/groups/join", S.JoinGroupRequestHandler)
	S.mux.HandleFunc("/api/groups/invite", S.InviteGroupMemberHandler)
	S.mux.HandleFunc("/api/groups/requests/accept/", S.AcceptGroupRequestHandler)
	S.mux.HandleFunc("/api/groups/requests/decline/", S.DeclineGroupRequestHandler)
	S.mux.HandleFunc("/api/groups/requests", S.GetGroupRequestsHandler)
	S.mux.HandleFunc("/api/groups/posts/create", S.CreateGroupPostHandler)
	S.mux.HandleFunc("/api/groups/posts/", S.GetGroupPostsHandler)
	S.mux.HandleFunc("/api/groups/events/create", S.CreateGroupEventHandler)
	S.mux.HandleFunc("/api/groups/events/", S.GetGroupEventsHandler)
	S.mux.HandleFunc("/api/groups/events/respond", S.RespondToGroupEventHandler)
	S.mux.HandleFunc("/api/groups/chat/", S.GetGroupChatHandler)
	S.mux.HandleFunc("/api/groups/chat/send", S.SendGroupMessageHandler)
	S.mux.HandleFunc("/api/groups/members/", S.GetGroupMembersHandler)
}

func (S *Server) initWebSocket() {
	S.upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return r.Header.Get("Origin") == "http://localhost:3000"
		},
	}
}
