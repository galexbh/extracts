# ========================
# 🏗️ Etapa 1: Build Frontend
# ========================
FROM node:20 AS build-stage

WORKDIR /app

# Copiar configuración de dependencias y código
COPY package*.json ./
RUN npm install

COPY . .

# Construir la app React especificando que la API estará en la ruta relativa /api
# Esto asegura que el frontend busque al backend en el mismo dominio
ENV REACT_APP_API_URL=/api
RUN npm run build

# ========================
# 🚀 Etapa 2: Production Server
# ========================
FROM node:20-alpine

WORKDIR /app

# Copiar solo el package.json para instalar deps de producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar código del backend
COPY src ./src

# Copiar el build del frontend de la etapa anterior
COPY --from=build-stage /app/build ./build

# Exponer el puerto
EXPOSE 4000

ENV PORT=4000
CMD ["node", "src/server.js"]