# ---- Stage 1: build the Angular app ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# ---- Stage 2: nginx serves the files and proxies /api and /ws ----
FROM nginxinc/nginx-unprivileged:1.27-alpine
USER root
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/active/ /etc/nginx/active/
RUN chown -R nginx:nginx /etc/nginx/active
COPY --from=build /app/dist/frontend/browser/ /usr/share/nginx/html/
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/ > /dev/null || exit 1