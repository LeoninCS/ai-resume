package main

import (
	"log"
	"os"

	"ai-resume-backend/internal/api"
)

func main() {
	addr := getenv("APP_ADDR", ":8081")
	router := api.NewRouter()

	log.Printf("ai-resume backend listening on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatal(err)
	}
}

func getenv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
