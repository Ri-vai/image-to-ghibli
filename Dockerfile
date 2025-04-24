FROM node:18-slim AS base
RUN npm install -g pnpm

# Stage 1: Install ALL dependencies for building
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN set -ex && \
    pnpm build && \
    ls -la .next/

# Stage 3: Production server
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p /app/public /app/.next/static

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080
CMD ["node", "server.js"]