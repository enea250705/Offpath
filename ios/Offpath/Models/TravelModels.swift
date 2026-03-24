import Foundation
import CoreLocation

nonisolated enum DestinationMode: String, CaseIterable, Identifiable, Codable, Sendable {
    case know = "I know where I want to go"
    case suggest = "Surprise me with ideas"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .know:
            "Planned"
        case .suggest:
            "Open-minded"
        }
    }
}

nonisolated enum TravelStyle: String, CaseIterable, Identifiable, Codable, Sendable {
    case slow = "Slow discovery"
    case food = "Food first"
    case culture = "Culture and design"
    case nightlife = "Late nights"

    var id: String { rawValue }
}

nonisolated enum TravelerGroup: String, CaseIterable, Identifiable, Codable, Sendable {
    case solo = "Solo"
    case couple = "Couple"
    case group = "Group"

    var id: String { rawValue }
}

nonisolated enum AppPhase: String, Sendable {
    case onboarding
    case generating
    case stories     // post-generation cinematic stories
    case preview
    case auth
    case trip
}

nonisolated enum SocialProvider: String, Identifiable, Codable, Sendable {
    case apple
    case google

    var id: String { rawValue }
}

nonisolated struct LocationCoordinate: Codable, Hashable, Sendable {
    let latitude: Double
    let longitude: Double

    var clCoordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

nonisolated struct SessionAnswers: Codable, Sendable {
    var destinationMode: DestinationMode?
    var destination: String = ""
    var style: TravelStyle?
    var group: TravelerGroup?
    var tripLength: Int = 4
}

nonisolated struct DestinationSuggestion: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let city: String
    let country: String
    let pitch: String
    let coordinate: LocationCoordinate

    init(id: UUID = UUID(), city: String, country: String, pitch: String, coordinate: LocationCoordinate) {
        self.id = id
        self.city = city
        self.country = country
        self.pitch = pitch
        self.coordinate = coordinate
    }
}

nonisolated struct ItineraryMoment: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let timeLabel: String
    let title: String
    let subtitle: String
    let rationale: String
    let transitNote: String
    let avoidNote: String
    let coordinate: LocationCoordinate

    init(id: UUID = UUID(), timeLabel: String, title: String, subtitle: String, rationale: String, transitNote: String, avoidNote: String, coordinate: LocationCoordinate) {
        self.id = id
        self.timeLabel = timeLabel
        self.title = title
        self.subtitle = subtitle
        self.rationale = rationale
        self.transitNote = transitNote
        self.avoidNote = avoidNote
        self.coordinate = coordinate
    }
}

nonisolated struct ItineraryDay: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let dayNumber: Int
    let title: String
    let mood: String
    let summary: String
    let moments: [ItineraryMoment]

    init(id: UUID = UUID(), dayNumber: Int, title: String, mood: String, summary: String, moments: [ItineraryMoment]) {
        self.id = id
        self.dayNumber = dayNumber
        self.title = title
        self.mood = mood
        self.summary = summary
        self.moments = moments
    }
}

nonisolated struct HiddenPlace: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let name: String
    let neighborhood: String
    let vibe: String
    let note: String
    let bestTime: String
    let coordinate: LocationCoordinate

    init(id: UUID = UUID(), name: String, neighborhood: String, vibe: String, note: String, bestTime: String, coordinate: LocationCoordinate) {
        self.id = id
        self.name = name
        self.neighborhood = neighborhood
        self.vibe = vibe
        self.note = note
        self.bestTime = bestTime
        self.coordinate = coordinate
    }
}

nonisolated struct GuideMessage: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let role: String
    let text: String
    let timestamp: Date

    init(id: UUID = UUID(), role: String, text: String, timestamp: Date = Date()) {
        self.id        = id
        self.role      = role
        self.text      = text
        self.timestamp = timestamp
    }

    // Backend only sends role + text — fill in the rest with defaults
    init(from decoder: Decoder) throws {
        let c       = try decoder.container(keyedBy: CodingKeys.self)
        self.id        = (try? c.decode(UUID.self,   forKey: .id))        ?? UUID()
        self.role      = try  c.decode(String.self,  forKey: .role)
        self.text      = try  c.decode(String.self,  forKey: .text)
        self.timestamp = (try? c.decode(Date.self,   forKey: .timestamp)) ?? Date()
    }
}

nonisolated struct AuthUser: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let email: String
    let displayName: String
    let token: String        // JWT — sent as Bearer token on all authenticated requests

    init(id: UUID = UUID(), email: String, displayName: String, token: String = "") {
        self.id          = id
        self.email       = email
        self.displayName = displayName
        self.token       = token
    }
}

nonisolated struct TripPlan: Codable, Sendable {
    let id: String?
    let destinationCity: String
    let destinationCountry: String
    let intro: String
    let shareLine: String
    let previewDays: [ItineraryDay]
    let fullDays: [ItineraryDay]
    let hiddenPlaces: [HiddenPlace]
    let heroCoordinate: LocationCoordinate
    let destinationCoordinate: LocationCoordinate

    init(id: String? = nil, destinationCity: String, destinationCountry: String, intro: String, shareLine: String, previewDays: [ItineraryDay], fullDays: [ItineraryDay], hiddenPlaces: [HiddenPlace], heroCoordinate: LocationCoordinate, destinationCoordinate: LocationCoordinate) {
        self.id = id
        self.destinationCity = destinationCity
        self.destinationCountry = destinationCountry
        self.intro = intro
        self.shareLine = shareLine
        self.previewDays = previewDays
        self.fullDays = fullDays
        self.hiddenPlaces = hiddenPlaces
        self.heroCoordinate = heroCoordinate
        self.destinationCoordinate = destinationCoordinate
    }
}
