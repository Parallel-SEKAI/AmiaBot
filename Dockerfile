FROM node:25-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg
RUN npm install -g pnpm@8
RUN pnpm config set ignore-scripts false
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install
COPY . .
RUN pnpm run build
CMD ["pnpm", "start"]
