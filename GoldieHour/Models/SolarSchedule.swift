import Foundation

struct LocalDate: Codable, Hashable, Sendable {
    let year: Int
    let month: Int
    let day: Int

    init(year: Int, month: Int, day: Int) {
        self.year = year
        self.month = month
        self.day = day
    }

    static func today(
        in timeZone: TimeZone = .current,
        now: Date = .now
    ) -> LocalDate {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let components = calendar.dateComponents([.year, .month, .day], from: now)

        return LocalDate(
            year: components.year ?? 1970,
            month: components.month ?? 1,
            day: components.day ?? 1
        )
    }

    func interval(in timeZone: TimeZone) -> DateInterval? {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone

        let components = DateComponents(
            calendar: calendar,
            timeZone: timeZone,
            year: year,
            month: month,
            day: day
        )

        guard let start = calendar.date(from: components) else {
            return nil
        }

        let resolved = calendar.dateComponents([.year, .month, .day], from: start)
        guard
            resolved.year == year,
            resolved.month == month,
            resolved.day == day,
            let end = calendar.date(byAdding: .day, value: 1, to: start)
        else {
            return nil
        }

        return DateInterval(start: start, end: end)
    }
}

struct SolarSchedule: Equatable, Sendable {
    enum Status: String, Codable, Sendable {
        case normal
        case noSunrise
        case noSunset
        case polarDay
        case polarNight
    }

    let localDate: LocalDate
    let timeZoneIdentifier: String
    let sunrise: Date?
    let morningGoldenHour: DateInterval?
    let sunset: Date?
    let eveningGoldenHour: DateInterval?
    let status: Status
}
