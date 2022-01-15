FROM node:16-alpine3.11

WORKDIR /squadbot

RUN apk add --no-cache tini

COPY package*.json ./
RUN npm ci --no-optional

COPY . .

RUN set -ex; \
    chmod +x wait-for-it.sh;

VOLUME ["/squadbot/node_modules"]

ENTRYPOINT ["tini", "--"]
CMD ["npm", "start"]
