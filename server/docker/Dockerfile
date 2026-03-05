# Stage: npm install
FROM --platform=linux/amd64 node:24-bookworm-slim AS npm_dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage: whisper.cpp
FROM --platform=linux/amd64 node:24-bookworm-slim AS whisper_cpp

RUN apt-get update -y \
 && apt-get install -y build-essential git cmake

WORKDIR /app
RUN git clone https://github.com/ggerganov/whisper.cpp.git -b v1.8.3 --depth 1 \
 && cd whisper.cpp \
 && make

# Stage: runtime
FROM --platform=linux/amd64 node:24-bookworm-slim

RUN apt-get update -y \
 && apt-get install -y ffmpeg netcat-openbsd

COPY --from=whisper_cpp /app/whisper.cpp/build/bin/whisper-cli /usr/local/bin
COPY --from=whisper_cpp /app/whisper.cpp/build/src/libwhisper.so.1 /usr/local/lib/
COPY --from=whisper_cpp /app/whisper.cpp/build/ggml/src/libggml.so.0 /usr/local/lib/
COPY --from=whisper_cpp /app/whisper.cpp/build/ggml/src/libggml-base.so.0 /usr/local/lib/
COPY --from=whisper_cpp /app/whisper.cpp/build/ggml/src/libggml-cpu.so.0 /usr/local/lib/
RUN ldconfig

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

