#!/bin/bash
#
# MorseFleet Production Deployment Script
# Deploys to Synology NAS via SSH, served through Cloudflare tunnel
#
# Usage:
#   ./deploy-production.sh           # Normal deployment
#   ./deploy-production.sh --rebuild # Force rebuild without cache
#
# Prerequisites:
#   - SSH key authentication to Synology
#   - Docker installed on Synology
#   - Cloudflare tunnel configured for morsefleet.oeradio.at
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env.production" ]; then
    source "$SCRIPT_DIR/.env.production"
else
    echo -e "${RED}Error: .env.production not found${NC}"
    exit 1
fi

# Parse arguments
REBUILD_FLAG=""
if [ "$1" == "--rebuild" ]; then
    REBUILD_FLAG="--no-cache"
    echo -e "${YELLOW}Rebuild mode: Docker cache will be ignored${NC}"
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           MorseFleet Production Deployment                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Target: ${GREEN}${SYNOLOGY_HOST}${NC}"
echo -e "Remote: ${GREEN}${REMOTE_DIR}${NC}"
echo -e "URL:    ${GREEN}${SITE_URL}${NC}"
echo ""

# ============================================================================
# Step 1: Ensure local changes are committed and pushed
# ============================================================================
echo -e "${BLUE}[1/4] Checking local git status...${NC}"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
    git status --short
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

# Get current branch and remote
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "Branch: ${GREEN}${CURRENT_BRANCH}${NC}"

# ============================================================================
# Step 2: Pull or clone on Synology
# ============================================================================
echo ""
echo -e "${BLUE}[2/4] Syncing repository on Synology...${NC}"

# Get the git remote URL
GIT_REMOTE=$(git remote get-url origin)
echo -e "Repository: ${GREEN}${GIT_REMOTE}${NC}"

ssh "${SYNOLOGY_HOST}" bash << ENDSSH
set -e

# Create docker directory if it doesn't exist
mkdir -p /volume1/docker

# Clone or pull repository
if [ -d "${REMOTE_DIR}" ]; then
    echo "Updating existing repository..."
    cd "${REMOTE_DIR}"
    git fetch origin
    git reset --hard origin/${CURRENT_BRANCH}
    git clean -fd
else
    echo "Cloning repository..."
    git clone "${GIT_REMOTE}" "${REMOTE_DIR}"
    cd "${REMOTE_DIR}"
    git checkout ${CURRENT_BRANCH}
fi

echo "Repository synced successfully"
ENDSSH

echo -e "${GREEN}✓ Repository synced${NC}"

# ============================================================================
# Step 3: Build Docker image on Synology
# ============================================================================
echo ""
echo -e "${BLUE}[3/4] Building Docker image on Synology...${NC}"

ssh "${SYNOLOGY_HOST}" bash << ENDSSH
set -e
cd "${REMOTE_DIR}"

echo "Building Docker image: ${IMAGE_NAME}"
docker build ${REBUILD_FLAG} -t "${IMAGE_NAME}" .

echo "Image built successfully"
docker images "${IMAGE_NAME}" --format "Size: {{.Size}}"
ENDSSH

echo -e "${GREEN}✓ Docker image built${NC}"

# ============================================================================
# Step 4: Restart container
# ============================================================================
echo ""
echo -e "${BLUE}[4/4] Restarting container...${NC}"

ssh "${SYNOLOGY_HOST}" bash << ENDSSH
set -e

# Stop and remove existing container if running
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}\$"; then
    echo "Stopping existing container..."
    docker stop "${CONTAINER_NAME}" 2>/dev/null || true
    docker rm "${CONTAINER_NAME}" 2>/dev/null || true
fi

echo "Starting new container..."
docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    --health-cmd="wget --no-verbose --tries=1 --spider http://localhost/health || exit 1" \
    --health-interval=30s \
    --health-timeout=10s \
    --health-retries=3 \
    --health-start-period=5s \
    -p 127.0.0.1:${CONTAINER_PORT} \
    "${IMAGE_NAME}"

# Wait for container to be healthy
echo "Waiting for container to be healthy..."
sleep 3

# Check container status
docker ps --filter "name=${CONTAINER_NAME}" --format "Container: {{.Names}} | Status: {{.Status}}"
ENDSSH

echo -e "${GREEN}✓ Container restarted${NC}"

# ============================================================================
# Verification
# ============================================================================
echo ""
echo -e "${BLUE}Verifying deployment...${NC}"

# Extract just the port number (before the colon)
LOCAL_PORT=$(echo "${CONTAINER_PORT}" | cut -d: -f1)

# Check local port on Synology
echo -n "Checking local port ${LOCAL_PORT}... "
LOCAL_CHECK=$(ssh "${SYNOLOGY_HOST}" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${LOCAL_PORT}/health" 2>/dev/null || echo "failed")

if [ "$LOCAL_CHECK" == "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED (${LOCAL_CHECK})${NC}"
fi

# Check public URL
echo -n "Checking public URL... "
PUBLIC_CHECK=$(curl -s -o /dev/null -w '%{http_code}' "${SITE_URL}" 2>/dev/null || echo "failed")

if [ "$PUBLIC_CHECK" == "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}PENDING (${PUBLIC_CHECK})${NC}"
    echo -e "${YELLOW}Note: Cloudflare tunnel may need configuration${NC}"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo -e "Local:  http://127.0.0.1:${LOCAL_PORT}/ (on Synology)"
echo -e "Public: ${SITE_URL}"
echo ""
echo -e "${BLUE}Container logs:${NC}"
echo "  ssh ${SYNOLOGY_HOST} docker logs -f ${CONTAINER_NAME}"
echo ""
echo -e "${BLUE}Cloudflare tunnel config (if needed):${NC}"
echo "  Add route: morsefleet.oeradio.at → http://localhost:${LOCAL_PORT}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
