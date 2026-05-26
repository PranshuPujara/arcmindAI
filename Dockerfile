FROM node:22-alpine
WORKDIR /app

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm prisma generate

EXPOSE 3000
CMD ["sh", "-c", "pnpm prisma:push && pnpm dev"]
