FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_KIMI_AUTH_URL
ARG VITE_APP_ID
ENV VITE_KIMI_AUTH_URL=$VITE_KIMI_AUTH_URL
ENV VITE_APP_ID=$VITE_APP_ID

RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/boot.js"]
