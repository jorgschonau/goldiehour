import CoreLocation
import Foundation
import MapKit

@MainActor
struct SpotSearchService {
    enum SearchError: LocalizedError {
        case unavailable

        var errorDescription: String? {
            "Places could not be loaded. Check your connection and try again."
        }
    }

    private let scenicQueries = [
        "scenic viewpoint",
        "nature reserve",
    ]

    func search(in region: MKCoordinateRegion) async throws -> [Spot] {
        var mapItems: [MKMapItem] = []
        var completedRequest = false

        do {
            mapItems += try await searchOutdoorCategories(in: region)
            completedRequest = true
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            if isEmptyResult(error) {
                completedRequest = true
            }
        }

        for query in scenicQueries {
            do {
                mapItems += try await search(query: query, in: region)
                completedRequest = true
            } catch is CancellationError {
                throw CancellationError()
            } catch {
                if isEmptyResult(error) {
                    completedRequest = true
                }
            }
        }

        try Task.checkCancellation()

        guard completedRequest else {
            throw SearchError.unavailable
        }

        let spots = mapItems
            .compactMap(spot(from:))
            .filter { region.contains($0.coordinate) }

        return Self.deduplicated(spots)
            .sorted {
                distance(from: $0.coordinate, to: region.center)
                    < distance(from: $1.coordinate, to: region.center)
            }
            .prefix(40)
            .map(\.self)
    }

    static func deduplicated(_ spots: [Spot]) -> [Spot] {
        var seen = Set<String>()
        return spots.filter { seen.insert($0.id).inserted }
    }

    private func searchOutdoorCategories(in region: MKCoordinateRegion) async throws -> [MKMapItem] {
        let request = MKLocalPointsOfInterestRequest(coordinateRegion: region)
        request.pointOfInterestFilter = MKPointOfInterestFilter(
            including: [
                .beach,
                .campground,
                .marina,
                .nationalPark,
                .park,
            ]
        )

        return try await MKLocalSearch(pointsOfInterestRequest: request).start().mapItems
    }

    private func search(query: String, in region: MKCoordinateRegion) async throws -> [MKMapItem] {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.region = region
        request.resultTypes = .pointOfInterest

        return try await MKLocalSearch(request: request).start().mapItems
    }

    private func spot(from mapItem: MKMapItem) -> Spot? {
        guard
            let name = mapItem.name?.trimmingCharacters(in: .whitespacesAndNewlines),
            !name.isEmpty,
            let coordinate = Coordinate(validating: mapItem.placemark.coordinate)
        else {
            return nil
        }

        let placemark = mapItem.placemark
        return Spot(
            name: name,
            coordinate: coordinate,
            locality: placemark.locality,
            administrativeArea: placemark.administrativeArea,
            countryCode: placemark.isoCountryCode,
            categoryIdentifier: mapItem.pointOfInterestCategory?.rawValue,
            timeZoneIdentifier: (mapItem.timeZone ?? placemark.timeZone)?.identifier
        )
    }

    private func isEmptyResult(_ error: Error) -> Bool {
        (error as? MKError)?.code == .placemarkNotFound
    }

    private func distance(
        from coordinate: Coordinate,
        to center: CLLocationCoordinate2D
    ) -> CLLocationDistance {
        CLLocation(
            latitude: coordinate.latitude,
            longitude: coordinate.longitude
        ).distance(
            from: CLLocation(latitude: center.latitude, longitude: center.longitude)
        )
    }
}

private extension MKCoordinateRegion {
    func contains(_ coordinate: Coordinate) -> Bool {
        let halfLatitude = span.latitudeDelta / 2
        let minimumLatitude = center.latitude - halfLatitude
        let maximumLatitude = center.latitude + halfLatitude

        guard (minimumLatitude...maximumLatitude).contains(coordinate.latitude) else {
            return false
        }

        let halfLongitude = span.longitudeDelta / 2
        let difference = abs(coordinate.longitude - center.longitude)
        let wrappedDifference = min(difference, 360 - difference)
        return wrappedDifference <= halfLongitude
    }
}
