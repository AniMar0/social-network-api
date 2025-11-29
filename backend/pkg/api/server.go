package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"SOCIAL-NETWORK/pkg/db/sqlite"
	"bytes"
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/rs/cors"
	"github.com/twinj/uuid"
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
	S.mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))
	S.mux.HandleFunc("/api/upload-file", S.AuthMiddleware(http.HandlerFunc(S.UploadFileHandler)))
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
	S.mux.HandleFunc("/api/get-users/profile/", S.AuthMiddleware(http.HandlerFunc(S.GetUserProfileHandler)))
	S.mux.HandleFunc("/api/make-message/", S.AuthMiddleware(http.HandlerFunc(S.MakeChatHandler)))
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

func (S *Server) UploadFileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		tools.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// user must not be banned
	banned, _ := S.ActionMiddleware(r, http.MethodPost, true, false)
	if banned {
		tools.SendJSONError(w, "You are banned from performing this action", http.StatusForbidden)
		return
	}

	// limit size to 5MB
	const maxUploadSize = 5 << 20
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	// type decides: avatar / post / message / comment
	uploadType := r.FormValue("type")
	if uploadType == "" {
		tools.SendJSONError(w, "Missing upload type", http.StatusBadRequest)
		return
	}

	// all forms will send the file in same key
	file, header, err := r.FormFile("file")
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
