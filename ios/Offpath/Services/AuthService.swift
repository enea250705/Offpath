import Foundation

nonisolated struct AuthPayload: Codable, Sendable {
    let email: String
    let password: String
    let displayName: String?
}

nonisolated struct SocialAuthPayload: Codable, Sendable {
    let provider: String
    let token: String
    let displayName: String?
}

// Backend response shape — maps to AuthUser
nonisolated private struct AuthResponse: Codable, Sendable {
    let id: String
    let email: String
    let displayName: String
    let token: String
}

@MainActor
final class AuthService {
    private let baseURLString: String = Config.EXPO_PUBLIC_RORK_AUTH_URL

    // Force HTTP/1.1 or HTTP/2 — avoids Render's HTTP/3 (QUIC) framing errors on simulators.
    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.assumesHTTP3Capable = false
        return URLSession(configuration: config)
    }()

    private func fetch(_ request: URLRequest) async throws -> (Data, URLResponse) {
        try await Self.session.data(for: request)
    }

    // MARK: - Email auth
    func signInOrCreate(email: String, password: String, displayName: String?) async throws -> AuthUser {
        guard let url = URL(string: "/v1/auth/email", relativeTo: URL(string: baseURLString)),
              !baseURLString.isEmpty else {
            try await Task.sleep(for: .milliseconds(450))
            let resolvedName = displayName?.isEmpty == false
                ? displayName ?? "Traveler"
                : email.split(separator: "@").first.map(String.init) ?? "Traveler"
            return AuthUser(email: email, displayName: resolvedName.capitalized)
        }

        let payload = AuthPayload(email: email, password: password, displayName: displayName)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 60
        request.httpBody = try JSONEncoder().encode(payload)

        let (data, response) = try await fetch(request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        if httpResponse.statusCode == 401 {
            throw URLError(.userAuthenticationRequired)
        }
        guard 200 ..< 300 ~= httpResponse.statusCode else {
            throw URLError(.badServerResponse)
        }

        let auth = try JSONDecoder().decode(AuthResponse.self, from: data)
        return AuthUser(
            id: UUID(uuidString: auth.id) ?? UUID(),
            email: auth.email,
            displayName: auth.displayName,
            token: auth.token
        )
    }

    // MARK: - Social auth
    func socialSignIn(provider: SocialProvider, token: String?, displayName: String?) async throws -> AuthUser {
        guard let url = URL(string: "/v1/auth/social", relativeTo: URL(string: baseURLString)),
              !baseURLString.isEmpty,
              let token else {
            try await Task.sleep(for: .milliseconds(250))
            let name = displayName ?? (provider == .apple ? "Apple User" : "Google User")
            let email = provider == .apple ? "apple@offpath.app" : "google@offpath.app"
            return AuthUser(email: email, displayName: name)
        }

        let payload = SocialAuthPayload(provider: provider.rawValue, token: token, displayName: displayName)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 60
        request.httpBody = try JSONEncoder().encode(payload)

        let (data, response) = try await fetch(request)
        guard let httpResponse = response as? HTTPURLResponse,
              200 ..< 300 ~= httpResponse.statusCode else {
            throw URLError(.badServerResponse)
        }

        let auth = try JSONDecoder().decode(AuthResponse.self, from: data)
        return AuthUser(
            id: UUID(uuidString: auth.id) ?? UUID(),
            email: auth.email,
            displayName: auth.displayName,
            token: auth.token
        )
    }
}
