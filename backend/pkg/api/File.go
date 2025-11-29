package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/twinj/uuid"
)

func (S *Server) UploadFileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		tools.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// limit size to 5MB
	const maxUploadSize = 5 << 20
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	// type decides: avatar / post / message / comment / avatar-change
	uploadType := r.FormValue("type")
	if uploadType == "" {
		tools.SendJSONError(w, "Missing upload type", http.StatusBadRequest)
		return
	}

	if uploadType != "avatar" {
		_, _, err := S.CheckSession(r)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
	}

	// all forms will send the file in same key
	file, _, err := r.FormFile("file")
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
