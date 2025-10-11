#!/bin/bash
set -e

# Generate runtime config from environment variables
cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.RUNTIME_CONFIG = {
  VITE_OCTOPUS_REGION: "${VITE_OCTOPUS_REGION}",
  VITE_AGILE_PRODUCT: "${VITE_AGILE_PRODUCT}",
  VITE_GAS_PRODUCT: "${VITE_GAS_PRODUCT}",
  VITE_WEATHER_LAT: ${VITE_WEATHER_LAT},
  VITE_WEATHER_LON: ${VITE_WEATHER_LON},
  VITE_THRESHOLD_CHEAP: ${VITE_THRESHOLD_CHEAP},
  VITE_THRESHOLD_MODERATE: ${VITE_THRESHOLD_MODERATE},
  VITE_THRESHOLD_EXPENSIVE: ${VITE_THRESHOLD_EXPENSIVE}
};
EOF

echo "Runtime configuration generated:"
cat /usr/share/nginx/html/runtime-config.js

# Execute the main command
exec "$@"
