FROM nginx:alpine

ARG DOMAIN
ARG SUBDOMAIN
ARG APP_URL

WORKDIR /website

RUN set -ex; \
  mkdir -p nginx; \
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > nginx/options-ssl-nginx.conf; \
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > nginx/ssl-dhparams.pem;

RUN rm -f /etc/nginx/conf.d/default.conf
COPY ./templates ./templates

RUN set -ex; \
  mkdir -p /etc/nginx/templates; \
  envsubst < ./templates/default.conf.template > /etc/nginx/templates/default.conf.template

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
