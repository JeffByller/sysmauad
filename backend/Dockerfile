FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

RUN (apk add --no-cache tzdata postgresql16-client || apk add --no-cache tzdata postgresql-client) \
    && apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont font-noto-emoji

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV TZ=America/Sao_Paulo
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 3001

CMD ["node", "dist/server.js"]
