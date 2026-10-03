package main

import (
	"log"
	"net/http"
)

type User struct {
	ID    string
	Email string
	Name  string
}

// Stands in for your app's session lookup.
var currentUser = func(r *http.Request) (User, bool) {
	return User{}, false
}

func main() {
	http.HandleFunc("POST /api/ticketping-token", ticketpingToken)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
