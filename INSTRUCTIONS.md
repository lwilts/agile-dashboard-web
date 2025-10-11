# Octopus Agile Dashboard - Web Version

## Project Goal
Create a web version of the existing hardware dashboard (Raspberry Pi with Display HAT Mini) that can be:
- Viewed on mobile devices
- Embedded in Home Assistant dashboards
- Enhanced with hover/interactive features for more details

## Reference Implementation
Hardware version: `/home/luke/repos/ansible/agile-dashboard`
- Current implementation in: `templates/dashboard.py.j2`
- Live on Raspberry Pi Zero with 320x240 ST7789 display
- Updates every 30 seconds, fetches new data every 5 minutes

## Data Sources

### 1. Octopus Energy Agile API (No Auth Required)
**Electricity Prices:**
```
GET https://api.octopus.energy/v1/products/{AGILE_PRODUCT}/electricity-tariffs/E-1R-{AGILE_PRODUCT}-{REGION}/standard-unit-rates/
```
- Returns 48 half-hourly prices (today + tomorrow when available)
- Tomorrow prices typically available after ~4pm
- Query params: `period_from`, `period_to` (ISO format)

**Gas Tracker Prices:**
```
GET https://api.octopus.energy/v1/products/{GAS_PRODUCT}/gas-tariffs/G-1R-{GAS_PRODUCT}-{REGION}/standard-unit-rates/
```
- Returns daily gas prices
- Much simpler than electricity (one price per day)

**Current Config:**
- Region: `C` (London)
- Agile Product: `AGILE-24-10-01`
- Gas Product: `SILVER-25-09-02`

### 2. Open-Meteo Weather API (No Auth Required)
```
GET https://api.open-meteo.com/v1/forecast
```
**Params:**
- `latitude`: 51.5074 (London)
- `longitude`: -0.1278
- `daily`: temperature_2m_min,temperature_2m_max,weather_code
- `timezone`: auto
- `forecast_days`: 1

**Weather Code Mapping:**
- 0-1: Sunny
- 2: Partly cloudy
- 3: Cloudy
- 45,48: Foggy
- 51-67: Rainy
- 71-77: Snowy
- 95-99: Stormy

## Design Specifications

### Display Dimensions
- Hardware: 320x240 pixels
- Web: Responsive, but maintain similar layout/proportions

### Color Scheme (Dark Theme)
```
Background: rgb(17, 24, 39)
Text: rgb(255, 255, 255)
Blue: rgb(59, 130, 246)
Orange: rgb(251, 146, 60)
Green: rgb(34, 197, 94)
Red: rgb(239, 68, 68)
Yellow: rgb(234, 179, 8)
```

### Price Thresholds
- **Cheap** (Green): < 10p/kWh
- **Moderate** (Blue): 10-20p/kWh
- **Expensive** (Yellow): 20-35p/kWh
- **Very Expensive** (Red): > 35p/kWh
- **Gas** (Orange): Always orange

### Layout Structure

**1. Header Bar**
- Left: Weather icon (22px) + "max°/min°" temperatures
- Right: Current time (HH:MM format)
- Font: DejaVu Sans Bold, 20px

**2. Price Boxes (4 boxes in a row)**
- **Current**: Current half-hour price with color
- **Min**: Today's minimum price (always green)
- **Max**: Today's maximum price (always red)
- **Gas**: Today's gas price (always orange)
- Each shows: label (small) + price with small "p" suffix

**3. 24-Hour Bar Chart**
- Shows today's remaining hours + tomorrow's hours (when available)
- Each bar colored by threshold
- Current half-hour highlighted with vertical line
- Horizontal gridlines every 10p
- Y-axis labels on left
- "Tomorrow" label and shaded background for tomorrow section
- Bar gap: 10px between bars

### Weather Icons
7 distinct icon types with proper graphics (not simple shapes):
1. **Sunny**: Circle with sun rays
2. **Partly Cloudy**: Sun with cloud overlay
3. **Cloudy**: Multiple overlapping cloud ellipses
4. **Rainy**: Cloud with rain drops
5. **Snowy**: Cloud with snowflakes
6. **Stormy**: Cloud with lightning bolt
7. **Foggy**: Horizontal fog lines

## Data Processing

### Caching Strategy
Hardware version caches to JSON files:
- `price-data-YYYY-MM-DD.json` (electricity)
- Prevents excessive API calls
- Falls back to cache if API fails

### Time Handling
- All times in user's timezone (currently Europe/London)
- Current half-hour determined by: `now.hour` and `now.minute >= 30`
- Display shows remaining today + all of tomorrow

### Price Formatting
- Show as pence with 2 decimal places: `24.78p`
- "p" suffix rendered smaller than number
- Use colors based on thresholds

## Technical Stack Suggestions
- **Backend**: Flask or FastAPI (Python)
- **Frontend**: HTML5 Canvas or SVG for rendering (similar to PIL on hardware)
- **Alternative**: Chart.js/D3.js for interactive charts
- **WebSocket**: Optional, for live updates without refresh
- **Docker**: Optional, for easy deployment

## Interactive Features (New for Web)
Ideas for enhancement:
- Hover over bars to see exact time + price
- Click to see historical data
- Toggle between today/tomorrow view
- Show price change notifications
- Export chart as image
- Configurable thresholds

## Configuration
Make these configurable (currently hardcoded):
- Region (A-P)
- Product codes
- Weather location
- Price thresholds
- Update intervals

## Home Assistant Integration
For embedding:
- Provide iframe-friendly endpoint
- Consider Home Assistant's `picture` card or `webpage` card
- Responsive sizing for HA dashboard tiles

## User Preferences
- No Claude attribution in git commits
- Keep credentials out of git
- Clean, minimal approach

## Next Steps
1. Set up basic Flask/FastAPI app structure
2. Implement API data fetching (reuse logic from hardware version)
3. Create web rendering (HTML/CSS/Canvas or chart library)
4. Add interactive features (hover states, tooltips)
5. Make responsive for mobile
6. Add configuration UI
7. Docker deployment
8. Home Assistant integration guide
