FROM golang:1.24

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    nodejs \
    npm \
    chromium \
    chromium-driver \
    fonts-freefont-ttf \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set Chrome flags for running in container
ENV CHROME_BIN=/usr/bin/chromium \
    CHROME_PATH=/usr/lib/chromium/ \
    CHROMIUM_FLAGS="--no-sandbox --headless --disable-gpu --disable-dev-shm-usage"

# Download and install binaries
RUN curl -sSfL https://github.com/projectdiscovery/nuclei/releases/download/v3.4.2/nuclei_3.4.2_linux_amd64.zip -o nuclei.zip && \
    unzip nuclei.zip -d /tmp && \
    mv /tmp/nuclei /usr/local/bin/ && \
    chmod +x /usr/local/bin/nuclei && \
    rm -rf nuclei.zip /tmp/* && \
    \
    curl -sSfL https://github.com/projectdiscovery/httpx/releases/download/v1.6.10/httpx_1.6.10_linux_amd64.zip -o httpx.zip && \
    unzip httpx.zip -d /tmp && \
    mv /tmp/httpx /usr/local/bin/ && \
    chmod +x /usr/local/bin/httpx && \
    rm -rf httpx.zip /tmp/* && \
    \
    curl -sSfL https://github.com/projectdiscovery/katana/releases/download/v1.1.2/katana_1.1.2_linux_amd64.zip -o katana.zip && \
    unzip katana.zip -d /tmp && \
    mv /tmp/katana /usr/local/bin/ && \
    chmod +x /usr/local/bin/katana && \
    rm -rf katana.zip /tmp/*

# Update Nuclei templates
RUN nuclei -update-templates

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm

# Create app directory and set up non-root user
WORKDIR /app
RUN useradd -m node && \
    mkdir -p /home/node/.config/katana && \
    mkdir -p /home/node/.cache && \
    chown -R node:node /app /home/node

# Copy Katana configuration
COPY --chown=node:node config/katana.yaml /home/node/.config/katana/config.yaml

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

