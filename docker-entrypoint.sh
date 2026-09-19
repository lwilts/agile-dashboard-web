#!/bin/bash
set -e

# Generate runtime config from environment variables
cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.RUNTIME_CONFIG = {
  VITE_OCTOPUS_REGION: "${VITE_OCTOPUS_REGION:-C}",
  VITE_AGILE_PRODUCT: "${VITE_AGILE_PRODUCT:-AGILE-24-10-01}",
  VITE_GAS_PRODUCT: "${VITE_GAS_PRODUCT:-SILVER-25-09-02}",
  VITE_WEATHER_LAT: ${VITE_WEATHER_LAT:-51.5074},
  VITE_WEATHER_LON: ${VITE_WEATHER_LON:--0.1278},
  VITE_THRESHOLD_CHEAP: ${VITE_THRESHOLD_CHEAP:-10},
  VITE_THRESHOLD_MODERATE: ${VITE_THRESHOLD_MODERATE:-20},
  VITE_THRESHOLD_EXPENSIVE: ${VITE_THRESHOLD_EXPENSIVE:-35}
};
EOF

echo "Runtime configuration generated:"
cat /usr/share/nginx/html/runtime-config.js

# Execute the main command
exec "$@"
