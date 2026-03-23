import Foundation
import Observation
import CoreLocation
import UserNotifications

@Observable
@MainActor
final class LocationService: NSObject, CLLocationManagerDelegate {
    private let manager: CLLocationManager = CLLocationManager()

    var authorizationStatus: CLAuthorizationStatus = .notDetermined
    var lastLocation: CLLocation?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    var currentCoordinate: LocationCoordinate {
        if let location = lastLocation {
            return LocationCoordinate(latitude: location.coordinate.latitude, longitude: location.coordinate.longitude)
        }
        return LocationCoordinate(latitude: 40.7128, longitude: -74.0060)
    }

    func requestAccessIfNeeded() {
        switch authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        default:
            break
        }
    }

    // MARK: - Geofencing
    func scheduleGeofences(for plan: TripPlan) {
        // Remove old monitors
        for region in manager.monitoredRegions {
            manager.stopMonitoring(for: region)
        }

        guard authorizationStatus == .authorizedAlways ||
              authorizationStatus == .authorizedWhenInUse else { return }

        // Register a geofence for each itinerary moment
        var count = 0
        for day in plan.fullDays {
            for moment in day.moments {
                guard count < 15 else { return } // iOS max 20 regions
                let coord = plan.destinationCoordinate.clCoordinate
                let region = CLCircularRegion(
                    center: coord,
                    radius: 150,
                    identifier: "offpath-\(moment.id)"
                )
                region.notifyOnEntry = true
                region.notifyOnExit  = false
                manager.startMonitoring(for: region)
                count += 1
            }
        }
    }

    // MARK: - CLLocationManagerDelegate
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            authorizationStatus = manager.authorizationStatus
            if manager.authorizationStatus == .authorizedWhenInUse ||
               manager.authorizationStatus == .authorizedAlways {
                manager.requestLocation()
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        Task { @MainActor in lastLocation = location }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        #if DEBUG
        print("[LocationService] failed: \(error.localizedDescription)")
        #endif
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        guard region.identifier.hasPrefix("offpath-") else { return }
        let content = UNMutableNotificationContent()
        content.title = "You're here!"
        content.body  = "Open Offpath to get local tips for this spot from your guide."
        content.sound = .default
        let request = UNNotificationRequest(
            identifier: region.identifier,
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request)
    }
}
