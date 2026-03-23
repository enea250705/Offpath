import SwiftUI

struct MainTripView: View {
    let viewModel: OffpathViewModel

    var body: some View {
        ZStack(alignment: .bottom) {
            // Content area — full bleed
            Group {
                switch viewModel.selectedTab {
                case .itinerary:
                    ItineraryTabView(viewModel: viewModel)
                case .hidden:
                    HiddenTabView(viewModel: viewModel)
                case .guide:
                    GuideTabView(viewModel: viewModel)
                case .map:
                    MapTabView(viewModel: viewModel)
                case .account:
                    AccountTabView(viewModel: viewModel)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .ignoresSafeArea(edges: .bottom)

            // Floating liquid glass tab bar
            OffpathTabBar(viewModel: viewModel)
                .ignoresSafeArea(edges: .bottom)
        }
    }
}

// MARK: - Liquid glass tab bar

struct OffpathTabBar: View {
    let viewModel: OffpathViewModel

    private var visibleTabs: [TripTab] {
        return [.itinerary, .hidden, .guide, .map, .account]
    }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(visibleTabs) { tab in
                let isSelected = viewModel.selectedTab == tab
                Button {
                    withAnimation(.spring(duration: 0.3, bounce: 0.2)) {
                        viewModel.selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        ZStack {
                            // Selected pill background
                            if isSelected {
                                Capsule()
                                    .fill(.white.opacity(0.18))
                                    .frame(width: 44, height: 30)
                                    .overlay {
                                        Capsule()
                                            .strokeBorder(.white.opacity(0.35), lineWidth: 0.5)
                                    }
                                    .shadow(color: .white.opacity(0.12), radius: 6, y: 2)
                                    .matchedGeometryEffect(id: "tabPill", in: tabNamespace)
                            }

                            Image(systemName: isSelected ? tab.selectedSymbol : tab.symbol)
                                .font(.system(size: 18, weight: isSelected ? .semibold : .regular))
                                .symbolEffect(.bounce.up.byLayer, value: isSelected)
                                .foregroundStyle(isSelected ? .black : .black.opacity(0.40))
                        }
                        .frame(width: 44, height: 30)

                        Text(tab.title)
                            .font(.system(size: 9.5, weight: isSelected ? .semibold : .regular))
                            .foregroundStyle(isSelected ? .black : .black.opacity(0.40))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 10)
        .background {
            // Liquid glass layer
            ZStack {
                // Frosted base
                RoundedRectangle(cornerRadius: 34, style: .continuous)
                    .fill(.ultraThinMaterial)

                // Glass tint
                RoundedRectangle(cornerRadius: 34, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                .white.opacity(0.10),
                                .white.opacity(0.04),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                // Specular top highlight
                RoundedRectangle(cornerRadius: 34, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [.white.opacity(0.22), .clear],
                            startPoint: .top,
                            endPoint: .init(x: 0.5, y: 0.35)
                        )
                    )

                // Border
                RoundedRectangle(cornerRadius: 34, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: [.white.opacity(0.38), .white.opacity(0.08)],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: 0.8
                    )
            }
        }
        .shadow(color: .black.opacity(0.28), radius: 24, y: 8)
        .shadow(color: .black.opacity(0.12), radius: 6, y: 2)
        .padding(.horizontal, 16)
        .padding(.bottom, 4)
    }

    @Namespace private var tabNamespace
}

// MARK: - Itinerary tab

struct ItineraryTabView: View {
    let viewModel: OffpathViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Hero header
                heroHeader
                    .padding(.horizontal, 22)
                    .padding(.top, 60)
                    .padding(.bottom, 24)

                // Intro paragraph
                if let intro = viewModel.plan?.intro, !intro.isEmpty {
                    Text(intro)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(.white.opacity(0.75))
                        .padding(.horizontal, 22)
                        .padding(.bottom, 28)
                }

                // Day cards
                VStack(spacing: 16) {
                    ForEach(viewModel.displayDays) { day in
                        MagazineDayCard(day: day)
                            .padding(.horizontal, 16)
                    }
                }
                .padding(.bottom, 110)
            }
        }
        .scrollIndicators(.hidden)
    }

    private var heroHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text((viewModel.plan?.destinationCountry ?? "").uppercased())
                .font(.system(size: 11, weight: .bold))
                .kerning(3)
                .foregroundStyle(.white.opacity(0.50))

            Text(viewModel.plan?.destinationCity ?? "Your Trip")
                .font(.system(size: 38, weight: .bold))
                .foregroundStyle(.white)

            Text(viewModel.plan?.shareLine ?? "")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(.white.opacity(0.68))
                .lineLimit(2)
        }
    }
}

// MARK: - Magazine day card

struct MagazineDayCard: View {
    let day: ItineraryDay
    @State private var expanded: Bool = true

    // Accent color per day index
    private var accentColor: Color {
        let colors: [Color] = [
            Color(red: 0.95, green: 0.55, blue: 0.25),
            Color(red: 0.40, green: 0.75, blue: 0.90),
            Color(red: 0.70, green: 0.50, blue: 1.00),
            Color(red: 0.35, green: 0.85, blue: 0.65),
            Color(red: 1.00, green: 0.75, blue: 0.30),
            Color(red: 0.90, green: 0.40, blue: 0.60),
            Color(red: 0.40, green: 0.65, blue: 1.00),
        ]
        return colors[(day.dayNumber - 1) % colors.count]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Day header
            Button {
                withAnimation(.spring(duration: 0.35)) { expanded.toggle() }
            } label: {
                HStack(alignment: .center, spacing: 14) {
                    // Day number badge
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(accentColor.opacity(0.18))
                            .frame(width: 48, height: 48)
                        VStack(spacing: 1) {
                            Text("DAY")
                                .font(.system(size: 8, weight: .bold))
                                .kerning(1)
                                .foregroundStyle(accentColor.opacity(0.80))
                            Text("\(day.dayNumber)")
                                .font(.system(size: 20, weight: .bold, design: .rounded))
                                .foregroundStyle(accentColor)
                        }
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        Text(day.title)
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(.primary)
                            .lineLimit(1)

                        Text(day.mood)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    Spacer()

                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 16)
            }
            .buttonStyle(.plain)

            // Moments timeline
            if expanded {
                Divider()
                    .overlay(accentColor.opacity(0.20))
                    .padding(.horizontal, 18)

                VStack(spacing: 0) {
                    ForEach(Array(day.moments.enumerated()), id: \.element.id) { index, moment in
                        MomentRow(
                            moment: moment,
                            accentColor: accentColor,
                            isLast: index == day.moments.count - 1
                        )
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 14)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(.regularMaterial, in: .rect(cornerRadius: 24))
        .overlay {
            RoundedRectangle(cornerRadius: 24)
                .strokeBorder(accentColor.opacity(0.18))
        }
    }
}

// MARK: - Moment row (timeline)

struct MomentRow: View {
    let moment: ItineraryMoment
    let accentColor: Color
    let isLast: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            // Timeline
            VStack(spacing: 0) {
                Circle()
                    .fill(accentColor)
                    .frame(width: 8, height: 8)
                    .padding(.top, 6)

                if !isLast {
                    Rectangle()
                        .fill(accentColor.opacity(0.20))
                        .frame(width: 1.5)
                        .frame(maxHeight: .infinity)
                }
            }
            .frame(width: 16)

            VStack(alignment: .leading, spacing: 6) {
                // Time + title
                Text(moment.timeLabel)
                    .font(.system(size: 11, weight: .semibold))
                    .kerning(0.5)
                    .foregroundStyle(accentColor)
                    .padding(.top, 2)

                Text(moment.title)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.primary)

                Text(moment.rationale)
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)

                // Transit note
                if !moment.transitNote.isEmpty {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.right.circle")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                        Text(moment.transitNote)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 2)
                }

                // Avoid note
                if !moment.avoidNote.isEmpty {
                    HStack(spacing: 6) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 11))
                            .foregroundStyle(.orange)
                        Text(moment.avoidNote)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(.orange.opacity(0.85))
                    }
                    .padding(.top, 2)
                }
            }
            .padding(.bottom, isLast ? 14 : 18)
        }
        .padding(.top, 14)
    }
}

// MARK: - Hidden tab

struct HiddenTabView: View {
    let viewModel: OffpathViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("HIDDEN GEMS")
                        .font(.system(size: 11, weight: .bold))
                        .kerning(3)
                        .foregroundStyle(.white.opacity(0.50))

                    Text("Off the map")
                        .font(.system(size: 34, weight: .bold))
                        .foregroundStyle(.white)

                    Text("The places most people walk past — chosen for you.")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(.white.opacity(0.65))
                }
                .padding(.horizontal, 22)
                .padding(.top, 60)
                .padding(.bottom, 28)

                VStack(spacing: 14) {
                    ForEach(viewModel.displayHiddenPlaces) { place in
                        HiddenPlaceCard(place: place)
                            .padding(.horizontal, 16)
                    }

                    if !viewModel.hasFullAccess {
                        UpgradeBanner(message: "Unlock all hidden spots with a Trip Pass") {
                            viewModel.appPhase = .preview
                        }
                        .padding(.horizontal, 16)
                    }
                }
                .padding(.bottom, 110)
            }
        }
        .scrollIndicators(.hidden)
    }
}

// MARK: - Guide tab

struct GuideTabView: View {
    let viewModel: OffpathViewModel

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("LOCAL GUIDE")
                        .font(.system(size: 11, weight: .bold))
                        .kerning(2.5)
                        .foregroundStyle(.white.opacity(0.50))
                    Text("Ask anything")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(.white)
                }
                Spacer()
                if !viewModel.hasFullAccess {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(viewModel.guideMessagesRemaining)")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(.white)
                        Text("free left")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.white.opacity(0.50))
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(.white.opacity(0.10), in: .rect(cornerRadius: 14))
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 64)
            .padding(.bottom, 16)

            Divider().overlay(.white.opacity(0.10))

            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.guideMessages) { message in
                            GuideBubble(message: message)
                                .id(message.id)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 14)
                    .padding(.bottom, 24)
                }
                .onChange(of: viewModel.guideMessages.count) { _, _ in
                    if let last = viewModel.guideMessages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            // Input or upgrade
            if !viewModel.canSendGuideMessage {
                UpgradeBanner(message: "Unlock unlimited messages with a Trip Pass") {
                    viewModel.appPhase = .preview
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 100)
            } else {
                GuideInputBar(viewModel: viewModel)
                    .padding(.bottom, 90)
            }
        }
    }
}

struct GuideInputBar: View {
    let viewModel: OffpathViewModel
    @State private var text: String = ""

    var body: some View {
        HStack(spacing: 10) {
            TextField("What's worth doing tonight?", text: $text)
                .font(.system(size: 15))
                .foregroundStyle(.primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 13)
                .background(.regularMaterial, in: .rect(cornerRadius: 22))
                .onAppear {
                    text = viewModel.draftGuideInput
                }
                .onChange(of: text) { _, new in
                    viewModel.draftGuideInput = new
                }

            Button {
                guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
                text = ""
                Task { await viewModel.sendGuideMessage() }
            } label: {
                Image(systemName: "arrow.up")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.black)
                    .frame(width: 46, height: 46)
                    .background(.white, in: Circle())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
    }
}

// MARK: - Shared: GuideBubble

struct GuideBubble: View {
    let message: GuideMessage

    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            if message.role == "assistant" {
                // Guide avatar
                Circle()
                    .fill(LinearGradient(
                        colors: [Color(red: 0.30, green: 0.60, blue: 0.95), Color(red: 0.20, green: 0.40, blue: 0.80)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    ))
                    .frame(width: 30, height: 30)
                    .overlay {
                        Image(systemName: "person.fill")
                            .font(.system(size: 13))
                            .foregroundStyle(.white)
                    }

                VStack(alignment: .leading, spacing: 6) {
                    Text("Your guide")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.secondary)
                    Text(message.text)
                        .font(.system(size: 15))
                        .foregroundStyle(.primary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(14)
                .background(.regularMaterial, in: .rect(cornerRadius: 20, style: .continuous))

                Spacer(minLength: 60)
            } else {
                Spacer(minLength: 60)
                Text(message.text)
                    .font(.system(size: 15))
                    .foregroundStyle(.white)
                    .padding(14)
                    .background(.white.opacity(0.14), in: .rect(cornerRadius: 20, style: .continuous))
            }
        }
    }
}

// MARK: - Shared: HiddenPlaceCard

struct HiddenPlaceCard: View {
    let place: HiddenPlace

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(place.name)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.primary)

                    HStack(spacing: 6) {
                        Image(systemName: "mappin")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                        Text(place.neighborhood)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Text(place.vibe)
                    .font(.system(size: 11, weight: .bold))
                    .kerning(0.5)
                    .foregroundStyle(.orange)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.orange.opacity(0.12), in: Capsule())
            }

            Text(place.note)
                .font(.system(size: 14, weight: .regular))
                .foregroundStyle(.primary.opacity(0.85))
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 6) {
                Image(systemName: "clock")
                    .font(.system(size: 12))
                    .foregroundStyle(.orange)
                Text(place.bestTime)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.orange)
            }
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [.orange.opacity(0.10), .yellow.opacity(0.06), .clear],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: .rect(cornerRadius: 22)
        )
        .background(.regularMaterial, in: .rect(cornerRadius: 22))
        .overlay { RoundedRectangle(cornerRadius: 22).strokeBorder(.orange.opacity(0.20)) }
    }
}

// MARK: - Shared: UpgradeBanner

struct UpgradeBanner: View {
    let message: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: "lock.open.fill")
                    .font(.title3)
                    .foregroundStyle(.orange)
                Text(message)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(18)
            .background(.regularMaterial, in: .rect(cornerRadius: 22))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - GuideDayCard (kept for PreviewUnlockView)

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

            VStack(spacing: 10) {
                ForEach(day.moments) { moment in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(moment.timeLabel)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Text(moment.title).font(.headline)
                        Text(moment.rationale)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 16))
                }
            }
        }
        .padding(20)
        .background(.regularMaterial, in: .rect(cornerRadius: 24))
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
