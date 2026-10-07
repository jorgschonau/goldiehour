import XCTest
@testable import GoldieHour

final class SolarCalculatorTests: XCTestCase {
    private let calculator = SolarCalculator()

    func testNewYorkSummerSolsticeMatchesPublishedTimes() throws {
        let timeZone = try XCTUnwrap(TimeZone(identifier: "America/New_York"))
        let schedule = try calculator.schedule(
            on: LocalDate(year: 2024, month: 6, day: 21),
            at: Coordinate(latitude: 40.7128, longitude: -74.0060),
            in: timeZone
        )

        // Published values round to 05:25 and 20:30 local time.
        let expectedSunrise = try date(
            year: 2024,
            month: 6,
            day: 21,
            hour: 5,
            minute: 25,
            timeZone: timeZone
        )
        let expectedSunset = try date(
            year: 2024,
            month: 6,
            day: 21,
            hour: 20,
            minute: 30,
            timeZone: timeZone
        )

        XCTAssertEqual(schedule.status, .normal)
        XCTAssertEqual(
            try XCTUnwrap(schedule.sunrise).timeIntervalSince(expectedSunrise),
            0,
            accuracy: 2 * 60
        )
        XCTAssertEqual(
            try XCTUnwrap(schedule.sunset).timeIntervalSince(expectedSunset),
            0,
            accuracy: 2 * 60
        )
    }

    func testGoldenHoursContainSunriseAndSunsetInOrder() throws {
        let timeZone = try XCTUnwrap(TimeZone(identifier: "Europe/Berlin"))
        let schedule = try calculator.schedule(
            on: LocalDate(year: 2025, month: 9, day: 22),
            at: Coordinate(latitude: 52.5200, longitude: 13.4050),
            in: timeZone
        )

        let morning = try XCTUnwrap(schedule.morningGoldenHour)
        let evening = try XCTUnwrap(schedule.eveningGoldenHour)
        let sunrise = try XCTUnwrap(schedule.sunrise)
        let sunset = try XCTUnwrap(schedule.sunset)

        XCTAssertLessThan(morning.start, sunrise)
        XCTAssertLessThan(sunrise, morning.end)
        XCTAssertLessThan(evening.start, sunset)
        XCTAssertLessThan(sunset, evening.end)
    }

    func testPolarDayAndNightReturnNoFabricatedEvents() throws {
        let timeZone = try XCTUnwrap(TimeZone(identifier: "Europe/Oslo"))
        let tromso = Coordinate(latitude: 69.6492, longitude: 18.9553)

        let summer = try calculator.schedule(
            on: LocalDate(year: 2025, month: 6, day: 21),
            at: tromso,
            in: timeZone
        )
        let winter = try calculator.schedule(
            on: LocalDate(year: 2025, month: 12, day: 21),
            at: tromso,
            in: timeZone
        )

        XCTAssertEqual(summer.status, .polarDay)
        XCTAssertNil(summer.sunrise)
        XCTAssertNil(summer.sunset)

        XCTAssertEqual(winter.status, .polarNight)
        XCTAssertNil(winter.sunrise)
        XCTAssertNil(winter.sunset)
    }

    func testLocalDateUsesDSTLengthInsteadOfAssumingTwentyFourHours() throws {
        let timeZone = try XCTUnwrap(TimeZone(identifier: "Europe/Berlin"))
        let springForward = try XCTUnwrap(
            LocalDate(year: 2025, month: 3, day: 30).interval(in: timeZone)
        )
        let fallBack = try XCTUnwrap(
            LocalDate(year: 2025, month: 10, day: 26).interval(in: timeZone)
        )

        XCTAssertEqual(springForward.duration, 23 * 60 * 60, accuracy: 1)
        XCTAssertEqual(fallBack.duration, 25 * 60 * 60, accuracy: 1)
    }

    func testInvalidLocalDateThrows() {
        let timeZone = TimeZone(secondsFromGMT: 0)!

        XCTAssertThrowsError(
            try calculator.schedule(
                on: LocalDate(year: 2025, month: 2, day: 30),
                at: Coordinate(latitude: 0, longitude: 0),
                in: timeZone
            )
        ) { error in
            XCTAssertEqual(error as? SolarCalculator.CalculationError, .invalidLocalDate)
        }
    }

    private func date(
        year: Int,
        month: Int,
        day: Int,
        hour: Int,
        minute: Int,
        timeZone: TimeZone
    ) throws -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone

        return try XCTUnwrap(
            calendar.date(
                from: DateComponents(
                    timeZone: timeZone,
                    year: year,
                    month: month,
                    day: day,
                    hour: hour,
                    minute: minute
                )
            )
        )
    }
}
