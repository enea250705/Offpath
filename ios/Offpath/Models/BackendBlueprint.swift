import Foundation

nonisolated struct BackendEndpoint: Identifiable, Hashable, Sendable {
    let id: UUID
    let method: String
    let path: String
    let purpose: String

    init(id: UUID = UUID(), method: String, path: String, purpose: String) {
        self.id = id
        self.method = method
        self.path = path
        self.purpose = purpose
    }
}

nonisolated struct DatabaseColumn: Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let type: String
    let details: String

    init(id: UUID = UUID(), name: String, type: String, details: String) {
        self.id = id
        self.name = name
        self.type = type
        self.details = details
    }
}

nonisolated struct DatabaseTable: Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let columns: [DatabaseColumn]

    init(id: UUID = UUID(), name: String, columns: [DatabaseColumn]) {
        self.id = id
        self.name = name
        self.columns = columns
    }
}

nonisolated enum BackendBlueprint {
    static let endpoints: [BackendEndpoint] = [
        BackendEndpoint(method: "POST", path: "/v1/auth/email", purpose: "Create an account or sign in with email and password"),
        BackendEndpoint(method: "POST", path: "/v1/auth/social", purpose: "Exchange Apple or Google credentials for an Offpath session"),
        BackendEndpoint(method: "POST", path: "/v1/trips/preview", purpose: "Generate the preview itinerary before auth"),
        BackendEndpoint(method: "POST", path: "/v1/trips/full", purpose: "Generate the full premium itinerary after auth or purchase"),
        BackendEndpoint(method: "POST", path: "/v1/guide/chat", purpose: "Reply as the in-destination local guide with trip context"),
        BackendEndpoint(method: "GET", path: "/v1/places/hidden", purpose: "Fetch hidden places for a destination and traveler profile"),
        BackendEndpoint(method: "POST", path: "/v1/purchases/validate", purpose: "Attach Trip Pass, 3 Trip Pack, or Yearly Unlimited access to the account")
    ]

    static let schema: [DatabaseTable] = [
        DatabaseTable(name: "users", columns: [
            DatabaseColumn(name: "id", type: "uuid", details: "primary key"),
            DatabaseColumn(name: "email", type: "text", details: "unique, nullable for social-only drafts"),
            DatabaseColumn(name: "display_name", type: "text", details: "profile name"),
            DatabaseColumn(name: "apple_subject", type: "text", details: "nullable, unique"),
            DatabaseColumn(name: "google_subject", type: "text", details: "nullable, unique"),
            DatabaseColumn(name: "created_at", type: "timestamptz", details: "default now()")
        ]),
        DatabaseTable(name: "trip_sessions", columns: [
            DatabaseColumn(name: "id", type: "uuid", details: "primary key"),
            DatabaseColumn(name: "user_id", type: "uuid", details: "nullable until signup"),
            DatabaseColumn(name: "destination", type: "text", details: "city or suggested destination"),
            DatabaseColumn(name: "travel_style", type: "text", details: "slow, food, culture, nightlife"),
            DatabaseColumn(name: "traveler_group", type: "text", details: "solo, couple, group"),
            DatabaseColumn(name: "trip_length", type: "integer", details: "days"),
            DatabaseColumn(name: "phase", type: "text", details: "draft, preview, unlocked"),
            DatabaseColumn(name: "created_at", type: "timestamptz", details: "default now()")
        ]),
        DatabaseTable(name: "itineraries", columns: [
            DatabaseColumn(name: "id", type: "uuid", details: "primary key"),
            DatabaseColumn(name: "trip_session_id", type: "uuid", details: "foreign key"),
            DatabaseColumn(name: "payload_json", type: "jsonb", details: "full itinerary and hidden places"),
            DatabaseColumn(name: "share_line", type: "text", details: "viral share copy"),
            DatabaseColumn(name: "created_at", type: "timestamptz", details: "default now()")
        ]),
        DatabaseTable(name: "guide_messages", columns: [
            DatabaseColumn(name: "id", type: "uuid", details: "primary key"),
            DatabaseColumn(name: "trip_session_id", type: "uuid", details: "foreign key"),
            DatabaseColumn(name: "role", type: "text", details: "user or assistant"),
            DatabaseColumn(name: "content", type: "text", details: "chat message"),
            DatabaseColumn(name: "created_at", type: "timestamptz", details: "default now()")
        ]),
        DatabaseTable(name: "purchases", columns: [
            DatabaseColumn(name: "id", type: "uuid", details: "primary key"),
            DatabaseColumn(name: "user_id", type: "uuid", details: "foreign key"),
            DatabaseColumn(name: "product_id", type: "text", details: "trip_pass, trip_pack_3, yearly_unlimited"),
            DatabaseColumn(name: "destination", type: "text", details: "nullable for yearly plan"),
            DatabaseColumn(name: "expires_at", type: "timestamptz", details: "nullable for non-expiring access"),
            DatabaseColumn(name: "created_at", type: "timestamptz", details: "default now()")
        ])
    ]
}
