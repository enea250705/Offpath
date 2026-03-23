import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class OffpathViewModel {
    let plannerService: TravelPlannerService
    let authService: AuthService
    let locationService: LocationService
    let purchaseService: PurchaseService

    var appPhase: AppPhase = .onboarding
    var answers: SessionAnswers = SessionAnswers()
    var currentQuestionIndex: Int = 0
    var isGenerating: Bool = false
    var plan: TripPlan?
    var guideMessages: [GuideMessage] = [
        GuideMessage(role: "assistant", text: "I'll be your local while you're there. Ask me what's worth noticing, where locals actually go after dinner, or what's overrated around you.")
    ]
    var draftGuideInput: String = ""
    var authModeIsLogin: Bool = false
    var authEmail: String = ""
    var authPassword: String = ""
    var authName: String = ""
    var isAuthenticating: Bool = false
    var currentUser: AuthUser?
    var selectedTab: TripTab = .itinerary
    var errorMessage: String?
    var isPurchasing: Bool = false

    // MARK: - Access gate
    var hasFullAccess: Bool {
        purchaseService.hasFullAccess
    }

    // Days shown depend on whether the user has paid
    var displayDays: [ItineraryDay] {
        hasFullAccess ? (plan?.fullDays ?? []) : (plan?.previewDays ?? [])
    }

    var displayHiddenPlaces: [HiddenPlace] {
        let all = plan?.hiddenPlaces ?? []
        return hasFullAccess ? all : Array(all.prefix(2))
    }

    // MARK: - Init
    init() {
        self.plannerService  = TravelPlannerService()
        self.authService     = AuthService()
        self.locationService = LocationService()
        self.purchaseService = PurchaseService()
        restoreSession()
    }

    init(
        plannerService: TravelPlannerService,
        authService: AuthService,
        locationService: LocationService,
        purchaseService: PurchaseService
    ) {
        self.plannerService  = plannerService
        self.authService     = authService
        self.locationService = locationService
        self.purchaseService = purchaseService
    }

    // MARK: - Session restore
    private func restoreSession() {
        if let user = KeychainService.load(AuthUser.self, key: KeychainService.keyUser) {
            currentUser = user
            plannerService.authToken = user.token
            if let savedPlan = loadPersistedPlan() {
                plan = savedPlan
                appPhase = .trip
            } else {
                appPhase = .onboarding
            }
        }
    }

    // MARK: - Plan persistence (UserDefaults)
    func persistPlan(_ plan: TripPlan) {
        guard let data = try? JSONEncoder().encode(plan) else { return }
        UserDefaults.standard.set(data, forKey: "offpath.currentPlan")
    }

    func loadPersistedPlan() -> TripPlan? {
        guard let data = UserDefaults.standard.data(forKey: "offpath.currentPlan") else { return nil }
        return try? JSONDecoder().decode(TripPlan.self, from: data)
    }

    func clearPersistedPlan() {
        UserDefaults.standard.removeObject(forKey: "offpath.currentPlan")
    }

    // MARK: - Onboarding
    var canContinueQuestion: Bool {
        switch currentQuestionIndex {
        case 0:
            return answers.destinationMode != nil
        case 1:
            if answers.destinationMode == .suggest {
                return answers.style != nil
            }
            return !answers.destination.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case 2:
            return answers.group != nil
        case 3:
            return answers.tripLength > 0
        default:
            return false
        }
    }

    var currentQuestionTitle: String {
        switch currentQuestionIndex {
        case 0: return "First things first"
        case 1: return answers.destinationMode == .suggest ? "What kind of trip feels right?" : "Where are you headed?"
        case 2: return "Who's coming with you?"
        case 3: return "How long are you staying?"
        default: return ""
        }
    }

    var currentQuestionPrompt: String {
        switch currentQuestionIndex {
        case 0: return "Do you already know where you want to go, or do you want a good suggestion?"
        case 1: return answers.destinationMode == .suggest ? "Pick the energy. I'll take care of the destination." : "Give me the city. I'll make it make sense."
        case 2: return "Solo, couple, or a group changes the rhythm more than people think."
        case 3: return "I plan differently for a long weekend than for a proper stay."
        default: return ""
        }
    }

    var previewDays: [ItineraryDay]    { plan?.previewDays ?? [] }
    var fullDays: [ItineraryDay]       { plan?.fullDays ?? [] }
    var hiddenPlaces: [HiddenPlace]    { plan?.hiddenPlaces ?? [] }

    func start() {
        locationService.requestAccessIfNeeded()
        purchaseService.start()
    }

    func advanceQuestion() {
        guard canContinueQuestion else { return }
        if currentQuestionIndex < 3 {
            withAnimation(.snappy) { currentQuestionIndex += 1 }
        } else {
            Task { await generateTripPreview() }
        }
    }

    func generateTripPreview() async {
        isGenerating = true
        appPhase = .generating
        let generatedPlan = await plannerService.generatePlan(from: answers, origin: locationService.currentCoordinate)
        plan = generatedPlan
        persistPlan(generatedPlan)
        isGenerating = false
        appPhase = .preview
    }

    func showAuth() {
        appPhase = .auth
    }

    // MARK: - Auth (email)
    func completeEmailAuth() async {
        guard !authEmail.isEmpty, !authPassword.isEmpty else {
            errorMessage = "Enter your email and password to continue."
            return
        }
        isAuthenticating = true
        defer { isAuthenticating = false }
        do {
            let user = try await authService.signInOrCreate(
                email: authEmail,
                password: authPassword,
                displayName: authName.isEmpty ? nil : authName
            )
            finishAuth(user: user)
        } catch {
            errorMessage = "Couldn't sign you in. Check your details and try again."
        }
    }

    // MARK: - Auth (Apple — real credential)
    func completeAppleAuth(token: String, fullName: String?) async {
        isAuthenticating = true
        defer { isAuthenticating = false }
        do {
            let user = try await authService.socialSignIn(provider: .apple, token: token, displayName: fullName)
            finishAuth(user: user)
        } catch {
            errorMessage = "Apple Sign-In failed. Please try again."
        }
    }

    // MARK: - Auth (Google)
    func completeGoogleAuth() async {
        isAuthenticating = true
        defer { isAuthenticating = false }
        do {
            let result = try await GoogleSignInService.signIn()
            let user = try await authService.socialSignIn(
                provider: .google,
                token: result.token,
                displayName: result.displayName
            )
            finishAuth(user: user)
        } catch {
            errorMessage = "Google Sign-In failed. Please try again."
        }
    }

    // MARK: - Sign out
    func signOut() {
        currentUser = nil
        plan = nil
        KeychainService.delete(key: KeychainService.keyUser)
        clearPersistedPlan()
        answers = SessionAnswers()
        currentQuestionIndex = 0
        guideMessages = [
            GuideMessage(role: "assistant", text: "I'll be your local while you're there. Ask me what's worth noticing, where locals actually go after dinner, or what's overrated around you.")
        ]
        withAnimation { appPhase = .onboarding }
    }

    // MARK: - In-App Purchase
    func purchase(productID: String) async {
        guard let product = purchaseService.product(for: productID) else {
            errorMessage = "This purchase isn't available right now."
            return
        }
        isPurchasing = true
        defer { isPurchasing = false }
        do {
            let success = try await purchaseService.purchase(product)
            if success {
                // Purchase complete — go to auth if not logged in, else stay on trip
                if currentUser == nil {
                    appPhase = .auth
                }
            }
        } catch {
            errorMessage = "Purchase failed. Please try again."
        }
    }

    func restorePurchases() async {
        isPurchasing = true
        defer { isPurchasing = false }
        await purchaseService.restorePurchases()
    }

    // MARK: - Guide chat
    func sendGuideMessage() async {
        let trimmed = draftGuideInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let plan else { return }
        let userMessage = GuideMessage(role: "user", text: trimmed)
        guideMessages.append(userMessage)
        draftGuideInput = ""
        let reply = await plannerService.reply(to: trimmed, plan: plan)
        guideMessages.append(reply)
    }

    // MARK: - Private
    private func finishAuth(user: AuthUser) {
        currentUser = user
        plannerService.authToken = user.token
        KeychainService.save(user, key: KeychainService.keyUser)
        appPhase = .trip
    }
}

// MARK: - Tab definition
nonisolated enum TripTab: String, CaseIterable, Identifiable, Sendable {
    case itinerary
    case hidden
    case guide
    #if DEBUG
    case backend
    #endif

    var id: String { rawValue }

    var title: String {
        switch self {
        case .itinerary: return "Plan"
        case .hidden:    return "Hidden"
        case .guide:     return "Guide"
        #if DEBUG
        case .backend:   return "Build"
        #endif
        }
    }

    var symbol: String {
        switch self {
        case .itinerary: return "sparkles.rectangle.stack"
        case .hidden:    return "eye.slash.circle"
        case .guide:     return "bubble.left.and.bubble.right"
        #if DEBUG
        case .backend:   return "server.rack"
        #endif
        }
    }
}
