# Sinshin FoodPark — monorepo helper commands
# (Windows without make: copy the raw commands from README.md)

.PHONY: setup up dev down restart logs ps be fe migrate psql redis-cli caddy-reload

setup: ## one-time: create the shared edge network
    docker network create sinshin_edge 2>/dev/null || true

up: setup ## full stack, prod-like (live-server simulation)
    docker compose --profile dev stop 2>/dev/null || true # never mix dev+prod variants
    docker compose up --build -d

dev: setup ## full stack with hot-reload (vite dev + bun --hot)
    docker compose stop web api 2>/dev/null || true # dev containers take over the edge aliases
    docker compose --profile dev up --build -d

down: ## stop everything (add -v to also wipe DB/Redis data)
    docker compose --profile dev down

restart:
    docker compose --profile dev down
    docker compose up --build -d

logs: ## follow all logs
    docker compose logs -f --tail=100

ps:
    docker compose ps

be: setup ## backend layer only (api + postgres + redis)
    cd apps/api && docker compose up --build -d

fe: setup ## frontend layer only
    cd apps/web && docker compose up --build -d

migrate: ## run drizzle migrations inside the api container
    cd apps/api && docker compose exec api bun run db:migrate

psql: ## postgres shell
    cd apps/api && docker compose exec postgres psql -U sinshin -d sinshin

redis-cli: ## redis shell
    cd apps/api && docker compose exec redis redis-cli

caddy-reload: ## reload Caddyfile without downtime
    docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile