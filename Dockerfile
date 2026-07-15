# Use the official Bun image
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile

# Copy dependencies and source code
FROM base AS prerelease
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

# Build the frontend (Vite)
ENV NODE_ENV=production
RUN bun run build

# Run stage
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app .

# Expose the port your server listens on (defaulting to 3000)
EXPOSE 3000

# Start the server.ts backend
CMD [ "bun", "run", "server.ts" ]