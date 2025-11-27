package tools

import (
	"encoding/json"
	"net/http"
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

// confert string to int and int to string functions
func StringToInt(s string) int {
	i, err := strconv.Atoi(s)
	if err != nil {
		panic(err)
	}
	return i
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
	s = s[:strings.Index(s, "@")]
	return s
}
