import MapKit
import SwiftUI

struct SpotSheet: View {
    let spot: Spot
    let planningDate: LocalDate

    private let calculator = SolarCalculator()

    var body: some View {
        let timeZone = resolvedTimeZone
        let schedule = try? calculator.schedule(
            on: planningDate,
            at: spot.coordinate,
            in: timeZone
        )

        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header(timeZone: timeZone)

                if let schedule {
                    scheduleContent(schedule, timeZone: timeZone)
                } else {
                    ContentUnavailableView(
                        "Light times unavailable",
                        systemImage: "sun.horizon",
                        description: Text("Try another date or location.")
                    )
                }

                Button(action: openDirections) {
                    Label("Directions in Apple Maps", systemImage: "arrow.triangle.turn.up.right.diamond.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .tint(GoldieHourTheme.accent)
            }
            .padding(20)
        }
        .presentationDetents([.height(370), .medium])
        .presentationDragIndicator(.visible)
        .presentationBackground(.thinMaterial)
        .presentationBackgroundInteraction(.enabled(upThrough: .height(370)))
    }

    private func header(timeZone: TimeZone) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(spot.name)
                .font(.title2.weight(.semibold))
                .foregroundStyle(.primary)

            HStack(spacing: 8) {
                if let region = spot.regionDescription {
                    Label(region, systemImage: "mappin")
                }
                Text(formattedPlanningDate(timeZone: timeZone))
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private func scheduleContent(
        _ schedule: SolarSchedule,
        timeZone: TimeZone
    ) -> some View {
        if schedule.status == .normal {
            HStack(spacing: 12) {
                goldenHourCard(
                    title: "Morning",
                    symbol: "sunrise.fill",
                    interval: schedule.morningGoldenHour,
                    timeZone: timeZone
                )
                goldenHourCard(
                    title: "Evening",
                    symbol: "sunset.fill",
                    interval: schedule.eveningGoldenHour,
                    timeZone: timeZone
                )
            }

            VStack(spacing: 12) {
                solarEventRow(
                    title: "Sunrise",
                    symbol: "sunrise",
                    date: schedule.sunrise,
                    timeZone: timeZone
                )
                Divider()
                solarEventRow(
                    title: "Sunset",
                    symbol: "sunset",
                    date: schedule.sunset,
                    timeZone: timeZone
                )
            }
        } else {
            Label(statusDescription(schedule.status), systemImage: "sun.horizon")
                .font(.headline)
                .foregroundStyle(GoldieHourTheme.ink)
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(GoldieHourTheme.paper, in: RoundedRectangle(cornerRadius: 16))
        }
    }

    private func goldenHourCard(
        title: String,
        symbol: String,
        interval: DateInterval?,
        timeZone: TimeZone
    ) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            Label(title, systemImage: symbol)
                .font(.subheadline.weight(.semibold))
            Text(formatted(interval: interval, timeZone: timeZone))
                .font(.headline.monospacedDigit())
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .foregroundStyle(GoldieHourTheme.ink)
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(GoldieHourTheme.paper, in: RoundedRectangle(cornerRadius: 16))
    }

    private func solarEventRow(
        title: String,
        symbol: String,
        date: Date?,
        timeZone: TimeZone
    ) -> some View {
        HStack {
            Label(title, systemImage: symbol)
                .foregroundStyle(.secondary)
            Spacer()
            Text(formatted(date: date, timeZone: timeZone))
                .font(.body.weight(.semibold).monospacedDigit())
                .foregroundStyle(GoldieHourTheme.ink)
        }
    }

    private var resolvedTimeZone: TimeZone {
        spot.timeZoneIdentifier.flatMap(TimeZone.init(identifier:)) ?? .current
    }

    private func formatted(date: Date?, timeZone: TimeZone) -> String {
        guard let date else {
            return "—"
        }

        let formatter = DateFormatter()
        formatter.locale = .autoupdatingCurrent
        formatter.timeZone = timeZone
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    private func formatted(interval: DateInterval?, timeZone: TimeZone) -> String {
        guard let interval else {
            return "Unavailable"
        }

        return "\(formatted(date: interval.start, timeZone: timeZone))–\(formatted(date: interval.end, timeZone: timeZone))"
    }

    private func formattedPlanningDate(timeZone: TimeZone) -> String {
        guard let date = planningDate.interval(in: timeZone)?.start else {
            return ""
        }

        let formatter = DateFormatter()
        formatter.locale = .autoupdatingCurrent
        formatter.timeZone = timeZone
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }

    private func statusDescription(_ status: SolarSchedule.Status) -> String {
        switch status {
        case .normal:
            return ""
        case .noSunrise:
            return "The sun does not rise on this local date."
        case .noSunset:
            return "The sun does not set on this local date."
        case .polarDay:
            return "Midnight sun: the sun stays above the horizon."
        case .polarNight:
            return "Polar night: the sun stays below the horizon."
        }
    }

    private func openDirections() {
        let mapItem = MKMapItem(
            placemark: MKPlacemark(coordinate: spot.coordinate.clLocationCoordinate)
        )
        mapItem.name = spot.name
        mapItem.openInMaps(
            launchOptions: [
                MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving,
            ]
        )
    }
}
