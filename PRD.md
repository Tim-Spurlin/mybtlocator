# Planning Guide

A sophisticated web-based Bluetooth device tracker that scans for nearby devices, stores custom profiles with names and metadata, displays last-known locations on an interactive map, and estimates proximity using signal strength.

**Experience Qualities**:
1. **Professional** - Clean technical interface that feels like a powerful tracking dashboard with real-time signal data
2. **Reliable** - Consistent scanning experience with persistent data storage and accurate location tracking
3. **Informative** - Rich device details, signal visualization, and geographical context at a glance

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This app combines multiple sophisticated features: Web Bluetooth API integration, real-time signal strength monitoring, interactive mapping with geolocation, persistent device profiles with custom metadata, distance estimation algorithms, and a multi-view interface managing scanning, device management, and map visualization.

## Essential Features

**Bluetooth Device Scanning**
- Functionality: Discovers nearby Bluetooth LE devices and captures their MAC addresses, names, and signal strength (RSSI)
- Purpose: Core feature enabling device detection and tracking
- Trigger: User clicks "Scan for Devices" button or app auto-scans on load
- Progression: Click scan → Request Bluetooth permission → Show scanning indicator → Display discovered devices in real-time list → Save device with location
- Success criteria: Devices appear within 2 seconds of detection, RSSI updates live, MAC addresses are captured correctly

**Custom Device Profiles**
- Functionality: Store detailed profiles for each device with custom name, type (phone/earbuds/laptop), color marker, icon/emoji, and notes
- Purpose: Personalize tracked devices for easy identification and organization
- Trigger: User selects discovered device or clicks existing device card
- Progression: Select device → Open profile editor → Input custom name → Choose device type → Pick color → Add emoji/icon → Write notes → Save profile
- Success criteria: All profile data persists across sessions, edits are instant, devices are visually distinct

**Interactive Location Map**
- Functionality: Display all devices on an interactive map showing last-known GPS coordinates with custom colored markers
- Purpose: Visualize where devices were last detected geographically
- Trigger: User switches to Map view tab
- Progression: Open map → Load device locations → Render markers at GPS coordinates → Click marker for device details → Show proximity circle if currently detected
- Success criteria: Markers appear at correct coordinates, colors match device profiles, map is responsive and smooth

**Signal Strength & Distance Estimation**
- Functionality: Calculate estimated distance from RSSI values and display as proximity indicator and map circle
- Purpose: Help users locate nearby devices by showing approximate distance
- Trigger: Automatic when device is detected during scan
- Progression: Device detected → Capture RSSI → Calculate distance using path loss formula → Display distance estimate → Draw circle on map → Update signal strength bar
- Success criteria: Distance estimates are reasonable (1-50m range), visual indicators update in real-time

**Device History & Last Seen Tracking**
- Functionality: Record timestamp and location every time a device is detected, maintaining comprehensive history log with timeline visualization
- Purpose: Track device movement patterns, show when/where it was last found, and provide historical location data over time
- Trigger: Automatic on each device detection
- Progression: Device detected → Capture current GPS → Store timestamp + location + RSSI in history array → Update "last seen" display → Display in chronological timeline grouped by date
- Success criteria: Timestamps are accurate, locations persist across sessions, history shows chronological entries with full details including signal strength and distance estimates

**Location Heatmap Visualization**
- Functionality: Generate visual heatmap overlay on interactive map showing device detection density patterns across locations
- Purpose: Identify hotspots where devices are most frequently detected, reveal usage patterns, and visualize tracking coverage
- Trigger: User switches to Heatmap view tab
- Progression: Open heatmap view → Load all location history data → Calculate density distribution → Render color-gradient heatmap layer → Adjust radius/blur/intensity controls → Toggle between all devices or single device view
- Success criteria: Heatmap accurately reflects detection frequency with blue (low) to red (high) gradient, controls update visualization in real-time, performance remains smooth with hundreds of data points

## Edge Case Handling

- **Bluetooth Permission Denied** - Show clear message explaining Web Bluetooth requirements with retry button
- **Geolocation Unavailable** - Fall back to IP-based location or allow manual location entry, show warning icon
- **No Devices Found** - Display helpful empty state with troubleshooting tips (enable Bluetooth, device discoverability)
- **Duplicate MAC Addresses** - Use MAC as unique identifier, merge RSSI readings, prevent duplicate profiles
- **Browser Compatibility** - Detect Web Bluetooth support, show compatibility notice for unsupported browsers (Safari, Firefox)
- **Offline Mode** - Show cached device data and last-known locations, disable scanning features gracefully
- **Signal Loss** - Mark device as "out of range", preserve last-known data, show elapsed time since last detection

## Design Direction

The design should evoke a technical monitoring dashboard with a slightly futuristic, precise aesthetic - think sleek tracking interface meets professional GIS tool. Clean data visualization, strong contrast for readability, subtle tech-inspired patterns, and confident typography that feels like serious location tracking software.

## Color Selection

Tech-forward palette with deep slate backgrounds, electric accent colors for active scanning, and vibrant device markers.

- **Primary Color**: Electric Blue (`oklch(0.65 0.19 240)`) - Active scanning states, primary actions, conveys precision and technology
- **Secondary Colors**: Deep Slate (`oklch(0.25 0.02 240)`) for cards and elevated surfaces, creating depth; Soft Gray (`oklch(0.85 0.01 240)`) for subtle backgrounds
- **Accent Color**: Cyan Highlight (`oklch(0.75 0.15 200)`) - Live device indicators, signal strength bars, map proximity circles
- **Foreground/Background Pairings**: 
  - Background (Deep Navy `oklch(0.12 0.03 240)`): Light text (`oklch(0.95 0.01 240)`) - Ratio 15.2:1 ✓
  - Primary (Electric Blue `oklch(0.65 0.19 240)`): White text (`oklch(1 0 0)`) - Ratio 4.8:1 ✓
  - Accent (Cyan `oklch(0.75 0.15 200)`): Dark text (`oklch(0.12 0.03 240)`) - Ratio 11.3:1 ✓
  - Card (Deep Slate `oklch(0.25 0.02 240)`): Light text (`oklch(0.95 0.01 240)`) - Ratio 11.8:1 ✓

## Font Selection

Typography should feel technical yet approachable - monospace for data values, geometric sans for UI elements, creating a professional tracking dashboard aesthetic.

- **Typographic Hierarchy**:
  - H1 (App Title): Space Grotesk Bold / 32px / tight letter spacing / -0.02em
  - H2 (Section Headers): Space Grotesk SemiBold / 24px / normal spacing
  - H3 (Device Names): Space Grotesk Medium / 18px / normal spacing
  - Body (UI Text): Inter Regular / 15px / 1.5 line height
  - Data Values (RSSI, Distance): JetBrains Mono Medium / 14px / tabular numbers / monospace for alignment
  - Labels: Inter Medium / 13px / uppercase / tracking-wide

## Animations

Animations should feel precise and purposeful - subtle scanning pulses, smooth transitions between views, fluid signal strength updates, and satisfying device discovery micro-interactions that reinforce the technical tracking nature.

## Component Selection

- **Components**: 
  - Tabs (view switching: Devices/Map/Heatmap/Radar/History/Statistics)
  - Card (device profile containers with hover states)
  - Button (scan controls, profile actions - modified with signal pulse animation)
  - Dialog (device profile editor with full-screen overlay)
  - Badge (device type indicators, signal quality tags)
  - Input + Label (custom name, notes fields)
  - Separator (visual breaks between sections)
  - Progress (scanning indicator, circular signal strength)
  - Avatar (device icons/emojis with custom color backgrounds)
  - Sheet (slide-up device details on mobile)
  - Tooltip (RSSI explanations, distance calculation info)
  - Slider (heatmap control adjustments)
  - Switch (heatmap device filtering)
  - Select (device selection dropdown)
  
- **Customizations**: 
  - Custom signal strength radial visualization (Canvas-based)
  - Interactive map component using Leaflet.js
  - Heatmap layer using leaflet.heat plugin with custom gradient
  - Live scanning pulse animation overlay
  - Custom color picker for device markers
  - RSSI history sparkline graphs
  
- **States**: 
  - Scan button: default (blue) → scanning (pulsing cyan animation) → success (green flash) → disabled (gray)
  - Device cards: default → hover (elevated shadow + border glow) → selected (blue border) → out of range (muted opacity)
  - Map markers: static (colored pin) → active (pulsing circle overlay) → selected (enlarged + info popup)
  
- **Icon Selection**: 
  - Bluetooth (scanning/connection status)
  - MapPin (location markers)
  - MapTrifold (map view)
  - Flame (heatmap visualization)
  - Crosshair (current location, map recentering)
  - Signal (RSSI strength)
  - Pencil (edit profile)
  - Plus (add device)
  - Clock (last seen timestamp)
  - ClockCounterClockwise (history view)
  - Circle (proximity indicator)
  - Disc (radar view)
  - ChartBar (statistics view)
  - Trophy (top devices)
  - TrendUp (statistics metrics)
  
- **Spacing**: 
  - Page padding: p-6 (24px)
  - Card padding: p-4 (16px)
  - Section gaps: gap-6 (24px)
  - List item gaps: gap-3 (12px)
  - Tight groupings: gap-2 (8px)
  
- **Mobile**: 
  - Bottom tab bar instead of top tabs
  - Full-width device cards with touch-optimized tap targets
  - Slide-up sheet for device details instead of dialog
  - Map fills entire screen on Map tab with floating controls
  - Sticky scan button at bottom right corner
  - Collapsible filters and settings drawer
