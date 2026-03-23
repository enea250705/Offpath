import Foundation

// MARK: - Backend Configuration
// Fill in your URLs when the backend is ready.
// Leave empty to run entirely on mock data (works offline, safe for testing).
enum Config {
    // Auth service base URL  e.g. "https://api.offpath.com"
    static let authBaseURL: String = "https://offpath.onrender.com"

    // Trip & guide API base URL
    static let apiBaseURL: String = "https://offpath.onrender.com"

    // MARK: - In-App Purchase Product IDs
    // Create these exact product IDs in App Store Connect → Your App → Monetization → In-App Purchases
    enum IAP {
        static let tripPass   = "com.offpath.app.trippass"    // $2.99  — one full destination
        static let tripPack   = "com.offpath.app.trippack3"   // $6.99  — three destinations
        static let yearly     = "com.offpath.app.yearly"      // $19.99 — unlimited, auto-renewing subscription
    }

    // MARK: - Google Sign-In
    static let googleClientID = "650828421062-engpkpdrm7lj2umolnfc9eugdbgq7mrb.apps.googleusercontent.com"

    // MARK: - Foursquare Places API v3
    // Get your key at https://foursquare.com/developers/signup
    static let foursquareAPIKey: String = ""   // ← paste your FSQ key here

    // MARK: - Pexels Photos API
    // Get your key at https://www.pexels.com/api/
    static let pexelsAPIKey: String = ""       // ← paste your Pexels key here

    // MARK: - Legacy aliases used by AuthService / TravelPlannerService
    static let EXPO_PUBLIC_RORK_AUTH_URL    = authBaseURL
    static let EXPO_PUBLIC_RORK_API_BASE_URL = apiBaseURL
}
