# ✅ DOCKERFILE RESILIENTE A PROBLEMAS DE RED
FROM node:18-alpine AS base

# ✅ INSTALACIÓN MÁS RESILIENTE DE DEPENDENCIAS DEL SISTEMA
RUN apk update && \
    apk add --no-cache --retry 3 \
        python3 \
        make \
        g++ && \
    # Instalar PostgreSQL client por separado con reintentos
    apk add --no-cache --retry 3 postgresql-client || \
    (sleep 5 && apk add --no-cache postgresql-client) && \
    # Instalar curl por separado con reintentos  
    apk add --no-cache --retry 3 curl || \
    (sleep 5 && apk add --no-cache curl)

WORKDIR /app

# Copiar archivos de configuración raíz
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# ============================================
# STAGE 1: Instalar todas las dependencias
# ============================================
FROM base AS deps

# Configurar NPM para ser más resiliente
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-factor 2 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 60000

# Instalar dependencias raíz
RUN npm ci --ignore-scripts || \
    (echo "Retry installing root dependencies..." && sleep 10 && npm ci --ignore-scripts)

# Instalar dependencias del backend (solo producción)
WORKDIR /app/backend
RUN npm ci --only=production --ignore-scripts || \
    (echo "Retry installing backend dependencies..." && sleep 10 && npm ci --only=production --ignore-scripts)

# Instalar TODAS las dependencias del frontend (incluye devDependencies para build)
WORKDIR /app/frontend
RUN npm ci --ignore-scripts || \
    (echo "Retry installing frontend dependencies..." && sleep 10 && npm ci --ignore-scripts)

# ============================================
# STAGE 2: Build del frontend
# ============================================
FROM base AS frontend-builder

WORKDIR /app

# Copiar dependencias ya instaladas
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

# Copiar archivos de configuración del frontend
COPY frontend/package*.json ./frontend/
COPY frontend/tailwind.config.js ./frontend/
COPY frontend/postcss.config.js ./frontend/
COPY frontend/next.config.js ./frontend/
COPY frontend/tsconfig.json ./frontend/

# Copiar código fuente del frontend
COPY frontend/src/ ./frontend/src/
COPY frontend/public/ ./frontend/public/

# Variables de entorno para el build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build del frontend con reintentos
WORKDIR /app/frontend
RUN npm run build || \
    (echo "Retry building frontend..." && sleep 5 && npm run build)

# ============================================
# STAGE 3: Imagen final de producción 
# ============================================
FROM node:18-alpine AS production

# Metadatos
LABEL name="producciones-saavedra"
LABEL version="1.0.0"

# ✅ INSTALACIÓN MÍNIMA Y RESILIENTE DE RUNTIME
RUN apk update && \
    apk add --no-cache --retry 3 curl || \
    (sleep 5 && apk add --no-cache curl)

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# Copiar dependencias de producción del backend
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules

# Copiar código del backend
COPY --chown=nodejs:nodejs backend/ ./backend/

# Copiar build del frontend (solo lo necesario)
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/public ./frontend/public
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/package.json ./frontend/package.json
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/next.config.js ./frontend/next.config.js

# Copiar archivos de configuración raíz
COPY --chown=nodejs:nodejs package.json ./

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=5000
ENV NEXT_TELEMETRY_DISABLED=1

# Crear directorio para logs
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 5000

# Health check simplificado (sin curl si falla la instalación)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || \
        wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || \
        exit 1

# Comando de inicio - Solo backend en Railway
CMD ["node", "backend/src/server.js"]