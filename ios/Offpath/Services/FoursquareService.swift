import Foundation
import CoreLocation

// MARK: - Foursquare Places API v3
// Docs: https://docs.foursquare.com/developer/reference/place-search

struct FSQPlace: Sendable {
    let name: String
    let address: String
    let category: String
    let coordinate: CLLocationCoordinate2D
}

enum FSQCategory: String {
    case dining     = "13065"   // Dining and Drinking
    case cafe       = "13035"   // Coffee Shop
    case culture    = "10000"   // Arts and Entertainment
    case landmark   = "16000"   // Landmarks and Outdoors
    case nightlife  = "10020"   // Nightlife Spot
    case historic   = "16032"   // Historic and Protected Site
}

final class FoursquareService: Sendable {
    private let apiKey: String

    init(apiKey: String = Config.foursquareAPIKey) {
        self.apiKey = apiKey
    }

    var isConfigured: Bool { !apiKey.isEmpty }

    // Fetch top places near a coordinate for a given category.
    func places(near coordinate: CLLocationCoordinate2D,
                category: FSQCategory,
                limit: Int = 5) async -> [FSQPlace] {
        guard isConfigured else { return [] }

        var components = URLComponents(string: "https://api.foursquare.com/v3/places/search")!
        components.queryItems = [
            .init(name: "ll",         value: "\(coordinate.latitude),\(coordinate.longitude)"),
            .init(name: "categories", value: category.rawValue),
            .init(name: "limit",      value: "\(limit)"),
            .init(name: "sort",       value: "POPULARITY"),
            .init(name: "fields",     value: "name,location,categories")
        ]

        guard let url = components.url else { return [] }
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 8

        guard let (data, _) = try? await URLSession.shared.data(for: request) else { return [] }

        struct Response: Decodable {
            struct Result: Decodable {
                let name: String
                struct Location: Decodable {
                    let address: String?
                    let locality: String?
                    let formatted_address: String?
                }
                struct Category: Decodable { let name: String }
                let location: Location
                let categories: [Category]?
                let geocodes: Geocodes?
                struct Geocodes: Decodable {
                    struct Point: Decodable { let latitude: Double; let longitude: Double }
                    let main: Point?
                }
            }
            let results: [Result]
        }

        guard let decoded = try? JSONDecoder().decode(Response.self, from: data) else { return [] }

        return decoded.results.compactMap { r in
            let addr = r.location.formatted_address ?? r.location.address ?? r.location.locality ?? ""
            let cat  = r.categories?.first?.name ?? category.rawValue
            let lat  = r.geocodes?.main?.latitude  ?? coordinate.latitude
            let lon  = r.geocodes?.main?.longitude ?? coordinate.longitude
            return FSQPlace(
                name: r.name,
                address: addr,
                category: cat,
                coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lon)
            )
        }
    }

    // Convenience: fetch a mixed set of places for a destination
    // Returns up to ~15 places across dining, culture, and hidden gems.
    func destinationPlaces(near coordinate: CLLocationCoordinate2D) async -> [FSQPlace] {
        async let dining    = places(near: coordinate, category: .dining,    limit: 4)
        async let culture   = places(near: coordinate, category: .culture,   limit: 4)
        async let landmarks = places(near: coordinate, category: .landmark,  limit: 3)
        async let cafes     = places(near: coordinate, category: .cafe,      limit: 3)
        async let nightlife = places(near: coordinate, category: .nightlife, limit: 3)

        let all = await dining + culture + landmarks + cafes + nightlife
        // Shuffle so itinerary days feel varied
        return all.shuffled()
    }
}
