# GoldieHour

Native iOS app for finding nearby places and planning around golden hour.

## Requirements

- Full Xcode installation
- iOS 17 or later
- XcodeGen (`brew install xcodegen`) when regenerating the project

## Project setup

`project.yml` is the source of truth for the Xcode project:

```sh
xcodegen generate
open GoldieHour.xcodeproj
```

The MVP intentionally has no third-party runtime dependencies and no backend.

## Solar definitions

- Sunrise and sunset: solar elevation crossing −0.833°
- Morning golden hour: solar elevation rising from −4° to +6°
- Evening golden hour: solar elevation falling from +6° to −4°

Calculations run locally using NOAA solar-position equations and the selected
place’s civil date and time zone.
