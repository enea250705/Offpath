import GoogleSignIn
import UIKit

// MARK: - Google Sign-In
// Requires the GoogleSignIn Swift Package.
// Add it in Xcode: File → Add Package Dependencies
// URL: https://github.com/google/GoogleSignIn-iOS
// Add product: GoogleSignIn

@MainActor
enum GoogleSignInService {

    struct GoogleUser {
        let token: String
        let displayName: String?
        let email: String
    }

    static func signIn() async throws -> GoogleUser {
        guard
            let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
            let rootVC = windowScene.windows.first?.rootViewController
        else {
            throw URLError(.cancelled)
        }

        let config = GIDConfiguration(clientID: Config.googleClientID)
        GIDSignIn.sharedInstance.configuration = config

        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootVC)

        guard let idToken = result.user.idToken?.tokenString else {
            throw URLError(.userAuthenticationRequired)
        }

        return GoogleUser(
            token: idToken,
            displayName: result.user.profile?.name,
            email: result.user.profile?.email ?? ""
        )
    }
}
