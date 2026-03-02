# Deployment Guide

**Version:** 2.0.0  
**Date:** 2026-03-02

---

## 📋 Table of Contents

- [Deployment Overview](#deployment-overview)
- [Local Production](#local-production)
- [Server Deployment](#server-deployment)
- [Docker Deployment](#docker-deployment)
- [Multi-Agent Setup](#multi-agent-setup)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)
- [Scaling](#scaling)

---

## Deployment Overview

**Memphis is local-first:**
- ✅ No cloud required
- ✅ No database server
- ✅ No external dependencies (except optional LLM provider)

**Deployment modes:**

| Mode | Use Case | Complexity |
|------|----------|------------|
| **Local Production** | Single user | Low |
| **Server** | Remote access | Medium |
| **Docker** | Easy deployment | Medium |
| **Multi-Agent** | Team sync | High |

---

## Local Production

### Setup Production Instance

```bash
# 1. Install dependencies
cd memphis
npm ci --production

# 2. Build
npm run build

# 3. Initialize
node dist/cli/index.js init

# 4. Setup provider (Ollama recommended)
ollama serve
ollama pull qwen2.5-coder:3b
ollama pull nomic-embed-text

# 5. Verify
node dist/cli/index.js doctor
```

---

### Systemd Service (Linux)

```bash
# Create service file
sudo nano /etc/systemd/system/memphis-daemon.service
```

**Content:**
```ini
[Unit]
Description=Memphis Cognitive Engine Daemon
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/home/yourusername/memphis
ExecStart=/usr/bin/node dist/cli/index.js daemon start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable memphis-daemon
sudo systemctl start memphis-daemon

# Check status
sudo systemctl status memphis-daemon
```

---

### LaunchAgent (macOS)

```bash
# Create plist
nano ~/Library/LaunchAgents/com.memphis.daemon.plist
```

**Content:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.memphis.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/yourname/memphis/dist/cli/index.js</string>
        <string>daemon</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

**Load:**
```bash
launchctl load ~/Library/LaunchAgents/com.memphis.daemon.plist
```

---

## Server Deployment

### Prerequisites

- Linux server (Ubuntu 22.04+ recommended)
- 2GB RAM minimum
- 10GB disk space
- Node.js 20+
- Ollama (if using local LLM)

---

### Step-by-Step

**1. SSH into server:**
```bash
ssh user@yourserver.com
```

**2. Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**3. Install Git:**
```bash
sudo apt-get install -y git
```

**4. Clone Memphis:**
```bash
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis
```

**5. Install & Build:**
```bash
npm ci --production
npm run build
```

**6. Install Ollama:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5-coder:3b
ollama pull nomic-embed-text
```

**7. Initialize:**
```bash
node dist/cli/index.js init
```

**8. Setup Systemd:**
```bash
sudo nano /etc/systemd/system/memphis.service
```

**9. Enable:**
```bash
sudo systemctl enable memphis
sudo systemctl start memphis
```

**10. Verify:**
```bash
node dist/cli/index.js doctor
```

---

### Nginx Proxy (Optional)

```nginx
# /etc/nginx/sites-available/memphis
server {
    listen 80;
    server_name memphis.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable:**
```bash
sudo ln -s /etc/nginx/sites-available/memphis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Docker Deployment

### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-slim

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build
RUN npm run build

# Create data directory
RUN mkdir -p /root/.memphis

# Expose port (if using API)
EXPOSE 3000

# Start daemon
CMD ["node", "dist/cli/index.js", "daemon", "start"]
```

---

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  memphis:
    build: .
    container_name: memphis
    restart: unless-stopped
    volumes:
      - memphis-data:/root/.memphis
      - ollama-data:/root/.ollama
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production

volumes:
  memphis-data:
  ollama-data:
```

---

### Build & Run

```bash
# Build
docker build -t memphis:2.0.0 .

# Run
docker run -d \
  --name memphis \
  -v memphis-data:/root/.memphis \
  -p 3000:3000 \
  memphis:2.0.0

# Or with docker-compose
docker-compose up -d
```

---

### Docker Commands

```bash
# View logs
docker logs memphis -f

# Execute command
docker exec memphis node dist/cli/index.js doctor

# Stop
docker stop memphis

# Remove
docker rm memphis

# Backup
docker cp memphis:/root/.memphis ./backup
```

---

## Multi-Agent Setup

### Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Agent A   │◄───────►│    IPFS     │◄───────►│   Agent B   │
│  (Laptop)   │         │   (Pinata)  │         │  (Desktop)  │
└─────────────┘         └─────────────┘         └─────────────┘
```

---

### Setup Agent A (Gateway)

**1. Initialize:**
```bash
memphis init
```

**2. Configure IPFS:**
```yaml
# ~/.memphis/config.yaml
share:
  enabled: true
  mode: gateway
  ipfs:
    gateway: https://gateway.pinata.cloud
  pinata:
    api_key: your_key
    secret: your_secret
```

**3. Start daemon:**
```bash
memphis daemon start
```

**4. Push to IPFS:**
```bash
memphis share-sync --push
```

---

### Setup Agent B (Client)

**1. Initialize:**
```bash
memphis init
```

**2. Configure IPFS:**
```yaml
# ~/.memphis/config.yaml
share:
  enabled: true
  mode: client
  gateway_did: did:memphis:agent-a
```

**3. Pull from Agent A:**
```bash
memphis share-sync --pull
```

---

### Sync Schedule

```bash
# Crontab for Agent A (push every hour)
crontab -e
# Add: 0 * * * * memphis share-sync --push

# Crontab for Agent B (pull every hour)
crontab -e
# Add: 0 * * * * memphis share-sync --pull
```

---

## Monitoring

### Health Check Script

```bash
# scripts/health-check.sh
#!/bin/bash

echo "Memphis Health Check"
echo "===================="

# Check daemon
if pgrep -f "memphis daemon" > /dev/null; then
  echo "✓ Daemon running"
else
  echo "✗ Daemon not running"
fi

# Check Ollama
if curl -s http://localhost:11434/api/tags > /dev/null; then
  echo "✓ Ollama responding"
else
  echo "✗ Ollama not responding"
fi

# Check disk space
DISK_USAGE=$(df -h ~/.memphis | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 90 ]; then
  echo "✓ Disk usage: ${DISK_USAGE}%"
else
  echo "⚠ Disk usage: ${DISK_USAGE}%"
fi

# Check chain health
memphis doctor > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✓ Chains healthy"
else
  echo "✗ Chain issues detected"
fi
```

---

### Log Monitoring

```bash
# View daemon logs
tail -f ~/.memphis/daemon.log

# Search for errors
grep -i error ~/.memphis/daemon.log

# Count errors today
grep "$(date +%Y-%m-%d)" ~/.memphis/daemon.log | grep -i error | wc -l
```

---

### Prometheus Metrics (Planned)

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'memphis'
    static_configs:
      - targets: ['localhost:9090']
```

**Metrics exposed:**
- `memphis_blocks_total`
- `memphis_decisions_active`
- `memphis_predictions_accuracy`
- `memphis_daemon_uptime_seconds`

---

## Backup & Recovery

### Automated Backup

```bash
# scripts/backup.sh
#!/bin/bash

BACKUP_DIR=~/memphis-backups
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Backup chains
tar -czf $BACKUP_DIR/chains-$DATE.tar.gz ~/.memphis/chains

# Backup config
cp ~/.memphis/config.yaml $BACKUP_DIR/config-$DATE.yaml

# Backup patterns
cp ~/.memphis/patterns.json $BACKUP_DIR/patterns-$DATE.json

# Backup embeddings
tar -czf $BACKUP_DIR/embeddings-$DATE.tar.gz ~/.memphis/embeddings

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.yaml" -mtime +7 -delete
find $BACKUP_DIR -name "*.json" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Cron job:**
```bash
crontab -e
# Add: 0 2 * * * ~/memphis/scripts/backup.sh >> ~/memphis-backups/backup.log 2>&1
```

---

### Recovery

```bash
# Stop daemon
memphis daemon stop

# Restore chains
tar -xzf ~/memphis-backups/chains-20260302-020000.tar.gz -C ~/

# Restore config
cp ~/memphis-backups/config-20260302-020000.yaml ~/.memphis/config.yaml

# Restore patterns
cp ~/memphis-backups/patterns-20260302-020000.json ~/.memphis/patterns.json

# Verify
memphis doctor

# Start daemon
memphis daemon start
```

---

### Vault Recovery

```bash
# If you have 24-word seed
memphis vault recover --seed "word1 word2 ... word24"

# Verify
memphis vault list
```

---

## Scaling

### Horizontal Scaling (Multi-Agent)

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Agent 1 │────►│ Agent 2 │────►│ Agent 3 │
└─────────┘     └─────────┘     └─────────┘
     │               │               │
     └───────────────┴───────────────┘
                     │
                ┌────▼────┐
                │  IPFS   │
                │ Cluster │
                └─────────┘
```

**Benefits:**
- Distributed workload
- Redundancy
- Team collaboration

---

### Vertical Scaling

**Increase resources:**
```bash
# More memory for large chains
export NODE_OPTIONS="--max-old-space-size=8192"

# More CPU cores
# (Node.js handles automatically)
```

---

### Performance Tuning

```yaml
# ~/.memphis/config.yaml
performance:
  cache_size: 10000        # Increase cache
  batch_size: 100          # Batch operations
  embeddings_workers: 4    # Parallel embedding
```

---

## Security Considerations

### File Permissions

```bash
# Secure data directory
chmod 700 ~/.memphis
chmod 600 ~/.memphis/config.yaml
chmod 600 ~/.memphis/vault/*
```

---

### Network Security

```bash
# If using API, restrict access
# Only allow localhost
bind_address: "127.0.0.1"

# Or use firewall
sudo ufw allow from 192.168.1.0/24 to any port 3000
```

---

### API Authentication (If Exposed)

```yaml
# ~/.memphis/config.yaml
api:
  enabled: true
  auth:
    type: bearer
    secret: your-secret-key
```

---

## Updates

### Update Process

```bash
# 1. Backup
./scripts/backup.sh

# 2. Pull latest
git pull origin master

# 3. Install
npm ci --production

# 4. Rebuild
npm run build

# 5. Stop daemon
sudo systemctl stop memphis-daemon

# 6. Migrate (if needed)
node dist/cli/index.js migrate

# 7. Start daemon
sudo systemctl start memphis-daemon

# 8. Verify
node dist/cli/index.js doctor
```

---

**Deployment Guide Version:** 2.0.0  
**Last Updated:** 2026-03-02
