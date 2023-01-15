FROM node:16-alpine3.12

ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US.UTF-8

WORKDIR /app

RUN apk add --no-cache npm

COPY package*.json .
RUN npm ci --no-optional

COPY . .

RUN set -ex; \
  chmod +x ./docker/wait-for; \
  chmod +x ./docker/entrypoint

ENTRYPOINT ["./docker/entrypoint"]
