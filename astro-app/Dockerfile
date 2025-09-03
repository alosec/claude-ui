# Use Node.js LTS as base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Build the Astro application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 astro
RUN adduser --system --uid 1001 astro

# Copy built application
COPY --from=builder --chown=astro:astro /app/dist ./dist
COPY --from=deps --chown=astro:astro /app/node_modules ./node_modules
COPY --from=builder --chown=astro:astro /app/package.json ./package.json

USER astro

EXPOSE 4321

ENV HOST=0.0.0.0
ENV PORT=4321

# Start the application
CMD ["node", "./dist/server/entry.mjs"]