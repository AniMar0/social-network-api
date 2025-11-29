package tools

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func GetAge(DateOfBirth string) int {
	birthTime, err := time.Parse("2006-01-02T15:04:05.000Z", DateOfBirth)
	if err != nil {
		panic(err)
	}
	now := time.Now()
	age := now.Year() - birthTime.Year()

	return age
}

func CheckPassword(hashedPassword, password string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err
}

func RenderErrorPage(w http.ResponseWriter, r *http.Request, errMsg string, errCode int) {
	http.ServeFile(w, r, "./static/index.html")
}

func SendJSONError(w http.ResponseWriter, errMsg string, errCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(errCode)
	json.NewEncoder(w).Encode(map[string]string{"error": errMsg})
}

func GetTheExtension(fileName string) string {
	ext := ""
	for i := len(fileName) - 1; i >= 0; i-- {
		if fileName[i] == '.' {
			ext = fileName[i:]
			break
		}
	}
	return ext
}

func IntToString(i int) string {
	s := strconv.Itoa(i)
	return s
}

// convert email to lowercase
func ToLower(s string) string {
	s = strings.ToLower(s)
	return s
}

// convert email to username without domain
func ToUsername(s string) string {
	s = s[:strings.Index(s, "@")] + strconv.Itoa(int(time.Now().Unix()))
	return s
}

func ContainsHTML(body string) bool {
	htmlRegex := regexp.MustCompile(`(?i)<\/?\w+[\s\S]*?>`)
	return htmlRegex.MatchString(body)
}

func IsNumeric(s string) (bool, int) {
	num, err := strconv.Atoi(s)
	if err != nil {
		return false, 0
	}
	return true, num
}