# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/api-server.mjs ./api-server.mjs
COPY --from=builder /app/db ./db
COPY --from=builder /app/.env.example ./

EXPOSE 3000
ENV PORT=3000
ENV API_PORT=3002
ENV VITE_API_BASE=/api

CMD ["node", "server.mjs"]
