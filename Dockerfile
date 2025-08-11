# ✅ DOCKERFILE OPTIMIZADO PARA RAILWAY - HEALTH CHECK MEJORADO
FROM node:18-alpine

# Metadatos
LABEL name="producciones-saavedra"
LABEL version="1.0.0"

# ✅ INSTALACIÓN MÍNIMA Y EFICIENTE
RUN apk update && apk add --no-cache curl

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# ✅ OPTIMIZACIÓN: Copiar solo package.json primero para mejor cache
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# ✅ CONFIGURAR NPM PARA VELOCIDAD
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 3 && \
    npm config set fetch-retry-factor 10 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 60000 && \
    npm config set progress false && \
    npm config set loglevel error

# ✅ INSTALAR SOLO DEPENDENCIAS DE PRODUCCIÓN DEL BACKEND
WORKDIR /app/backend
RUN npm ci --only=production --silent --no-audit --no-fund

# ✅ INSTALAR DEPENDENCIAS DEL FRONTEND (INCLUYE DEVDEPS PARA BUILD)
WORKDIR /app/frontend
RUN npm ci --silent --no-audit --no-fund

# ✅ COPIAR CÓDIGO FUENTE
WORKDIR /app
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY package.json ./

# ✅ BUILD DEL FRONTEND
WORKDIR /app/frontend
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ✅ LIMPIAR DEVDEPENDENCIES DEL FRONTEND DESPUÉS DEL BUILD
RUN npm prune --production --silent

# ✅ CONFIGURACIÓN FINAL
WORKDIR /app
RUN chown -R nodejs:nodejs /app
USER nodejs

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=5000
ENV NEXT_TELEMETRY_DISABLED=1

# Exponer puerto
EXPOSE 5000

# ✅ HEALTH CHECK MEJORADO CON MÁS TIEMPO
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:5000/api/health || curl -f http://localhost:5000/health || exit 1

# ✅ COMANDO DE INICIO - SOLO BACKEND EN RAILWAY
CMD ["node", "backend/src/server.js"]