# Dockerfile para Easypanel
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
