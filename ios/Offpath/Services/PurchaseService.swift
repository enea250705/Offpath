import StoreKit

// MARK: - Purchase Service (StoreKit 2)
// Wire: Create the product IDs from Config.IAP in App Store Connect before shipping.
// Everything else is self-contained and ready.

@Observable
@MainActor
final class PurchaseService {

    private(set) var products: [Product] = []
    private(set) var purchasedProductIDs: Set<String> = []
    private var updatesTask: Task<Void, Never>?

    // MARK: - Access level
    var hasFullAccess: Bool {
        purchasedProductIDs.contains(Config.IAP.tripPass) ||
        purchasedProductIDs.contains(Config.IAP.tripPack) ||
        purchasedProductIDs.contains(Config.IAP.yearly)
    }

    // MARK: - Lifecycle
    func start() {
        updatesTask = Task { [weak self] in
            await self?.listenForTransactionUpdates()
        }
        Task { await loadProducts() }
        Task { await refreshEntitlements() }
    }

    deinit {
        updatesTask?.cancel()
    }

    // MARK: - Load products from App Store
    func loadProducts() async {
        do {
            products = try await Product.products(for: [
                Config.IAP.tripPass,
                Config.IAP.tripPack,
                Config.IAP.yearly
            ])
            products.sort { $0.price < $1.price }
        } catch {
            // Products not found — App Store Connect not configured yet.
            // App continues with mock/free mode.
            products = []
        }
    }

    // MARK: - Purchase
    // Returns true if purchase succeeded, false if cancelled or pending.
    // Throws on hard errors (network, billing).
    func purchase(_ product: Product) async throws -> Bool {
        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            switch verification {
            case .verified(let transaction):
                purchasedProductIDs.insert(transaction.productID)
                await transaction.finish()
                return true
            case .unverified:
                return false
            }
        case .userCancelled:
            return false
        case .pending:
            return false
        @unknown default:
            return false
        }
    }

    // MARK: - Restore purchases (required by App Store guidelines)
    func restorePurchases() async {
        try? await AppStore.sync()
        await refreshEntitlements()
    }

    // MARK: - Helpers
    func product(for id: String) -> Product? {
        products.first { $0.id == id }
    }

    func formattedPrice(for id: String) -> String {
        product(for: id)?.displayPrice ?? "—"
    }

    // MARK: - Private
    private func refreshEntitlements() async {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result {
                purchasedProductIDs.insert(transaction.productID)
            }
        }
    }

    private func listenForTransactionUpdates() async {
        for await result in Transaction.updates {
            if case .verified(let transaction) = result {
                purchasedProductIDs.insert(transaction.productID)
                await transaction.finish()
            }
        }
    }
}
