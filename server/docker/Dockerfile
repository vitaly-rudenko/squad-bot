# Stage: Install NPM packages
FROM --platform=linux/amd64 node:24-bookworm-slim AS npm_dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage: Runtime
FROM --platform=linux/amd64 node:24-bookworm-slim

RUN apt-get update -y
RUN apt-get install -y build-essential git ffmpeg
RUN apt-get install -y cmake

RUN set -ex; \
  cd /tmp; \
  git clone https://github.com/ggml-org/whisper.cpp.git; \
  cd whisper.cpp; \
  cmake -B build -DBUILD_SHARED_LIBS=OFF; \
  cmake --build build -j --config Release; \
  mv ./build/bin/* /usr/local/bin/; \
  rm -rf /tmp/whisper.cpp

RUN apt-get install -y netcat-openbsd

WORKDIR /app
COPY --from=npm_dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY src src

COPY docker/docker-entrypoint.sh /usr/local/bin/
COPY docker/wait-for /usr/local/bin

USER node

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/app.js"]

