import XCTest
@testable import GoldieHour

final class SpotSearchServiceTests: XCTestCase {
    func testStableIDIgnoresCaseAndDiacritics() {
        let coordinate = Coordinate(latitude: 48.123456, longitude: 11.654321)

        let first = Spot.stableID(name: "Schöner Blick", coordinate: coordinate)
        let second = Spot.stableID(name: "SCHONER BLICK", coordinate: coordinate)

        XCTAssertEqual(first, second)
    }

    @MainActor
    func testDeduplicationKeepsFirstMatchingSpot() {
        let coordinate = Coordinate(latitude: 48.123456, longitude: 11.654321)
        let first = Spot(name: "Viewpoint", coordinate: coordinate, locality: "First")
        let duplicate = Spot(name: "Viewpoint", coordinate: coordinate, locality: "Second")
        let other = Spot(
            name: "Lakeside Park",
            coordinate: Coordinate(latitude: 48.2, longitude: 11.7)
        )

        let result = SpotSearchService.deduplicated([first, duplicate, other])

        XCTAssertEqual(result, [first, other])
    }
}
