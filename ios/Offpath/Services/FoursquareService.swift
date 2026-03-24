import Foundation
import CoreLocation

// MARK: - Google Places API (via Offpath backend)
// Direct place lookups from the iOS app go through the backend,
// which calls Google Places API server-side. This service is a
// thin client used only in the offline mock fallback.

struct FSQPlace: Sendable {
    let name: String
    let address: String
    let category: String
    let coordinate: CLLocationCoordinate2D
}

// PlacesService replaces the old FoursquareService.
// In the offline/mock path it returns an empty list — the backend
// handles all real Google Places lookups server-side.
final class FoursquareService: Sendable {

    var isConfigured: Bool { false }  // direct iOS calls disabled; backend handles this

    func destinationPlaces(near coordinate: CLLocationCoordinate2D) async -> [FSQPlace] {
        // Real place data comes from the backend (/v1/trips/full).
        // Return empty here so the mock fallback uses its built-in titles.
        return []
    }
}
