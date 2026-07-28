# Smart Campus Navigation App — Mobile Client (Prototype)

Cross-platform (Android + iOS) mobile client for the Smart Campus Navigation
App, built with **Expo / React Native**. Case institution: Yaoundé
International Business School (YIBS).

This is the **client tier** of the three-tier architecture described in
Chapter Three of the project. In this first phase the campus data is held
locally (mock data); the Node.js/Express/MongoDB backend will replace that
data source in the next phase.

## Features (mapped to the project objectives)

| Objective (Chapter One) | Implemented as |
|---|---|
| Interactive campus map | Home map using `react-native-maps` with **OpenStreetMap** tiles (no Google billing) |
| Location search | `Search` screen — searches buildings **and** rooms/offices |
| Building → floor → room directory | `Building` screen — indoor directory (plain RN components) |
| Route guidance | `Directions` screen — route line + distance + walking-time estimate from the user's GPS position |

## Tech stack

- **React Native + Expo** — one codebase for Android and iOS
- **React Navigation** (native stack) — screen navigation
- **react-native-maps + OpenStreetMap tiles** — outdoor map
- **expo-location** — user's current position (GPS)

## Running the app

You need [Node.js](https://nodejs.org) (already installed) and the **Expo Go**
app on your phone (from the App Store / Play Store).

```bash
cd mobile
npm install          # first time only
npm start            # starts the Expo dev server + QR code
```

Then:

- **On your phone:** open **Expo Go** and scan the QR code shown in the
  terminal (Android: scan in the Expo Go app; iOS: scan with the Camera app).
  The phone and computer must be on the same Wi-Fi network.
- **Android emulator:** press `a` in the terminal.
- **iOS simulator (macOS only):** press `i`.

The first location prompt asks for permission — allow it so the map can show
your position and measure distance. If you decline or GPS is unavailable, the
app falls back to the campus centre so it still works for a demo.

## Project structure

```
mobile/
  App.js                     # navigation container + stack
  app.json                   # Expo config + location permission
  src/
    data/campus.js           # mock campus data (buildings → floors → rooms)
    theme.js                 # colours & spacing
    utils/geo.js             # distance / walking-time / map-region helpers
    hooks/useUserLocation.js # GPS location with graceful fallback
    components/CampusMap.js   # shared OpenStreetMap map view
    screens/
      HomeScreen.js
      SearchScreen.js
      BuildingScreen.js
      RoomScreen.js
      DirectionsScreen.js
```

## Notes / prototype scope

- The route is drawn as a direct guideline between the user and the
  destination building (prototype scope). Turn-by-turn walking paths via a
  routing service are noted as future work.
- Indoor guidance is presented as a floor/room directory rather than live
  indoor positioning, because GPS is unreliable indoors — a limitation
  acknowledged in the project.
