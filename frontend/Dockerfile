FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine AS runner

RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo

COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8000

# Nginx static serving configuration for port 8000 inside frontend container
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

