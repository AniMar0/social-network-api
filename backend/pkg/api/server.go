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
	S.initWebSocket()

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
	//file handlers
	S.mux.HandleFunc("/api/file", S.AuthMiddleware(http.HandlerFunc(S.ProtectedFileHandler)))
	S.mux.HandleFunc("/api/upload-file", S.UploadFileHandler)

	//user handlers
	S.mux.HandleFunc("/api/register", S.RegisterHandler)
	S.mux.HandleFunc("/api/user/update", S.AuthMiddleware(http.HandlerFunc(S.UpdateUserHandler)))

	//notification handlers
	S.mux.HandleFunc("/api/notifications", S.AuthMiddleware(http.HandlerFunc(S.GetNotificationsHandler)))
	S.mux.HandleFunc("/api/mark-notification-as-read/", S.AuthMiddleware(http.HandlerFunc(S.MarkNotificationAsReadHandler)))
	S.mux.HandleFunc("/api/mark-all-notification-as-read", S.AuthMiddleware(http.HandlerFunc(S.MarkAllNotificationAsReadHandler)))
	S.mux.HandleFunc("/api/delete-notification/", S.AuthMiddleware(http.HandlerFunc(S.DeleteNotificationHandler)))

	//Websocket handlers
	S.mux.HandleFunc("/ws", S.AuthMiddleware(http.HandlerFunc(S.WebSocketHandler)))
	//auth handlers
	S.mux.HandleFunc("/api/login", S.LoginHandler)
	S.mux.HandleFunc("/api/logged", S.LoggedHandler)
	S.mux.HandleFunc("/api/logout", S.AuthMiddleware(http.HandlerFunc(S.LogoutHandler)))
	//follow handlers
	S.mux.HandleFunc("/api/follow", S.AuthMiddleware(http.HandlerFunc(S.FollowHandler)))
	S.mux.HandleFunc("/api/unfollow", S.AuthMiddleware(http.HandlerFunc(S.UnfollowHandler)))
	S.mux.HandleFunc("/api/cancel-follow-request", S.AuthMiddleware(http.HandlerFunc(S.CancelFollowRequestHandler)))
	S.mux.HandleFunc("/api/accept-follow-request/", S.AuthMiddleware(http.HandlerFunc(S.AcceptFollowRequestHandler)))
	S.mux.HandleFunc("/api/decline-follow-request/", S.AuthMiddleware(http.HandlerFunc(S.DeclineFollowRequestHandler)))
	S.mux.HandleFunc("/api/send-follow-request", S.AuthMiddleware(http.HandlerFunc(S.SendFollowRequestHandler)))
	S.mux.HandleFunc("/api/get-followers", S.AuthMiddleware(http.HandlerFunc(S.GetFollowersHandler)))

	//profile handlers
	S.mux.HandleFunc("/api/profile/", S.AuthMiddleware(http.HandlerFunc(S.ProfileHandler)))
	S.mux.HandleFunc("/api/me", S.AuthMiddleware(http.HandlerFunc(S.MeHandler)))

	//post handlers
	S.mux.HandleFunc("/api/create-post", S.AuthMiddleware(http.HandlerFunc(S.CreatePostHandler)))
	S.mux.HandleFunc("/api/get-posts", S.AuthMiddleware(http.HandlerFunc(S.GetPostsHandler)))

	//comment handlers
	S.mux.HandleFunc("/api/create-comment", S.AuthMiddleware(http.HandlerFunc(S.CreateCommentHandler)))
	S.mux.HandleFunc("/api/get-comments/", S.AuthMiddleware(http.HandlerFunc(S.GetCommentsHandler)))
	// S.mux.HandleFunc("/api/delete-comment/", S.AuthMiddleware(http.HandlerFunc(S.DeleteCommentHandler)))

	//message handlers
	S.mux.HandleFunc("/api/get-users", S.AuthMiddleware(http.HandlerFunc(S.GetUsersHandler)))
	S.mux.HandleFunc("/api/make-chat/", S.AuthMiddleware(http.HandlerFunc(S.MakeChatHandler)))
	S.mux.HandleFunc("/api/send-message/", S.AuthMiddleware(http.HandlerFunc(S.SendMessageHandler)))
	S.mux.HandleFunc("/api/get-messages/", S.AuthMiddleware(http.HandlerFunc(S.GetMessagesHandler)))

	// Group handlers
	S.mux.HandleFunc("/api/groups/create", S.AuthMiddleware(http.HandlerFunc(S.CreateGroupHandler)))
	S.mux.HandleFunc("/api/groups", S.AuthMiddleware(http.HandlerFunc(S.GetGroupsHandler)))
	S.mux.HandleFunc("/api/groups/", S.AuthMiddleware(http.HandlerFunc(S.GetGroupHandler)))
	S.mux.HandleFunc("/api/groups/update", S.AuthMiddleware(http.HandlerFunc(S.UpdateGroupHandler)))
	S.mux.HandleFunc("/api/groups/delete/", S.AuthMiddleware(http.HandlerFunc(S.DeleteGroupHandler)))
	S.mux.HandleFunc("/api/groups/join", S.AuthMiddleware(http.HandlerFunc(S.JoinGroupRequestHandler)))
	S.mux.HandleFunc("/api/groups/invite", S.AuthMiddleware(http.HandlerFunc(S.InviteGroupMemberHandler)))
	S.mux.HandleFunc("/api/groups/requests/accept/", S.AuthMiddleware(http.HandlerFunc(S.AcceptGroupRequestHandler)))
	S.mux.HandleFunc("/api/groups/requests/decline/", S.AuthMiddleware(http.HandlerFunc(S.DeclineGroupRequestHandler)))
	S.mux.HandleFunc("/api/groups/requests", S.AuthMiddleware(http.HandlerFunc(S.GetGroupRequestsHandler)))
	S.mux.HandleFunc("/api/groups/posts/create", S.AuthMiddleware(http.HandlerFunc(S.CreateGroupPostHandler)))
	S.mux.HandleFunc("/api/groups/posts/", S.AuthMiddleware(http.HandlerFunc(S.GetGroupPostsHandler)))
	S.mux.HandleFunc("/api/groups/events/create", S.AuthMiddleware(http.HandlerFunc(S.CreateGroupEventHandler)))
	S.mux.HandleFunc("/api/groups/events/", S.AuthMiddleware(http.HandlerFunc(S.GetGroupEventsHandler)))
	S.mux.HandleFunc("/api/groups/events/respond", S.AuthMiddleware(http.HandlerFunc(S.RespondToGroupEventHandler)))
	S.mux.HandleFunc("/api/groups/chat/", S.AuthMiddleware(http.HandlerFunc(S.GetGroupChatHandler)))
	S.mux.HandleFunc("/api/groups/chat/send", S.AuthMiddleware(http.HandlerFunc(S.SendGroupMessageHandler)))
	S.mux.HandleFunc("/api/groups/members/", S.AuthMiddleware(http.HandlerFunc(S.GetGroupMembersHandler)))
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
