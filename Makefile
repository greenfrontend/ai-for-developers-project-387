.PHONY: compile check postgres-up db-migrate e2e e2e-headed e2e-ui e2e-debug

compile:
	npm run contracts:build
	npm run frontend:generate-api

check:
	npm run contracts:build
	npm run frontend:generate-api
	npm run backend:generate-api
	npm run frontend:build
	npm run backend:build

postgres-up:
	docker compose up -d --wait postgres

db-migrate: postgres-up
	npm run backend:db:migrate

e2e: db-migrate
	npm run test:e2e

e2e-headed: db-migrate
	PLAYWRIGHT_SLOW_MO=500 npm run test:e2e -- --headed --project=chromium

e2e-ui: db-migrate
	npm run test:e2e:ui

e2e-debug: db-migrate
	PWDEBUG=1 PLAYWRIGHT_SLOW_MO=300 npm run test:e2e -- --headed --project=chromium
