# MorseFleet - Lightweight Docker image
# Uses nginx:alpine for minimal footprint (~25MB)

FROM nginx:alpine

# Add labels for container metadata
LABEL maintainer="MorseFleet"
LABEL description="Morse Code Naval Battle Trainer"
LABEL version="1.0"

# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy the bundled SPA
COPY morsefleet.html /usr/share/nginx/html/index.html

# Copy default config
COPY config.json /usr/share/nginx/html/config.json

# Copy custom nginx config for SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Use entrypoint to generate config from env vars
ENTRYPOINT ["/docker-entrypoint.sh"]

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
