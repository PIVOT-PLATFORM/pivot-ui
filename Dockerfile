# syntax=docker/dockerfile:1
# Dev orchestration: use pivot-platform/compose.yml (includes backend + postgres + redis).
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json .npmrc ./
# EN17.9 — @pivot-platform/collaboratif-ui (npm.pkg.github.com) needs an authenticated `npm
# ci`, unlike ui-core/design-system (built from this repo's own source, never fetched
# remotely). BuildKit secret (never persisted in an image layer, unlike --build-arg) — see the
# calling workflow's `docker buildx build --secret id=npm_token,env=NODE_AUTH_TOKEN`.
RUN --mount=type=secret,id=npm_token,env=NODE_AUTH_TOKEN \
    npm ci --ignore-scripts
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
RUN apk upgrade --no-cache
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
