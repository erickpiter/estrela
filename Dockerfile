# Stage 1: Build Frontend (React)
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build Backend/Worker (Node)
FROM node:18-alpine AS backend-builder
WORKDIR /app
COPY worker/package*.json ./
RUN npm install
COPY worker/tsconfig.json ./
# Make sure tsconfig is copied if exists, otherwise handled by simple compilation or if source is just .ts
COPY worker/ .
RUN npm run build

# Stage 3: Final Production Image
FROM node:18-alpine
WORKDIR /app

# Install production dependencies for the server
COPY worker/package*.json ./
RUN npm install --production

# Copy built frontend static files
COPY --from=frontend-builder /app/dist ./dist

# Copy built backend code
COPY --from=backend-builder /app/dist ./worker-dist

# Set timezone
ENV TZ=America/Sao_Paulo
RUN apk add --no-cache tzdata

# Expose port 80
EXPOSE 80
ENV PORT=80

# Run the server (which serves frontend AND runs automation)
CMD ["node", "worker-dist/index.js"]
