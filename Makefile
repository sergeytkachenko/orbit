# Thin wrapper over the docker-compose workflow in install/compose/.
# Run `make` (no target) to see what's available.

COMPOSE_DIR := install/compose
COMPOSE := docker compose -f $(COMPOSE_DIR)/docker-compose.dev.yml -p orbit

.DEFAULT_GOAL := help

.PHONY: help dev watch clean

help: ## Show this help.
	@awk 'BEGIN {FS = ":.*##"; printf "Targets:\n"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Build and start iam + notify via docker compose (detached).
	$(COMPOSE) up --build -d

watch: ## Start services with file sync — nest --watch picks up host edits inside the container.
	$(COMPOSE) up --build --watch

clean: ## Stop containers and remove the compose network + named volumes.
	$(COMPOSE) down --volumes --remove-orphans
