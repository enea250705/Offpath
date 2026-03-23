import Foundation

// MARK: - Pexels Photos API
// Docs: https://www.pexels.com/api/documentation/

struct PexelsPhoto: Sendable {
    let id: Int
    let photographer: String
    let largeURL: URL
    let mediumURL: URL
}

final class PexelsService: Sendable {
    private let apiKey: String

    init(apiKey: String = Config.pexelsAPIKey) {
        self.apiKey = apiKey
    }

    var isConfigured: Bool { !apiKey.isEmpty }

    // Search for photos of a destination city.
    // Returns up to `count` photos, or empty array if key not set.
    func photos(for destination: String, count: Int = 8) async -> [PexelsPhoto] {
        guard isConfigured else { return [] }

        // Use "city travel" to get scenic, travel-quality shots
        let query = "\(destination) travel city"
        var components = URLComponents(string: "https://api.pexels.com/v1/search")!
        components.queryItems = [
            .init(name: "query",    value: query),
            .init(name: "per_page", value: "\(count)"),
            .init(name: "page",     value: "1"),
            .init(name: "orientation", value: "portrait")   // phone-friendly
        ]

        guard let url = components.url else { return [] }
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 8

        guard let (data, _) = try? await URLSession.shared.data(for: request) else { return [] }

        struct Response: Decodable {
            struct Photo: Decodable {
                let id: Int
                let photographer: String
                struct Src: Decodable {
                    let large2x: String
                    let large: String
                    let medium: String
                }
                let src: Src
            }
            let photos: [Photo]
        }

        guard let decoded = try? JSONDecoder().decode(Response.self, from: data) else { return [] }

        return decoded.photos.compactMap { p in
            guard let largeURL  = URL(string: p.src.large2x.isEmpty ? p.src.large : p.src.large2x),
                  let mediumURL = URL(string: p.src.medium) else { return nil }
            return PexelsPhoto(id: p.id, photographer: p.photographer,
                               largeURL: largeURL, mediumURL: mediumURL)
        }
    }
}
