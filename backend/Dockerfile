FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache tzdata

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV TZ=America/Sao_Paulo

EXPOSE 3001

CMD ["node", "dist/server.js"]
