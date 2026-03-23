import Foundation
import Observation
import CoreLocation

@Observable
@MainActor
final class LocationService: NSObject, CLLocationManagerDelegate {
    private let manager: CLLocationManager = CLLocationManager()

    var authorizationStatus: CLAuthorizationStatus = .notDetermined
    var lastLocation: CLLocation?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    var currentCoordinate: LocationCoordinate {
        if let location = lastLocation {
            return LocationCoordinate(latitude: location.coordinate.latitude, longitude: location.coordinate.longitude)
        }

        return LocationCoordinate(latitude: 40.7128, longitude: -74.0060)
    }

    func requestAccessIfNeeded() {
        if authorizationStatus == .notDetermined {
            manager.requestWhenInUseAuthorization()
        } else if authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways {
            manager.requestLocation()
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            authorizationStatus = manager.authorizationStatus
            if manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways {
                manager.requestLocation()
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else {
            return
        }

        Task { @MainActor in
            lastLocation = location
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Location unavailable — currentCoordinate falls back to NYC until a real fix arrives.
        // This is expected when permission is denied or indoors with no signal.
        #if DEBUG
        print("[LocationService] failed: \(error.localizedDescription)")
        #endif
    }
}
