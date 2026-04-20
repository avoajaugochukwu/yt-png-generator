FROM node:22-slim AS base

# ffmpeg + yt-dlp (used by /api/transcribe when the user pastes a YouTube URL)
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app

# All env vars needed at build time for Next.js page data collection
ARG OPENAI_API_KEY
ARG FAL_API_KEY
ARG KINDE_CLIENT_ID
ARG KINDE_CLIENT_SECRET
ARG KINDE_ISSUER_URL
ARG KINDE_SITE_URL
ARG KINDE_POST_LOGOUT_REDIRECT_URL
ARG KINDE_POST_LOGIN_REDIRECT_URL

ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV FAL_API_KEY=$FAL_API_KEY
ENV KINDE_CLIENT_ID=$KINDE_CLIENT_ID
ENV KINDE_CLIENT_SECRET=$KINDE_CLIENT_SECRET
ENV KINDE_ISSUER_URL=$KINDE_ISSUER_URL
ENV KINDE_SITE_URL=$KINDE_SITE_URL
ENV KINDE_POST_LOGOUT_REDIRECT_URL=$KINDE_POST_LOGOUT_REDIRECT_URL
ENV KINDE_POST_LOGIN_REDIRECT_URL=$KINDE_POST_LOGIN_REDIRECT_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
