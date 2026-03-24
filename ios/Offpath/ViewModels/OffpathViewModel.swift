import Foundation
import Observation
import SwiftUI
import UserNotifications

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

    // Full itinerary is free for everyone
    var displayDays: [ItineraryDay] {
        plan?.fullDays ?? []
    }

    // Hidden places: 2 free, all 4 with paid
    var displayHiddenPlaces: [HiddenPlace] {
        let all = plan?.hiddenPlaces ?? []
        return hasFullAccess ? all : Array(all.prefix(2))
    }

    // Guide chat: 3 messages free, unlimited with paid
    var freeGuideMessagesUsed: Int {
        guideMessages.filter { $0.role == "user" }.count
    }

    var canSendGuideMessage: Bool {
        hasFullAccess || freeGuideMessagesUsed < 3
    }

    var guideMessagesRemaining: Int {
        max(0, 3 - freeGuideMessagesUsed)
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
                if let savedMessages = loadPersistedGuideMessages() {
                    guideMessages = savedMessages
                }
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

    // MARK: - Guide messages persistence (UserDefaults)
    private func persistGuideMessages() {
        guard let data = try? JSONEncoder().encode(guideMessages) else { return }
        UserDefaults.standard.set(data, forKey: "offpath.guideMessages")
    }

    private func loadPersistedGuideMessages() -> [GuideMessage]? {
        guard let data = UserDefaults.standard.data(forKey: "offpath.guideMessages") else { return nil }
        return try? JSONDecoder().decode([GuideMessage].self, from: data)
    }

    private func clearPersistedGuideMessages() {
        UserDefaults.standard.removeObject(forKey: "offpath.guideMessages")
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
        requestNotificationPermission()
    }

    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
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

        // Run AI generation and minimum animation time concurrently.
        // The screen only advances when BOTH are done — animation always plays fully.
        // Animation: 120 steps × 55ms = 6.6s flight + 2.8s zoom = ~9.5s total.
        async let generatedPlan = plannerService.generatePlan(from: answers, origin: locationService.currentCoordinate)
        async let minimumWait: Void? = try? Task.sleep(for: .seconds(9.5))

        let (result, _) = await (generatedPlan, minimumWait)

        plan = result
        persistPlan(result)
        isGenerating = false
        locationService.scheduleGeofences(for: result)
        appPhase = .stories
    }

    func advanceFromStories() {
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
        clearPersistedGuideMessages()
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
    func sendGuideMessage(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let plan else { return }
        guard canSendGuideMessage else {
            errorMessage = "You've used your 3 free messages. Unlock unlimited with a Trip Pass."
            return
        }
        let userMessage = GuideMessage(role: "user", text: trimmed)
        guideMessages.append(userMessage)
        persistGuideMessages()
        let reply = await plannerService.reply(to: trimmed, plan: plan)
        guideMessages.append(reply)
        persistGuideMessages()
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
    case map
    case account

    var id: String { rawValue }

    var title: String {
        switch self {
        case .itinerary: return "Plan"
        case .hidden:    return "Hidden"
        case .guide:     return "Guide"
        case .map:       return "Map"
        case .account:   return "You"
        }
    }

    var symbol: String {
        switch self {
        case .itinerary: return "sparkles.rectangle.stack"
        case .hidden:    return "eye.slash.circle"
        case .guide:     return "bubble.left.and.bubble.right"
        case .map:       return "map"
        case .account:   return "person.circle"
        }
    }

    var selectedSymbol: String {
        switch self {
        case .itinerary: return "sparkles.rectangle.stack.fill"
        case .hidden:    return "eye.slash.circle.fill"
        case .guide:     return "bubble.left.and.bubble.right.fill"
        case .map:       return "map.fill"
        case .account:   return "person.circle.fill"
        }
    }
}
