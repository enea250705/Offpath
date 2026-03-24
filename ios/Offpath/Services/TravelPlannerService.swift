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
    private let foursquare = FoursquareService()

    // Render's free tier can return HTTP/3 (QUIC) protocol errors (-1017) on first connection.
    // One retry is enough — iOS falls back to TCP/HTTP2 automatically on the second attempt.
    private func fetch(_ request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await URLSession.shared.data(for: request)
        } catch let error as URLError where error.code.rawValue == -1017 || error.code == .networkConnectionLost {
            // -1017: cannot parse response (QUIC framing error)
            // -1005: network connection lost (QUIC connection dropped by Render)
            // One retry is enough — iOS falls back to TCP/HTTP2 on the second attempt.
            try await Task.sleep(for: .milliseconds(800))
            return try await URLSession.shared.data(for: request)
        }
    }

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
        if let remoteReply = try? await fetchRemoteReply(prompt: prompt, destination: plan.destinationCity, tripId: plan.id, history: history) {
            return remoteReply
        }

        try? await Task.sleep(for: .milliseconds(300))
        let text = "If you have ten extra minutes here, slow down and look past the obvious façade. In \(plan.destinationCity), the best details are usually a little off-center: the tiled doorway, the older regulars at the counter, the view that opens only once you step two streets farther than most people do. Right now, I'd notice the textures, order something local instead of familiar, and avoid the busiest photo angle unless you want to queue for it."
        return GuideMessage(role: "assistant", text: text)
    }

    // MARK: - Load saved guide messages from backend
    func loadGuideMessages(tripId: String) async -> [GuideMessage]? {
        guard let url = URL(string: "/v1/guide/messages/\(tripId)", relativeTo: URL(string: apiBaseURLString)),
              !apiBaseURLString.isEmpty else { return nil }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 10
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let http = response as? HTTPURLResponse,
              200 ..< 300 ~= http.statusCode else { return nil }

        return try? JSONDecoder().decode([GuideMessage].self, from: data)
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

        let (data, response) = try await fetch(request)
        guard let httpResponse = response as? HTTPURLResponse,
              200 ..< 300 ~= httpResponse.statusCode else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(TripPlan.self, from: data)
    }

    private func fetchRemoteReply(prompt: String, destination: String, tripId: String? = nil, history: [GuideMessage]) async throws -> GuideMessage {
        guard let url = URL(string: "/v1/guide/chat", relativeTo: URL(string: apiBaseURLString)),
              !apiBaseURLString.isEmpty else {
            throw URLError(.badURL)
        }

        let payload = GuideChatRequest(destination: destination, message: prompt, history: history, tripId: tripId)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 20
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONEncoder().encode(payload)

        let (data, response) = try await fetch(request)
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
        let (coordinate, country) = await geocodeCity(
            city,
            fallbackCoord: suggestion.coordinate,
            fallbackCountry: suggestion.country
        )
        let styleLine = answers.style?.rawValue ?? TravelStyle.culture.rawValue
        let groupLine = answers.group?.rawValue ?? TravelerGroup.couple.rawValue

        // Fetch real places from Foursquare (silently falls back if key not set)
        let fsqPlaces = await foursquare.destinationPlaces(near: coordinate.clCoordinate)

        // Helper: pull next FSQ name or fall back to a generic title
        var fsqIndex = 0
        func nextPlace(fallback: String) -> String {
            if fsqIndex < fsqPlaces.count {
                let name = fsqPlaces[fsqIndex].name
                fsqIndex += 1
                return name
            }
            return fallback
        }

        let fullDays: [ItineraryDay] = (1 ... max(answers.tripLength, 2)).map { index in
            let isFirst = index == 1
            let isLast  = index == answers.tripLength

            let mood: String
            if isFirst {
                mood = ["First impressions", "Arriving curious", "Touching down easy", "Slow arrival"].randomElement()!
            } else if isLast {
                mood = ["Last look", "Final sweep", "The slow goodbye", "Making it count"].randomElement()!
            } else {
                mood = ["Deep dive", "Full immersion", "Finding the rhythm", "Going further in", "Momentum day"].randomElement()!
            }

            let summaries = [
                "Built for \(groupLine.lowercased()) travelers who want \(styleLine.lowercased()).",
                "A \(styleLine.lowercased()) day shaped around \(groupLine.lowercased()) pacing.",
                "\(groupLine) energy, \(styleLine.lowercased()) sensibility — the mix that works.",
                "Paced for \(groupLine.lowercased()) travelers who know the difference.",
            ]

            return ItineraryDay(
                dayNumber: index,
                title: morningTitle(for: index, city: city),
                mood: mood,
                summary: summaries.randomElement()!,
                moments: [
                    ItineraryMoment(
                        timeLabel: isFirst ? "09:00" : "08:30",
                        title: nextPlace(fallback: morningTitle(for: index, city: city)),
                        subtitle: [
                            "A polished start that makes the rest of the day flow naturally",
                            "The kind of morning that sets the whole trip's tone",
                            "Early and unhurried — the city at its most honest",
                            "Before the crowds decide the pace for you",
                        ].randomElement()!,
                        rationale: [
                            "This is when \(city) feels generous instead of crowded.",
                            "Before noon, the city belongs to the people who live in it.",
                            "Morning light here is different — softer and less performed.",
                            "\(city) rewards early risers with a version of itself most visitors never see.",
                        ].randomElement()!,
                        transitNote: ["Walk if you can.", "Ten minutes on foot from most starting points.", "The walk itself is half the experience."].randomElement()!,
                        avoidNote: ["Skip the obvious breakfast near the main square.", "Don't order the tourist menu.", "Avoid the hotel breakfast — there's better a few streets over."].randomElement()!,
                        coordinate: coordinate
                    ),
                    ItineraryMoment(
                        timeLabel: "12:30",
                        title: nextPlace(fallback: middayTitle(for: index, city: city)),
                        subtitle: [
                            "The signature moment, placed exactly when it works best",
                            "A midday anchor that earns the afternoon",
                            "High point of the day — timed right on purpose",
                        ].randomElement()!,
                        rationale: [
                            "You are hitting this at the sweet spot — enough energy, not too much.",
                            "Midday is when this place runs at full capacity without feeling like a show.",
                            "The light and foot traffic align at this hour. Worth it.",
                        ].randomElement()!,
                        transitNote: ["Keep the route compact.", "A short walk or one metro stop.", "On foot if the weather holds."].randomElement()!,
                        avoidNote: ["Don't overbook lunch.", "Skip the set menu near the landmark.", "Avoid peak hour — shift by 30 minutes if you can."].randomElement()!,
                        coordinate: coordinate
                    ),
                    ItineraryMoment(
                        timeLabel: "18:45",
                        title: nextPlace(fallback: eveningTitle(for: index, city: city)),
                        subtitle: [
                            "A finish with texture, light, and local confidence",
                            "The day earns its ending here",
                            "How you close a day in a city that knows how to do it",
                        ].randomElement()!,
                        rationale: [
                            "Evenings are where \(city) starts speaking in a lower voice.",
                            "The shift from afternoon to evening is when \(city) gets interesting.",
                            "After 6pm, the tourist layer peels back and the real city shows up.",
                        ].randomElement()!,
                        transitNote: ["Arrive just before golden hour.", "Walk the last stretch — the light changes as you move.", "Go slowly. Evenings here aren't meant to be rushed."].randomElement()!,
                        avoidNote: ["Avoid the first rooftop everyone tags.", "Skip the restaurant nearest the main attraction.", "Don't rush — evenings here aren't supposed to be efficient."].randomElement()!,
                        coordinate: coordinate
                    )
                ]
            )
        }

        // Hidden places — use FSQ names if available, else generic
        let hiddenVibes: [[String]] = [
            ["Quiet viewpoint", "Neighborhood anchor", "Off the feed", "Locals only"],
            ["Low-key favorite", "Worth the detour", "Hidden in plain sight", "Unhurried stop"],
            ["Texture and color", "Market energy", "Real city stuff", "Slow afternoon"],
            ["Underrated table", "No-caption moment", "Best kept secret", "Good timing spot"],
        ]
        let hiddenNotes: [[String]] = [
            ["Not dramatic on first glance, which is exactly why it stays good.", "Most people walk past it. That's the point.", "The appeal here is consistency — it doesn't try."],
            ["The kind of café locals protect by not overexplaining it.", "Find it once and you'll feel territorial about it forever.", "No sign outside is usually a good sign."],
            ["You're here for the in-between moments: shopfronts and little exchanges.", "The texture matters more than the transaction.", "Wander slowly — the details are the thing."],
            ["Go after a shower or on a windy day. It's prettier when slightly inconvenient.", "The best version of this place is slightly off-season.", "Late afternoon, when the light gets interesting."],
        ]
        let hiddenTimes: [[String]] = [
            ["Just before sunset", "Golden hour", "After 5pm", "Late afternoon light"],
            ["10:30–11:30", "Morning, before 11", "First thing", "Early, before it fills"],
            ["Early afternoon", "Right after lunch", "13:00–15:00", "Quiet afternoon"],
            ["Late afternoon", "Around 4pm", "After the lunch crowd", "When the rush slows"],
        ]
        let hiddenNames  = ["Blue Hour Steps", "Marrow Café", "Thread Market Lane", "After-Rain Terrace"]
        let hiddenHoods  = ["Old Quarter", "Local backstreet", "Near the market", "Riverside edge"]

        let hiddenPlaces: [HiddenPlace] = (0..<4).map { i in
            HiddenPlace(
                name: nextPlace(fallback: hiddenNames[i]),
                neighborhood: hiddenHoods[i],
                vibe: hiddenVibes[i].randomElement()!,
                note: hiddenNotes[i].randomElement()!,
                bestTime: hiddenTimes[i].randomElement()!,
                coordinate: coordinate
            )
        }

        let intros = [
            "\(city) for \(groupLine.lowercased()) travelers, planned with a local brain.",
            "\(city) done right — paced for \(groupLine.lowercased()), with the edges left in.",
            "A \(groupLine.lowercased()) trip to \(city) with the kind of detail most guides skip.",
            "\(city) at \(styleLine.lowercased()) pace. Everything in the right order.",
        ]
        let shareLines = [
            "This \(city) plan looks like someone with taste made it for me.",
            "Someone actually thought about \(city) properly for once.",
            "Finally a \(city) trip that doesn't read like a travel blog.",
            "This is the \(city) trip I've been trying to build myself for years.",
        ]

        return TripPlan(
            destinationCity: city,
            destinationCountry: country,
            intro: intros.randomElement()!,
            shareLine: shareLines.randomElement()!,
            previewDays: Array(fullDays.prefix(1)),
            fullDays: fullDays,
            hiddenPlaces: hiddenPlaces,
            heroCoordinate: origin,
            destinationCoordinate: coordinate
        )
    }

    // Geocode the city name once and return both coordinate and country.
    private func geocodeCity(_ city: String, fallbackCoord: LocationCoordinate, fallbackCountry: String) async -> (LocationCoordinate, String) {
        guard !city.isEmpty else { return (fallbackCoord, fallbackCountry) }
        do {
            let placemarks = try await geocoder.geocodeAddressString(city)
            let best = placemarks.first(where: { $0.country != nil }) ?? placemarks.first
            let coord = best?.location?.coordinate
            let country = best?.country ?? fallbackCountry
            if let coord {
                return (LocationCoordinate(latitude: coord.latitude, longitude: coord.longitude), country)
            }
        } catch {}
        return (fallbackCoord, fallbackCountry)
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
