import Foundation
@preconcurrency import CoreLocation

nonisolated struct PreviewRequest: Codable, Sendable {
    let destination: String
    let travelStyle: String
    let travelerGroup: String
    let tripLength: Int
}

nonisolated struct GuideChatRequest: Codable, Sendable {
    let destination: String
    let message: String
    let history: [GuideMessage]
    let tripId: String?
}

@MainActor
final class TravelPlannerService {
    private let apiBaseURLString: String = Config.EXPO_PUBLIC_RORK_API_BASE_URL
    private let geocoder: CLGeocoder = CLGeocoder()

    // Token is set after auth so the service can attach it to requests
    var authToken: String?

    // MARK: - Trip generation
    func generatePlan(from answers: SessionAnswers, origin: LocationCoordinate) async -> TripPlan {
        if let remotePlan = try? await fetchRemotePlan(from: answers) {
            return remotePlan
        }
        return await makeMockPlan(from: answers, origin: origin)
    }

    // MARK: - Guide chat
    func reply(to prompt: String, plan: TripPlan, history: [GuideMessage] = []) async -> GuideMessage {
        if let remoteReply = try? await fetchRemoteReply(prompt: prompt, destination: plan.destinationCity, history: history) {
            return remoteReply
        }

        try? await Task.sleep(for: .milliseconds(300))
        let text = "If you have ten extra minutes here, slow down and look past the obvious façade. In \(plan.destinationCity), the best details are usually a little off-center: the tiled doorway, the older regulars at the counter, the view that opens only once you step two streets farther than most people do. Right now, I'd notice the textures, order something local instead of familiar, and avoid the busiest photo angle unless you want to queue for it."
        return GuideMessage(role: "assistant", text: text)
    }

    // MARK: - Private — remote
    private func fetchRemotePlan(from answers: SessionAnswers) async throws -> TripPlan {
        guard let url = URL(string: "/v1/trips/full", relativeTo: URL(string: apiBaseURLString)),
              !apiBaseURLString.isEmpty else {
            throw URLError(.badURL)
        }

        let requestBody = PreviewRequest(
            destination: answers.destination,
            travelStyle: answers.style?.rawValue ?? "",
            travelerGroup: answers.group?.rawValue ?? "",
            tripLength: answers.tripLength
        )

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONEncoder().encode(requestBody)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              200 ..< 300 ~= httpResponse.statusCode else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(TripPlan.self, from: data)
    }

    private func fetchRemoteReply(prompt: String, destination: String, history: [GuideMessage]) async throws -> GuideMessage {
        guard let url = URL(string: "/v1/guide/chat", relativeTo: URL(string: apiBaseURLString)),
              !apiBaseURLString.isEmpty else {
            throw URLError(.badURL)
        }

        let payload = GuideChatRequest(destination: destination, message: prompt, history: history, tripId: nil)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 20
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONEncoder().encode(payload)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              200 ..< 300 ~= httpResponse.statusCode else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(GuideMessage.self, from: data)
    }

    // MARK: - Mock fallback (when backend URL is empty or unreachable)
    private func makeMockPlan(from answers: SessionAnswers, origin: LocationCoordinate) async -> TripPlan {
        let suggestion = suggestion(for: answers.style ?? .culture)
        let resolvedDestination = answers.destination.trimmingCharacters(in: .whitespacesAndNewlines)
        let city = resolvedDestination.isEmpty ? suggestion.city : resolvedDestination
        let coordinate = await destinationCoordinate(for: city, fallback: suggestion.coordinate)
        let country = resolvedDestination.isEmpty ? suggestion.country : inferredCountry(for: city, fallback: suggestion.country)
        let styleLine = answers.style?.rawValue ?? TravelStyle.culture.rawValue
        let groupLine = answers.group?.rawValue ?? TravelerGroup.couple.rawValue

        let fullDays: [ItineraryDay] = (1 ... max(answers.tripLength, 2)).map { index in
            ItineraryDay(
                dayNumber: index,
                title: "Day \(index)",
                mood: index == 1 ? "Soft landing" : index == answers.tripLength ? "Last look" : "Momentum day",
                summary: "Built for \(groupLine.lowercased()) travelers who like \(styleLine.lowercased()).",
                moments: [
                    ItineraryMoment(
                        timeLabel: index == 1 ? "09:00" : "08:30",
                        title: morningTitle(for: index, city: city),
                        subtitle: "A polished start that makes the rest of the day flow naturally",
                        rationale: "This is when \(city) feels generous instead of crowded.",
                        transitNote: "Walk if you can.",
                        avoidNote: "Skip the obvious breakfast near the main square."
                    ),
                    ItineraryMoment(
                        timeLabel: "12:30",
                        title: middayTitle(for: index, city: city),
                        subtitle: "The signature moment, placed exactly when it works best",
                        rationale: "You are hitting this at the sweet spot — enough energy, not too much.",
                        transitNote: "Keep the route compact.",
                        avoidNote: "Don't overbook lunch."
                    ),
                    ItineraryMoment(
                        timeLabel: "18:45",
                        title: eveningTitle(for: index, city: city),
                        subtitle: "A finish with texture, light, and local confidence",
                        rationale: "Evenings are where \(city) starts speaking in a lower voice.",
                        transitNote: "Arrive just before golden hour.",
                        avoidNote: "Avoid the first rooftop everyone tags."
                    )
                ]
            )
        }

        let hiddenPlaces: [HiddenPlace] = [
            HiddenPlace(name: "Blue Hour Steps",    neighborhood: "Old Quarter",      vibe: "Quiet viewpoint",   note: "Not dramatic on first glance, which is exactly why it stays good.",            bestTime: "Just before sunset",  coordinate: coordinate),
            HiddenPlace(name: "Marrow Café",        neighborhood: "Local backstreet", vibe: "Low-key favorite",  note: "The kind of café locals protect by not overexplaining it.",                   bestTime: "10:30–11:30",         coordinate: coordinate),
            HiddenPlace(name: "Thread Market Lane", neighborhood: "Near the market",  vibe: "Texture and color", note: "You're here for the in-between moments: shopfronts and little exchanges.",    bestTime: "Early afternoon",     coordinate: coordinate),
            HiddenPlace(name: "After-Rain Terrace", neighborhood: "Riverside edge",   vibe: "Underrated table",  note: "Go after a shower or on a windy day. It's prettier when slightly inconvenient.", bestTime: "Late afternoon",      coordinate: coordinate)
        ]

        return TripPlan(
            destinationCity: city,
            destinationCountry: country,
            intro: "\(city) for \(groupLine.lowercased()) travelers, planned with a local brain.",
            shareLine: "This \(city) plan looks like someone with taste made it for me.",
            previewDays: Array(fullDays.prefix(1)),
            fullDays: fullDays,
            hiddenPlaces: hiddenPlaces,
            heroCoordinate: origin,
            destinationCoordinate: coordinate
        )
    }

    private func destinationCoordinate(for city: String, fallback: LocationCoordinate) async -> LocationCoordinate {
        guard !city.isEmpty else { return fallback }
        do {
            let placemarks = try await geocoder.geocodeAddressString(city)
            if let c = placemarks.first?.location?.coordinate {
                return LocationCoordinate(latitude: c.latitude, longitude: c.longitude)
            }
        } catch {}
        return fallback
    }

    private func inferredCountry(for city: String, fallback: String) -> String {
        let l = city.lowercased()
        if l.contains("lisbon")      { return "Portugal" }
        if l.contains("kyoto")       { return "Japan" }
        if l.contains("mexico city") { return "Mexico" }
        if l.contains("istanbul")    { return "Turkey" }
        return fallback
    }

    private func suggestion(for style: TravelStyle) -> DestinationSuggestion {
        switch style {
        case .slow:      DestinationSuggestion(city: "Lisbon",      country: "Portugal", pitch: "Layered, sunny, and full of unhurried corners.",               coordinate: LocationCoordinate(latitude: 38.7223, longitude: -9.1393))
        case .food:      DestinationSuggestion(city: "Mexico City", country: "Mexico",   pitch: "Big appetite city. Deep flavor, design, and late lunches.",     coordinate: LocationCoordinate(latitude: 19.4326, longitude: -99.1332))
        case .culture:   DestinationSuggestion(city: "Kyoto",       country: "Japan",    pitch: "Quiet precision, rituals, and streets that reward patience.",   coordinate: LocationCoordinate(latitude: 35.0116, longitude: 135.7681))
        case .nightlife: DestinationSuggestion(city: "Istanbul",    country: "Turkey",   pitch: "Moody, magnetic, and alive long after dinner.",                 coordinate: LocationCoordinate(latitude: 41.0082, longitude: 28.9784))
        }
    }

    private func morningTitle(for day: Int, city: String) -> String {
        day == 1 ? "Ease into \(city) with a neighbourhood breakfast" : "A morning walk before the city speeds up"
    }

    private func middayTitle(for day: Int, city: String) -> String {
        day.isMultiple(of: 2) ? "Your anchor lunch and one standout address" : "A high-value cultural stop without the tourist timing"
    }

    private func eveningTitle(for day: Int, city: String) -> String {
        day == 1 ? "Golden hour and a dinner table worth dressing for" : "A low-light finish with local energy"
    }
}
