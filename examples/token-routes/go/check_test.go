package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

// Used by ../check.ts: prints the token the handler returns for a fixed test user.
func TestPrintToken(t *testing.T) {
	currentUser = func(r *http.Request) (User, bool) {
		return User{ID: "123", Email: "ada@acme.com", Name: "Ada Lovelace"}, true
	}
	rec := httptest.NewRecorder()
	ticketpingToken(rec, httptest.NewRequest("POST", "/api/ticketping-token", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d: %s", rec.Code, rec.Body.String())
	}
	fmt.Printf("TOKEN=%s\n", rec.Body.String())
}
