# syntax=docker/dockerfile:1
# Dev orchestration: use pivot-platform/compose.yml (includes backend + postgres + redis).
FROM node:24-alpine AS builder
WORKDIR /app
# .npmrc copied alongside package*.json (before `npm ci`, not after) — EN17.10 made
# @pivot-platform/collaboratif-ui a real dependency on the private GitHub Packages registry,
# so the registry mapping must already be in place for this RUN step, not just for later COPY . .
COPY package*.json .npmrc ./
# BuildKit secret, never a --build-arg (would leak the token into the image history/cache).
# Callers: `docker buildx build --secret id=npm_token,env=NODE_AUTH_TOKEN ...` (see
# pr-checks.yml / release.yml) with NODE_AUTH_TOKEN=${{ secrets.GITHUB_TOKEN }} in the job env.
RUN --mount=type=secret,id=npm_token,env=NODE_AUTH_TOKEN npm ci --ignore-scripts
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
RUN apk upgrade --no-cache
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
