# syntax=docker/dockerfile:1.7

# --- Build: typecheck and bundle the SPA. ---
FROM node:22-alpine AS build
WORKDIR /src

# Cypress binary is only for E2E; skip the download.
ENV CYPRESS_INSTALL_BINARY=0
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# --- Runtime: unprivileged nginx (uid 101) serving dist/ and proxying /api. ---
FROM nginxinc/nginx-unprivileged:1.30-alpine

# BACKEND_URL: backend Cloud Run URL, e.g. https://vista-backend-xxxx.run.app
ENV BACKEND_URL=http://localhost:8081 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

COPY --chown=nginx:nginx nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chown=nginx:nginx --from=build /src/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080
