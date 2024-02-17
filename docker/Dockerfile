FROM node:20-alpine

ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US.UTF-8

WORKDIR /app

RUN apk add --no-cache npm

COPY package*.json .
RUN npm ci --omit=optional

COPY . .

RUN touch .env

RUN set -ex; \
  chmod +x ./docker/wait-for; \
  chmod +x ./docker/entrypoint

EXPOSE 3000

VOLUME /app/files

ENTRYPOINT ["./docker/entrypoint"]
