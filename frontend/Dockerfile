FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY vite.config.ts ./vite.config.ts

EXPOSE 5174

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5174"]
