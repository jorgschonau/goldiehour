# GoldieHour

An iOS-first Expo app for finding nearby outdoor places and planning around
golden hour.

## Run without Xcode

Install [Expo Go](https://expo.dev/go) on the iPhone, then:

```sh
npm install
npm run go
```

Scan the QR code with the iPhone. Local Xcode is not required for this workflow.
If the phone cannot reach the Mac on the local network, use `npm run tunnel`.

## Cloud iOS builds

EAS builds and signs the iOS app on Expo's macOS infrastructure:

```sh
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform ios --profile preview
```

Use the `production` profile for an App Store build. Expo and Apple credentials
are configured interactively and are never committed to this repository.

## Checks

```sh
npm run typecheck
npm run doctor
npx expo export --platform ios
```

## Architecture

- Expo SDK 58 and React Native
- Apple Maps through `react-native-maps` on iOS
- Location through `expo-location`
- Local NOAA-based solar calculations
- Local coordinate-to-time-zone lookup
- OpenStreetMap/Overpass for outdoor-place discovery
- EAS for cloud builds and App Store delivery

The MVP has no app backend, account system, analytics SDK, or copied SunNomad
secrets and services.

## Solar definitions

- Sunrise and sunset: solar elevation crossing −0.833°
- Morning golden hour: solar elevation rising from −4° to +6°
- Evening golden hour: solar elevation falling from +6° to −4°

Calculations run locally using NOAA solar-position equations and the selected
place's civil date and time zone.
