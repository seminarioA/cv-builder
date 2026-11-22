# La imagen se construye en GitHub Actions y se publica en GHCR (ghcr.io/seminarioa/cv-builder).
# El VPS nunca ejecuta docker build: solo hace pull de una etiqueta ya probada.

FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:22-alpine AS compilacion
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS ejecucion
WORKDIR /app
ARG GIT_SHA=local
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    GIT_SHA=$GIT_SHA
LABEL org.opencontainers.image.source="https://github.com/seminarioA/cv-builder" \
      org.opencontainers.image.description="CV builder de Los Andes Labs" \
      org.opencontainers.image.revision=$GIT_SHA
COPY --from=compilacion --chown=node:node /app/.next/standalone ./
COPY --from=compilacion --chown=node:node /app/.next/static ./.next/static
COPY --from=compilacion --chown=node:node /app/public ./public
# db.ts lee el esquema del disco al arrancar.
COPY --from=compilacion --chown=node:node /app/src/lib/servidor/esquema.sql ./src/lib/servidor/esquema.sql
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/cv-builder/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
