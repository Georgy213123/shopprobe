# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
# rewrites для /api попадают в манифест при сборке, поэтому адрес API нужен здесь, а не в рантайме.
ARG API_URL=http://backend:8201
ENV API_URL=$API_URL NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 8080
CMD ["node", "server.js"]
