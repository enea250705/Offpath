import SwiftUI
import GoogleSignIn

@main
struct OffpathApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .tint(.blue)
                .onOpenURL { url in
                    // Required for Google Sign-In to complete the OAuth flow
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}
