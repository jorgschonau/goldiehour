import Foundation

struct SolarCalculator: Sendable {
    enum CalculationError: Error, Equatable {
        case invalidLocalDate
    }

    private enum CrossingDirection {
        case ascending
        case descending
    }

    private enum Elevation {
        static let sunriseSunset = -0.833
        static let goldenHourLower = -4.0
        static let goldenHourUpper = 6.0
    }

    private let sampleInterval: TimeInterval = 5 * 60

    func schedule(
        on localDate: LocalDate,
        at coordinate: Coordinate,
        in timeZone: TimeZone
    ) throws -> SolarSchedule {
        guard let day = localDate.interval(in: timeZone) else {
            throw CalculationError.invalidLocalDate
        }

        let morningStart = crossing(
            threshold: Elevation.goldenHourLower,
            direction: .ascending,
            in: day,
            at: coordinate
        )
        let sunrise = crossing(
            threshold: Elevation.sunriseSunset,
            direction: .ascending,
            in: day,
            at: coordinate
        )
        let morningEnd = crossing(
            threshold: Elevation.goldenHourUpper,
            direction: .ascending,
            in: day,
            at: coordinate
        )
        let eveningStart = crossing(
            threshold: Elevation.goldenHourUpper,
            direction: .descending,
            in: day,
            at: coordinate
        )
        let sunset = crossing(
            threshold: Elevation.sunriseSunset,
            direction: .descending,
            in: day,
            at: coordinate
        )
        let eveningEnd = crossing(
            threshold: Elevation.goldenHourLower,
            direction: .descending,
            in: day,
            at: coordinate
        )

        return SolarSchedule(
            localDate: localDate,
            timeZoneIdentifier: timeZone.identifier,
            sunrise: sunrise,
            morningGoldenHour: interval(from: morningStart, to: morningEnd),
            sunset: sunset,
            eveningGoldenHour: interval(from: eveningStart, to: eveningEnd),
            status: status(
                sunrise: sunrise,
                sunset: sunset,
                during: day,
                at: coordinate
            )
        )
    }

    func solarElevation(at date: Date, coordinate: Coordinate) -> Double {
        let julianDay = date.timeIntervalSince1970 / 86_400 + 2_440_587.5
        let julianCentury = (julianDay - 2_451_545) / 36_525

        let geometricMeanLongitude = normalizedDegrees(
            280.46646
                + julianCentury * (36_000.76983 + julianCentury * 0.0003032)
        )
        let geometricMeanAnomaly = 357.52911
            + julianCentury * (35_999.05029 - 0.0001537 * julianCentury)
        let orbitEccentricity = 0.016708634
            - julianCentury * (0.000042037 + 0.0000001267 * julianCentury)

        let anomalyRadians = radians(geometricMeanAnomaly)
        let equationOfCenter =
            sin(anomalyRadians)
                * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury))
            + sin(2 * anomalyRadians)
                * (0.019993 - 0.000101 * julianCentury)
            + sin(3 * anomalyRadians) * 0.000289

        let trueLongitude = geometricMeanLongitude + equationOfCenter
        let apparentLongitude = trueLongitude
            - 0.00569
            - 0.00478 * sin(radians(125.04 - 1934.136 * julianCentury))

        let meanObliquity = 23
            + (26
                + (21.448
                    - julianCentury
                        * (46.815
                            + julianCentury * (0.00059 - julianCentury * 0.001813)))
                    / 60)
                / 60
        let correctedObliquity = meanObliquity
            + 0.00256 * cos(radians(125.04 - 1934.136 * julianCentury))

        let obliquityRadians = radians(correctedObliquity)
        let solarDeclination = asin(
            sin(obliquityRadians) * sin(radians(apparentLongitude))
        )

        let y = pow(tan(obliquityRadians / 2), 2)
        let longitudeRadians = radians(geometricMeanLongitude)
        let equationOfTime = 4 * degrees(
            y * sin(2 * longitudeRadians)
                - 2 * orbitEccentricity * sin(anomalyRadians)
                + 4 * orbitEccentricity * y
                    * sin(anomalyRadians) * cos(2 * longitudeRadians)
                - 0.5 * pow(y, 2) * sin(4 * longitudeRadians)
                - 1.25 * pow(orbitEccentricity, 2) * sin(2 * anomalyRadians)
        )

        let utcMinutes = normalizedMinutes(date.timeIntervalSince1970 / 60)
        let trueSolarMinutes = normalizedMinutes(
            utcMinutes + equationOfTime + 4 * coordinate.longitude
        )

        var hourAngle = trueSolarMinutes / 4 - 180
        if hourAngle < -180 {
            hourAngle += 360
        }

        let latitudeRadians = radians(coordinate.latitude)
        let cosineZenith =
            sin(latitudeRadians) * sin(solarDeclination)
            + cos(latitudeRadians) * cos(solarDeclination) * cos(radians(hourAngle))
        let clampedCosineZenith = min(1, max(-1, cosineZenith))
        let zenith = degrees(acos(clampedCosineZenith))

        return 90 - zenith
    }

    private func crossing(
        threshold: Double,
        direction: CrossingDirection,
        in day: DateInterval,
        at coordinate: Coordinate
    ) -> Date? {
        var lowerDate = day.start
        var lowerValue = solarElevation(at: lowerDate, coordinate: coordinate) - threshold

        while lowerDate < day.end {
            let upperDate = min(
                lowerDate.addingTimeInterval(sampleInterval),
                day.end
            )
            let upperValue = solarElevation(at: upperDate, coordinate: coordinate) - threshold

            let crossed: Bool
            switch direction {
            case .ascending:
                crossed = lowerValue <= 0 && upperValue > 0
            case .descending:
                crossed = lowerValue >= 0 && upperValue < 0
            }

            if crossed {
                return refinedCrossing(
                    threshold: threshold,
                    direction: direction,
                    between: lowerDate,
                    and: upperDate,
                    at: coordinate
                )
            }

            lowerDate = upperDate
            lowerValue = upperValue
        }

        return nil
    }

    private func refinedCrossing(
        threshold: Double,
        direction: CrossingDirection,
        between lowerBound: Date,
        and upperBound: Date,
        at coordinate: Coordinate
    ) -> Date {
        var lowerDate = lowerBound
        var upperDate = upperBound

        while upperDate.timeIntervalSince(lowerDate) > 0.25 {
            let midpoint = Date(
                timeIntervalSince1970:
                    (lowerDate.timeIntervalSince1970 + upperDate.timeIntervalSince1970) / 2
            )
            let midpointValue = solarElevation(at: midpoint, coordinate: coordinate) - threshold

            switch direction {
            case .ascending:
                if midpointValue >= 0 {
                    upperDate = midpoint
                } else {
                    lowerDate = midpoint
                }
            case .descending:
                if midpointValue <= 0 {
                    upperDate = midpoint
                } else {
                    lowerDate = midpoint
                }
            }
        }

        return Date(
            timeIntervalSince1970:
                (lowerDate.timeIntervalSince1970 + upperDate.timeIntervalSince1970) / 2
        )
    }

    private func status(
        sunrise: Date?,
        sunset: Date?,
        during day: DateInterval,
        at coordinate: Coordinate
    ) -> SolarSchedule.Status {
        switch (sunrise, sunset) {
        case (.some, .some):
            return .normal
        case (.none, .some):
            return .noSunrise
        case (.some, .none):
            return .noSunset
        case (.none, .none):
            let range = elevationRange(during: day, at: coordinate)
            if range.minimum > Elevation.sunriseSunset {
                return .polarDay
            }
            if range.maximum < Elevation.sunriseSunset {
                return .polarNight
            }
            return .noSunrise
        }
    }

    private func elevationRange(
        during day: DateInterval,
        at coordinate: Coordinate
    ) -> (minimum: Double, maximum: Double) {
        var date = day.start
        var minimum = Double.greatestFiniteMagnitude
        var maximum = -Double.greatestFiniteMagnitude

        while date <= day.end {
            let elevation = solarElevation(at: date, coordinate: coordinate)
            minimum = min(minimum, elevation)
            maximum = max(maximum, elevation)
            date = date.addingTimeInterval(sampleInterval)
        }

        return (minimum, maximum)
    }

    private func interval(from start: Date?, to end: Date?) -> DateInterval? {
        guard let start, let end, end > start else {
            return nil
        }
        return DateInterval(start: start, end: end)
    }

    private func normalizedDegrees(_ value: Double) -> Double {
        let remainder = value.truncatingRemainder(dividingBy: 360)
        return remainder >= 0 ? remainder : remainder + 360
    }

    private func normalizedMinutes(_ value: Double) -> Double {
        let remainder = value.truncatingRemainder(dividingBy: 1_440)
        return remainder >= 0 ? remainder : remainder + 1_440
    }

    private func radians(_ degrees: Double) -> Double {
        degrees * .pi / 180
    }

    private func degrees(_ radians: Double) -> Double {
        radians * 180 / .pi
    }
}
