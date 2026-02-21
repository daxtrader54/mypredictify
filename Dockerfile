FROM node:20-alpine AS base

# --- deps: production dependencies only ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- builder: full build ---
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runner: minimal production image ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy data directory (gameweek data, memory, config)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# Copy scripts directory (pipeline scripts)
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Install tsx for running TypeScript scripts in production
RUN npm install -g tsx

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
