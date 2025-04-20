#!/bin/bash
set -e

# Handle signals
trap "kill 0" SIGINT SIGTERM EXIT

# ZAP Configuration
# Memory limits
JAVA_OPTS="-Xmx4096m"
# Thread limits
ZAP_MAX_THREADS=5
# Scan limits
ZAP_SCAN_DELAY=1000 # Delay between requests in milliseconds
ZAP_SCAN_THREADS=2  # Number of threads per scan

# Start ZAP daemon with resource limits
echo "Starting ZAP daemon..."
zap -daemon \
  -host 0.0.0.0 \
  -port 8080 \
  -config api.addrs.addr.name=.* \
  -config api.addrs.addr.regex=true \
  -config api.disablekey=true \
  -config connection.timeoutInSecs=300 \
  -config database.recoverylog=false \
  -config scanner.threadPerHost=${ZAP_SCAN_THREADS} \
  -config scanner.delayInMs=${ZAP_SCAN_DELAY} \
  -config spider.thread=${ZAP_MAX_THREADS} \
  -config ajaxSpider.maxDuration=5 \
  -config ascan.maxScanDurationInMins=30 \
  ${JAVA_OPTS} &
ZAP_PID=$!

# Wait for ZAP to be ready
echo "Waiting for ZAP to start..."
sleep 10

# Start the Node.js application
echo "Starting Node.js application..."
pnpm start &
APP_PID=$!

# Wait for either process to exit
wait $ZAP_PID $APP_PID 