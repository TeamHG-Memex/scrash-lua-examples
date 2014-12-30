PORT = 8050
LOGS_DIR = /var/log/auth-proxy


docker-build:
	docker build -t sh-auth-proxy .

run: docker-build
	docker run -d -t -i -p $(PORT):8050 -v $(LOGS_DIR):/app/logs sh-auth-proxy

run-fg: docker-build
	docker run -t -i -p $(PORT):8050 -v $(LOGS_DIR):/app/logs sh-auth-proxy

tests: docker-build
	docker run -t -i -w /app/tests --entrypoint="./run-tests.sh" sh-auth-proxy