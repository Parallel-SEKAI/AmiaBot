FROM node:25-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
CMD ["pnpm", "start"]
