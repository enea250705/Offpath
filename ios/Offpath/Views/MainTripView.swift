import SwiftUI

struct MainTripView: View {
    let viewModel: OffpathViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    titleBlock
                    tabStrip

                    switch viewModel.selectedTab {
                    case .itinerary:
                        ItineraryScreen(
                            days: viewModel.displayDays,
                            intro: viewModel.plan?.intro ?? ""
                        )
                    case .hidden:
                        HiddenPlacesScreen(
                            hiddenPlaces: viewModel.displayHiddenPlaces,
                            hasFullAccess: viewModel.hasFullAccess,
                            onUpgrade: { viewModel.appPhase = .preview }
                        )
                    case .guide:
                        GuideChatScreen(viewModel: viewModel)
                    #if DEBUG
                    case .backend:
                        BackendBlueprintScreen()
                    #endif
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
            }
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var titleBlock: some View {
        HStack {
            VStack(alignment: .leading, spacing: 10) {
                Text(viewModel.plan?.destinationCity ?? "Offpath")
                    .font(.system(.largeTitle, design: .default, weight: .bold))
                    .foregroundStyle(.white)
                Text(viewModel.plan?.shareLine ?? "")
                    .font(.headline)
                    .foregroundStyle(.white.opacity(0.8))
            }
            Spacer()
            // Sign-out button
            Button {
                viewModel.signOut()
            } label: {
                Image(systemName: "arrow.backward.circle")
                    .font(.title2)
                    .foregroundStyle(.white.opacity(0.7))
            }
            .buttonStyle(.plain)
        }
    }

    private var tabStrip: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 10) {
                ForEach(TripTab.allCases) { tab in
                    let isSelected = viewModel.selectedTab == tab
                    Button {
                        withAnimation(.snappy) { viewModel.selectedTab = tab }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: tab.symbol)
                            Text(tab.title)
                        }
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(isSelected ? .white : .white.opacity(0.12), in: .capsule)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(isSelected ? .black : .white)
                }
            }
        }
        .contentMargins(.horizontal, 0)
        .scrollIndicators(.hidden)
    }
}

// MARK: - Itinerary

struct ItineraryScreen: View {
    let days: [ItineraryDay]
    let intro: String

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text(intro)
                .font(.title3.weight(.semibold))
                .foregroundStyle(.white)

            ForEach(days) { day in
                GuideDayCard(day: day)
            }
        }
    }
}

// MARK: - Hidden Places

struct HiddenPlacesScreen: View {
    let hiddenPlaces: [HiddenPlace]
    let hasFullAccess: Bool
    let onUpgrade: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Hidden Places")
                .font(.title2.weight(.bold))
                .foregroundStyle(.white)

            Text("These are the places that make the itinerary feel passed to you, not searched for.")
                .font(.body)
                .foregroundStyle(.white.opacity(0.76))

            ForEach(hiddenPlaces) { place in
                HiddenPlaceCard(place: place)
            }

            if !hasFullAccess {
                UpgradeBanner(message: "Unlock all hidden spots with a Trip Pass", action: onUpgrade)
            }
        }
    }
}

struct HiddenPlaceCard: View {
    let place: HiddenPlace

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(place.name).font(.title3.weight(.bold))
                    Text(place.neighborhood)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(place.vibe)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.black.opacity(0.08), in: .capsule)
            }

            Text(place.note).font(.body).foregroundStyle(.primary)

            Label(place.bestTime, systemImage: "sparkles")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.orange)
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [.yellow.opacity(0.22), .orange.opacity(0.16), .white.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: .rect(cornerRadius: 28)
        )
        .overlay { RoundedRectangle(cornerRadius: 28).strokeBorder(.white.opacity(0.24)) }
    }
}

// MARK: - Guide Chat

struct GuideChatScreen: View {
    let viewModel: OffpathViewModel

    var body: some View {
        @Bindable var vm = viewModel

        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Local Guide")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(.white)
                Spacer()
                if !viewModel.hasFullAccess {
                    Text("\(viewModel.guideMessagesRemaining) free message\(viewModel.guideMessagesRemaining == 1 ? "" : "s") left")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.7))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(.white.opacity(0.15), in: .capsule)
                }
            }

            VStack(spacing: 12) {
                ForEach(viewModel.guideMessages) { message in
                    GuideBubble(message: message)
                }
            }

            if !viewModel.canSendGuideMessage {
                UpgradeBanner(message: "Unlock unlimited guide messages with a Trip Pass") {
                    viewModel.appPhase = .preview
                }
            } else {
                HStack(spacing: 12) {
                    TextField("Ask what matters here", text: $vm.draftGuideInput)
                        .padding(.horizontal, 16)
                        .frame(height: 52)
                        .background(.regularMaterial, in: .rect(cornerRadius: 18))

                    Button {
                        Task { await viewModel.sendGuideMessage() }
                    } label: {
                        Image(systemName: "arrow.up")
                            .font(.headline.weight(.bold))
                            .frame(width: 52, height: 52)
                            .background(.white, in: .circle)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.black)
                }
            }
        }
    }
}

struct GuideBubble: View {
    let message: GuideMessage

    var body: some View {
        HStack {
            if message.role == "assistant" {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Offpath Local")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text(message.text).font(.body)
                }
                .padding(16)
                .background(.regularMaterial, in: .rect(cornerRadius: 22))
                Spacer(minLength: 30)
            } else {
                Spacer(minLength: 30)
                Text(message.text)
                    .font(.body)
                    .foregroundStyle(.white)
                    .padding(16)
                    .background(.black.opacity(0.8), in: .rect(cornerRadius: 22))
            }
        }
    }
}

// MARK: - Upgrade banner

struct UpgradeBanner: View {
    let message: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: "lock.open.fill")
                    .foregroundStyle(.orange)
                Text(message)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(.secondary)
            }
            .padding(18)
            .background(.regularMaterial, in: .rect(cornerRadius: 22))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Backend Blueprint (DEBUG only)
#if DEBUG
struct BackendBlueprintScreen: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Backend blueprint")
                .font(.title2.weight(.bold))
                .foregroundStyle(.white)

            ForEach(BackendBlueprint.endpoints) { endpoint in
                VStack(alignment: .leading, spacing: 6) {
                    Text("\(endpoint.method) \(endpoint.path)").font(.headline)
                    Text(endpoint.purpose).font(.subheadline).foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(18)
                .background(.regularMaterial, in: .rect(cornerRadius: 22))
            }

            ForEach(BackendBlueprint.schema) { table in
                VStack(alignment: .leading, spacing: 10) {
                    Text(table.name).font(.headline.weight(.bold))
                    ForEach(table.columns) { column in
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(column.name) · \(column.type)").font(.subheadline.weight(.semibold))
                            Text(column.details).font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(18)
                .background(.regularMaterial, in: .rect(cornerRadius: 22))
            }
        }
    }
}
#endif
