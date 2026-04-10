FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/pipeline/package.json ./apps/pipeline/
COPY packages/db/package.json ./packages/db/
COPY packages/queue/package.json ./packages/queue/
COPY packages/validators/package.json ./packages/validators/
COPY packages/email/package.json ./packages/email/
COPY tooling/eslint/package.json ./tooling/eslint/
COPY tooling/prettier/package.json ./tooling/prettier/
COPY tooling/typescript/package.json ./tooling/typescript/
RUN pnpm install --frozen-lockfile

# --- Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 worker && adduser --system --uid 1001 worker

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/pipeline/node_modules ./apps/pipeline/node_modules
COPY --from=deps /app/packages/ ./packages/
COPY --from=deps /app/tooling/ ./tooling/
COPY . .

USER worker
CMD ["node", "--import", "tsx/esm", "apps/pipeline/src/index.ts"]
