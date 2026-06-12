# syntax=docker/dockerfile:1

FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY contracts/package.json contracts/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci

COPY backend backend
COPY contracts contracts
COPY frontend frontend

RUN npm run contracts:build \
  && npm run frontend:generate-api \
  && npm run backend:generate-api \
  && npm -w frontend run build \
  && npm -w backend run build

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY contracts/package.json contracts/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci --omit=dev --workspace backend --include-workspace-root=false \
  && npm cache clean --force

COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/drizzle backend/drizzle
COPY --from=build /app/contracts/generated contracts/generated
COPY --from=build /app/frontend/dist frontend/dist

EXPOSE 10000

CMD ["sh", "-c", "node backend/dist/db/migrate.js && node backend/dist/server.js"]
