#!/bin/sh
#
# MorseFleet Docker Entrypoint
# Generates config.json from environment variables at container startup
#

CONFIG_PATH="/usr/share/nginx/html/config.json"

# Only generate config if any PARENT_SITE_* env var is set
if [ -n "$PARENT_SITE_URL" ] || [ -n "$PARENT_SITE_LOGO" ] || [ -n "$PARENT_SITE_NAME" ]; then
    echo "Generating config.json from environment variables..."

    # Use default values if not set
    URL="${PARENT_SITE_URL:-}"
    LOGO="${PARENT_SITE_LOGO:-}"
    NAME="${PARENT_SITE_NAME:-}"

    cat > "$CONFIG_PATH" << EOF
{
  "parentSiteUrl": "$URL",
  "parentSiteLogo": "$LOGO",
  "parentSiteName": "$NAME"
}
EOF

    echo "Config generated:"
    cat "$CONFIG_PATH"
else
    echo "No PARENT_SITE_* environment variables set, using default config.json"
fi

# Execute the main command (nginx)
exec "$@"
