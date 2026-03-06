# Stage: npm install
FROM --platform=linux/amd64 node:24-bookworm-slim AS npm_dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage: runtime
FROM --platform=linux/amd64 node:24-bookworm-slim

RUN apt-get update -y \
 && apt-get install -y netcat-openbsd

WORKDIR /app
COPY --from=npm_dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY src src
COPY migrations migrations

COPY docker/docker-entrypoint.sh /usr/local/bin/
COPY docker/wait-for /usr/local/bin

USER node

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/app.js"]
