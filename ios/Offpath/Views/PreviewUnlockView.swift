import SwiftUI

struct PreviewUnlockView: View {
    let viewModel: OffpathViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                hero
                introCard
                previewDaySection
                unlockCard
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 18)
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(viewModel.plan?.destinationCity ?? "Your trip")
                .font(.system(.largeTitle, design: .default, weight: .bold))
                .foregroundStyle(.white)

            Text(viewModel.plan?.shareLine ?? "This plan is too pretty not to share.")
                .font(.title3.weight(.medium))
                .foregroundStyle(.white.opacity(0.82))
        }
    }

    private var introCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Preview")
                .font(.caption.weight(.semibold))
                .kerning(1.8)
                .foregroundStyle(.secondary)

            Text(viewModel.plan?.intro ?? "")
                .font(.title3.weight(.semibold))
                .foregroundStyle(.primary)
        }
        .padding(22)
        .background(.regularMaterial, in: .rect(cornerRadius: 28))
    }

    private var previewDaySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Your first day")
                .font(.title2.weight(.bold))
                .foregroundStyle(.white)

            ForEach(viewModel.previewDays) { day in
                GuideDayCard(day: day)
            }
        }
    }

    private var unlockCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Save your trip and unlock the full itinerary")
                .font(.title2.weight(.bold))

            Text("You've got the shape of the trip. Sign up now and the full plan, hidden places, and local guide come with you instantly.")
                .font(.body)
                .foregroundStyle(.secondary)

            VStack(spacing: 10) {
                // Free — just auth, no purchase
                TierRow(
                    title: "Free",
                    detail: "Full itinerary + 2 hidden places + 3 guide messages",
                    isLoading: false
                ) {
                    viewModel.showAuth()
                }

                // Paid tiers — purchase then auth
                TierRow(
                    title: "Trip Pass  \(viewModel.purchaseService.formattedPrice(for: Config.IAP.tripPass).isEmpty ? "$2.99" : viewModel.purchaseService.formattedPrice(for: Config.IAP.tripPass))",
                    detail: "One full destination, every detail unlocked",
                    isLoading: viewModel.isPurchasing
                ) {
                    Task { await viewModel.purchase(productID: Config.IAP.tripPass) }
                }

                TierRow(
                    title: "3 Trip Pack  \(viewModel.purchaseService.formattedPrice(for: Config.IAP.tripPack).isEmpty ? "$6.99" : viewModel.purchaseService.formattedPrice(for: Config.IAP.tripPack))",
                    detail: "Your next three escapes, fully planned",
                    isLoading: viewModel.isPurchasing
                ) {
                    Task { await viewModel.purchase(productID: Config.IAP.tripPack) }
                }

                TierRow(
                    title: "Yearly Unlimited  \(viewModel.purchaseService.formattedPrice(for: Config.IAP.yearly).isEmpty ? "$19.99" : viewModel.purchaseService.formattedPrice(for: Config.IAP.yearly))",
                    detail: "Plan every trip, never like a tourist again",
                    isLoading: viewModel.isPurchasing
                ) {
                    Task { await viewModel.purchase(productID: Config.IAP.yearly) }
                }
            }

            Button {
                Task { await viewModel.restorePurchases() }
            } label: {
                Text("Restore purchases")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.plain)
        }
        .padding(22)
        .background(.thickMaterial, in: .rect(cornerRadius: 28))
    }
}

struct TierRow: View {
    let title: String
    let detail: String
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "sparkle")
                    .foregroundStyle(.orange)
                    .padding(.top, 2)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.headline)
                    Text(detail)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if isLoading {
                    ProgressView().padding(.top, 2)
                }
            }
            .padding(14)
            .background(Color(.secondarySystemBackground).opacity(0.6), in: .rect(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .disabled(isLoading)
    }
}

// MARK: - GuideDayCard (shared with MainTripView)
struct GuideDayCard: View {
    let day: ItineraryDay

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(day.title).font(.title3.weight(.bold))
                    Text(day.mood)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(day.summary)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.trailing)
            }

            VStack(spacing: 14) {
                ForEach(day.moments) { moment in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(moment.timeLabel)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Text(moment.title).font(.headline)
                        Text(moment.rationale)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 20))
                }
            }
        }
        .padding(22)
        .background(.regularMaterial, in: .rect(cornerRadius: 28))
    }
}
