# Use official Node.js light image
FROM node:20-slim AS base
WORKDIR /usr/src/app

# Install dependencies (only copy package.json first to cache layer)
FROM base AS install
COPY package.json package-lock.json* ./
RUN npm install

# Build stage
FROM base AS build
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Production runtime stage
FROM node:20-slim AS release
WORKDIR /usr/src/app

# Copy production node_modules and built output
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY package.json ./

# Expose port 3000 (which is the hardcoded entry point)
EXPOSE 3000

# Start command
ENV NODE_ENV=production
CMD [ "npm", "start" ]
