FROM golang:1.24

# Configure apt to retry and use multiple mirrors
RUN echo 'Acquire::Retries "3";' > /etc/apt/apt.conf.d/80-retries && \
    echo 'Acquire::http::Pipeline-Depth "0";' >> /etc/apt/apt.conf.d/80-retries && \
    echo 'Acquire::http::No-Cache=True;' >> /etc/apt/apt.conf.d/80-retries && \
    echo 'Acquire::BrokenProxy=true;' >> /etc/apt/apt.conf.d/80-retries && \
    echo "deb http://mirrors.kernel.org/debian bullseye main\ndeb http://security.debian.org/debian-security bullseye-security main\ndeb http://mirrors.kernel.org/debian bullseye-updates main" > /etc/apt/sources.list

# Install system dependencies with retry mechanism
RUN set -eux; \
    for i in $(seq 1 3); do \
        apt-get update -y --fix-missing && \
        apt-get install -y --fix-missing \
        curl \
        unzip \
        nodejs \
        npm \
        chromium \
        chromium-driver \
        fonts-freefont-ttf \
        ca-certificates \
        python3 \
        python3-pip \
        pipx \
        openjdk-17-jdk \
        python3-dev \
        libxml2-dev \
        libxslt1-dev \
        zlib1g-dev \
        firefox-esr \
        && break || if [ $i -lt 3 ]; then sleep 5; fi; \
    done && \
    rm -rf /var/lib/apt/lists/*

# Install Python packages with pipx
ENV PIPX_HOME=/opt/pipx
ENV PIPX_BIN_DIR=/usr/local/bin
RUN pipx ensurepath && \
    pipx install --pip-args="--no-cache-dir" wapiti3 && \
    pipx inject wapiti3 beautifulsoup4 lxml && \
    ln -sf /usr/local/bin/wapiti /usr/local/bin/wapiti3 && \
    chmod +x /usr/local/bin/wapiti*

# Set Chrome flags for running in container
ENV CHROME_BIN=/usr/bin/chromium \
    CHROME_PATH=/usr/lib/chromium/ \
    CHROMIUM_FLAGS="--no-sandbox --headless --disable-gpu --disable-dev-shm-usage"

# Download and install security tools
RUN set -eux; \
    for i in 1 2 3; do \
    curl -sSfL https://github.com/projectdiscovery/nuclei/releases/download/v3.4.2/nuclei_3.4.2_linux_amd64.zip -o nuclei.zip && \
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
    rm -rf katana.zip /tmp/* && \
    \
    curl -sSfL https://github.com/ffuf/ffuf/releases/download/v2.1.0/ffuf_2.1.0_linux_amd64.tar.gz -o ffuf.tar.gz && \
    tar xzf ffuf.tar.gz -C /tmp && \
    mv /tmp/ffuf /usr/local/bin/ && \
    chmod +x /usr/local/bin/ffuf && \
    rm -rf ffuf.tar.gz /tmp/* && \
    \
    curl -sSfL https://github.com/zaproxy/zaproxy/releases/download/v2.16.1/ZAP_2.16.1_Linux.tar.gz -o zap.tar.gz && \
    tar xzf zap.tar.gz -C /opt && \
    ln -s /opt/ZAP_2.16.1/zap.sh /usr/local/bin/zap && \
    chmod +x /usr/local/bin/zap && \
    rm -rf zap.tar.gz && break; \
    done

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
    mkdir -p /home/node/.ZAP && \
    chown -R node:node /app /home/node /opt/ZAP_2.16.1

# Copy Katana configuration
COPY --chown=node:node config/katana.yaml /home/node/.config/katana/config.yaml

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER node

# Install dependencies
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application code
COPY --chown=node:node . .

# Set production environment
ENV NODE_ENV=production

# Set Java environment variables
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Set entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

