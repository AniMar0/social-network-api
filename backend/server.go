package main

import backend "SOCIAL-NETWORK/pkg/api"

func main() {
	var server backend.Server
	server.Run("8080")
}
