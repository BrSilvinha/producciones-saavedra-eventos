# ✅ DOCKERFILE CORREGIDO PARA RAILWAY
FROM node:18-alpine AS base

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

WORKDIR /app

# Copiar archivos de configuración raíz
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# ============================================
# STAGE 1: Instalar todas las dependencias
# ============================================
FROM base AS deps

# Instalar dependencias raíz
RUN npm ci --ignore-scripts

# Instalar dependencias del backend (solo producción)
WORKDIR /app/backend
RUN npm ci --only=production --ignore-scripts

# Instalar TODAS las dependencias del frontend (incluye devDependencies para build)
WORKDIR /app/frontend
RUN npm ci --ignore-scripts

# ============================================
# STAGE 2: Build del frontend
# ============================================
FROM base AS frontend-builder

WORKDIR /app

# Copiar dependencias ya instaladas (TODAS las dependencias del frontend)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

# Copiar archivos de configuración del frontend
COPY frontend/package*.json ./frontend/
COPY frontend/tailwind.config.js ./frontend/
COPY frontend/postcss.config.js ./frontend/
COPY frontend/next.config.js ./frontend/
COPY frontend/tsconfig.json ./frontend/
COPY frontend/.eslintrc.json ./frontend/
COPY frontend/.prettierrc ./frontend/

# Copiar código fuente del frontend
COPY frontend/src/ ./frontend/src/
COPY frontend/public/ ./frontend/public/

# Variables de entorno para el build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Debug: Verificar que las dependencias estén instaladas
WORKDIR /app/frontend
RUN echo "📦 Verificando dependencias de Tailwind..." && \
    ls -la node_modules/@tailwindcss/ || echo "❌ @tailwindcss no encontrado" && \
    npm list @tailwindcss/forms || echo "❌ @tailwindcss/forms no encontrado"

# Build del frontend
RUN npm run build

# ============================================
# STAGE 3: Imagen final de producción
# ============================================
FROM node:18-alpine AS production

# Metadatos
LABEL name="producciones-saavedra"
LABEL version="1.0.0"

# Instalar dependencias de runtime
RUN apk add --no-cache \
    postgresql-client \
    curl

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

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

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Comando de inicio - Solo backend en Railway
CMD ["node", "backend/src/server.js"]