import CoreLocation
import Foundation
import Observation

struct UserLocation: Equatable, Sendable {
    let coordinate: Coordinate
    let horizontalAccuracy: CLLocationAccuracy
    let timestamp: Date
}

@MainActor
@Observable
final class LocationService: NSObject {
    enum Authorization: Equatable, Sendable {
        case notDetermined
        case restricted
        case denied
        case authorized
    }

    enum LocationError: Equatable, Sendable {
        case servicesDisabled
        case unavailable
    }

    private(set) var authorization: Authorization = .notDetermined
    private(set) var userLocation: UserLocation?
    private(set) var error: LocationError?
    private(set) var isRefreshing = false

    @ObservationIgnored
    private let manager: CLLocationManager

    override init() {
        let manager = CLLocationManager()
        self.manager = manager
        super.init()

        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        manager.distanceFilter = 50
        authorization = Self.authorization(from: manager.authorizationStatus)
    }

    func start() {
        authorization = Self.authorization(from: manager.authorizationStatus)
        applyLastKnownLocationIfUseful()

        if authorization == .authorized {
            refresh()
        }
    }

    func requestPermission() {
        error = nil
        switch authorization {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorized:
            refresh()
        case .restricted, .denied:
            break
        }
    }

    func refresh() {
        guard authorization == .authorized else {
            requestPermission()
            return
        }

        error = nil
        isRefreshing = true
        manager.requestLocation()
    }

    private func applyLastKnownLocationIfUseful() {
        guard
            let location = manager.location,
            location.horizontalAccuracy >= 0,
            location.timestamp.timeIntervalSinceNow > -10 * 60,
            let coordinate = Coordinate(validating: location.coordinate)
        else {
            return
        }

        userLocation = UserLocation(
            coordinate: coordinate,
            horizontalAccuracy: location.horizontalAccuracy,
            timestamp: location.timestamp
        )
    }

    private func handleAuthorizationChange(_ status: CLAuthorizationStatus) {
        authorization = Self.authorization(from: status)

        switch authorization {
        case .authorized:
            error = nil
            applyLastKnownLocationIfUseful()
            refresh()
        case .restricted, .denied:
            isRefreshing = false
        case .notDetermined:
            break
        }
    }

    private static func authorization(from status: CLAuthorizationStatus) -> Authorization {
        switch status {
        case .notDetermined:
            return .notDetermined
        case .restricted:
            return .restricted
        case .denied:
            return .denied
        case .authorizedAlways, .authorizedWhenInUse:
            return .authorized
        @unknown default:
            return .denied
        }
    }
}

extension LocationService: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor [weak self] in
            self?.handleAuthorizationChange(status)
        }
    }

    nonisolated func locationManager(
        _ manager: CLLocationManager,
        didUpdateLocations locations: [CLLocation]
    ) {
        guard
            let location = locations.last,
            location.horizontalAccuracy >= 0,
            let coordinate = Coordinate(validating: location.coordinate)
        else {
            return
        }

        let userLocation = UserLocation(
            coordinate: coordinate,
            horizontalAccuracy: location.horizontalAccuracy,
            timestamp: location.timestamp
        )

        Task { @MainActor [weak self] in
            self?.userLocation = userLocation
            self?.isRefreshing = false
            self?.error = nil
        }
    }

    nonisolated func locationManager(
        _ manager: CLLocationManager,
        didFailWithError error: Error
    ) {
        let code = (error as? CLError)?.code

        Task { @MainActor [weak self] in
            self?.isRefreshing = false
            if code == .denied, self?.authorization == .authorized {
                self?.error = .servicesDisabled
            } else if code != .denied {
                self?.error = .unavailable
            }
        }
    }
}
