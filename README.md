# Octopus Agile Dashboard - Web Version

A responsive web dashboard for monitoring Octopus Energy Agile electricity prices, gas prices, and weather information. Built with React, TypeScript, and Recharts.

## Features

- **Real-time Energy Pricing**: Displays Octopus Agile half-hourly electricity prices
- **Gas Pricing**: Shows daily gas tracker prices
- **Weather Integration**: Current weather conditions with animated icons
- **Interactive Chart**: 24-hour price visualization with color-coded thresholds
- **Tomorrow's Data**: Automatically displays tomorrow's prices when available (after ~4pm)
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Smart Caching**: localStorage caching to minimize API calls
- **Configurable Thresholds**: Customize price color coding via environment variables

## Quick Start

### Local Development

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure (optional):**
   ```bash
   cp .env.example .env
   # Edit .env with your preferences
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:5173
   ```

### Production Build

```bash
npm run build
npm run preview
```

## Docker Deployment

### Build the Docker image:

```bash
docker build -t agile-dashboard-web .
```

### Run with default configuration (London):

```bash
docker run -p 8080:80 agile-dashboard-web
```

### Run with custom configuration:

```bash
docker run -p 8080:80 \
  -e VITE_OCTOPUS_REGION=C \
  -e VITE_AGILE_PRODUCT=AGILE-24-10-01 \
  -e VITE_GAS_PRODUCT=SILVER-25-09-02 \
  -e VITE_WEATHER_LAT=51.5074 \
  -e VITE_WEATHER_LON=-0.1278 \
  -e VITE_THRESHOLD_CHEAP=10 \
  -e VITE_THRESHOLD_MODERATE=20 \
  -e VITE_THRESHOLD_EXPENSIVE=35 \
  agile-dashboard-web
```

Access the dashboard at: `http://localhost:8080`

## Kubernetes Deployment

Example deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agile-dashboard
spec:
  replicas: 1
  selector:
    matchLabels:
      app: agile-dashboard
  template:
    metadata:
      labels:
        app: agile-dashboard
    spec:
      containers:
      - name: dashboard
        image: agile-dashboard-web:latest
        ports:
        - containerPort: 80
        env:
        - name: VITE_OCTOPUS_REGION
          value: "C"
        - name: VITE_AGILE_PRODUCT
          value: "AGILE-24-10-01"
        - name: VITE_GAS_PRODUCT
          value: "SILVER-25-09-02"
        - name: VITE_WEATHER_LAT
          value: "51.5074"
        - name: VITE_WEATHER_LON
          value: "-0.1278"
        - name: VITE_THRESHOLD_CHEAP
          value: "10"
        - name: VITE_THRESHOLD_MODERATE
          value: "20"
        - name: VITE_THRESHOLD_EXPENSIVE
          value: "35"
---
apiVersion: v1
kind: Service
metadata:
  name: agile-dashboard
spec:
  selector:
    app: agile-dashboard
  ports:
  - port: 80
    targetPort: 80
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_OCTOPUS_REGION` | `C` | UK region code (A-P). C = London |
| `VITE_AGILE_PRODUCT` | `AGILE-24-10-01` | Octopus Agile product code |
| `VITE_GAS_PRODUCT` | `SILVER-25-09-02` | Octopus Gas Tracker product code |
| `VITE_WEATHER_LAT` | `51.5074` | Weather location latitude |
| `VITE_WEATHER_LON` | `-0.1278` | Weather location longitude |
| `VITE_THRESHOLD_CHEAP` | `10` | Green price threshold (p/kWh) |
| `VITE_THRESHOLD_MODERATE` | `20` | Blue price threshold (p/kWh) |
| `VITE_THRESHOLD_EXPENSIVE` | `35` | Yellow price threshold (p/kWh) |

### UK Region Codes

| Code | Region | Code | Region |
|------|--------|------|--------|
| A | Eastern England | H | Southern England |
| B | East Midlands | J | South Eastern England |
| C | London | K | Southern Wales |
| D | Merseyside and Northern Wales | L | South Western England |
| E | West Midlands | M | Yorkshire |
| F | North Eastern England | N | Southern Scotland |
| G | North Western England | P | Northern Scotland |

## API Data Sources

This dashboard uses public APIs (no authentication required):

- **Octopus Energy API**: Real-time electricity and gas pricing
- **Open-Meteo API**: Weather forecast data

Data is cached locally for 5 minutes to minimize API calls.

## Home Assistant Integration

To embed in Home Assistant:

```yaml
type: iframe
url: http://agile-dashboard.local
aspect_ratio: 75%
```

Or use a `webpage` card:

```yaml
type: webpage
url: http://agile-dashboard.local
```

## Color Scheme

- **Background**: Dark gray (`rgb(17, 24, 39)`)
- **Green**: Cheap prices (< 10p/kWh)
- **Blue**: Moderate prices (10-20p/kWh)
- **Yellow**: Expensive prices (20-35p/kWh)
- **Red**: Very expensive prices (> 35p/kWh)
- **Orange**: Gas prices (always)

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari, Chrome Mobile

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx       # Weather and time display
│   ├── PriceBoxes.tsx   # Current/Min/Max/Gas price boxes
│   ├── PriceChart.tsx   # 24-hour bar chart
│   └── WeatherIcon.tsx  # SVG weather icons
├── services/            # API and caching
│   ├── octopusApi.ts    # Electricity prices
│   ├── gasApi.ts        # Gas prices
│   ├── weatherApi.ts    # Weather data
│   └── cache.ts         # localStorage caching
├── types.ts             # TypeScript interfaces
├── config.ts            # Configuration and colors
├── App.tsx              # Main dashboard
└── main.tsx             # App entry point
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Troubleshooting

### No price data showing

1. Check console for API errors
2. Verify your region code is correct (A-P)
3. Confirm product codes are current
4. Check CORS isn't blocking API requests

### Tomorrow's prices not appearing

- Tomorrow's prices are typically available after 4pm
- Check the API directly if data should be available

### Docker environment variables not working

- Ensure variables are passed with `-e` flag or in deployment manifest
- Check container logs: `docker logs <container-id>`
- Verify runtime-config.js is generated: `docker exec <container-id> cat /usr/share/nginx/html/runtime-config.js`

## License

MIT

## Related Projects

- [agile-dashboard](../agile-dashboard) - Raspberry Pi hardware version with Display HAT Mini
