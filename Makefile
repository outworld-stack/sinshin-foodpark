# Sinshin FoodPark — monorepo helper commands
# (Windows without make: copy the raw commands from README.md)

.PHONY: setup up dev down restart logs ps be fe migrate psql redis-cli caddy-reload

setup:
	docker network create sinshin_edge 2>/dev/null || true

up: setup
	docker compose --profile dev stop 2>/dev/null || true
	docker compose up --build -d

dev: setup
	docker compose stop web api 2>/dev/null || true
	docker compose --profile dev up --build -d

down:
	docker compose --profile dev down

restart:
	docker compose --profile dev down
	docker compose up --build -d

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

be: setup
	cd apps/api && docker compose up --build -d

fe: setup
	cd apps/web && docker compose up --build -d

migrate:
	cd apps/api && docker compose exec api bun run db:migrate

psql:
	cd apps/api && docker compose exec postgres psql -U sinshin -d sinshin

redis-cli:
	cd apps/api && docker compose exec redis redis-cli

caddy-reload:
	docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile