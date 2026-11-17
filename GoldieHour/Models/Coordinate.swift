import CoreLocation
import Foundation

struct Coordinate: Codable, Hashable, Sendable {
    let latitude: Double
    let longitude: Double

    init(latitude: Double, longitude: Double) {
        precondition((-90...90).contains(latitude), "Latitude must be between -90 and 90.")
        precondition((-180...180).contains(longitude), "Longitude must be between -180 and 180.")

        self.latitude = latitude
        self.longitude = longitude
    }

    init(_ coordinate: CLLocationCoordinate2D) {
        self.init(latitude: coordinate.latitude, longitude: coordinate.longitude)
    }

    init?(validating coordinate: CLLocationCoordinate2D) {
        guard
            CLLocationCoordinate2DIsValid(coordinate),
            coordinate.latitude.isFinite,
            coordinate.longitude.isFinite
        else {
            return nil
        }

        self.init(coordinate)
    }

    var clLocationCoordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}
