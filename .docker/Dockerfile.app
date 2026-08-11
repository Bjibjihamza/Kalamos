# Kalamos full application image.
# Builds the React frontend, bundles the Express server, and installs the
# docker CLI so the server can drive the latex compile container via the
# mounted host docker socket.
FROM node:22-alpine AS build
WORKDIR /app

COPY server/package.json server/package-lock.json server/
COPY app/package.json app/package-lock.json app/
RUN npm ci --prefix server && npm ci --prefix app

COPY server server
COPY app app
RUN npm --prefix app run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# docker CLI for `docker exec` into the latex compile container
RUN apk add --no-cache docker-cli

COPY --from=build /app/server/node_modules /app/server/node_modules
COPY --from=build /app/app/dist /app/app/dist
COPY server server
COPY app/package.json app/package.json
COPY templates templates
COPY package.json ./
COPY docker-compose.yml ./

EXPOSE 4000
CMD ["node", "server/src/index.js"]
