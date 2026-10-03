package main

import (
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func ticketpingToken(w http.ResponseWriter, r *http.Request) {
	user, ok := currentUser(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	claims := jwt.MapClaims{"sub": user.ID, "exp": time.Now().Add(5 * time.Minute).Unix()}
	if user.Email != "" {
		claims["email"] = user.Email
	}
	if user.Name != "" {
		claims["name"] = user.Name
	}

	secret := []byte(os.Getenv("TICKETPING_IDENTITY_SECRET"))
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
	if err != nil {
		http.Error(w, "Unable to sign token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte(token))
}
