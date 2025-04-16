# Build stage for Go tools
FROM golang:1.22-alpine AS go-builder

# Install build dependencies
RUN apk add --no-cache git

# Install Nuclei
RUN go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Final stage
FROM node:22-alpine

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Copy Nuclei from Go build stage
COPY --from=go-builder /go/bin/nuclei /usr/local/bin/

# Create app directory and set permissions
WORKDIR /app
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Install dependencies
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application code
COPY --chown=node:node . .

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["pnpm", "start"]

