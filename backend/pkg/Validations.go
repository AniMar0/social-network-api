package tools

import (
	"path/filepath"
	"regexp"
	"strings"
	"unicode"
)

// IsValidEmail validates email format
func IsValidEmail(email string) bool {
	email = strings.TrimSpace(email)
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// IsValidPassword checks password strength (min 8 chars, uppercase, lowercase, number)
func IsValidPassword(password string) bool {
	password = strings.TrimSpace(password)
	if len(password) < 8 {
		return false
	}
	var hasUpper, hasLower, hasNumber bool
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		}
	}
	return hasUpper && hasLower && hasNumber
}

// IsValidTextLength validates text length within min and max limits
func IsValidTextLength(text string, min, max int) bool {
	text = strings.TrimSpace(text)
	length := len(text)
	return length >= min && length <= max
}

// IsValidAge validates age range
func IsValidAge(age int) bool {
	return age >= 13 && age <= 120
}

// AvatarFiles is Found in the uploads folder
func AvatarFiles(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	allowedExtensions := []string{".jpg", ".jpeg", ".png", ".gif"}
	for _, allowedExt := range allowedExtensions {
		if ext == allowedExt {
			return true
		}
	}
	return false
}
