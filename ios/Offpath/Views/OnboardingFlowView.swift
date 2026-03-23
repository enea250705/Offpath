import SwiftUI

struct OnboardingFlowView: View {
    let viewModel: OffpathViewModel

    var body: some View {
        GeometryReader { geo in
            VStack(spacing: 0) {
                compactHeader
                    .padding(.horizontal, 22)
                    .padding(.top, max(geo.safeAreaInsets.top, 20) + 10)

                Spacer(minLength: 12)

                questionCard
                    .padding(.horizontal, 22)

                Spacer(minLength: 12)

                continueButton
                    .padding(.horizontal, 22)
                    .padding(.bottom, max(geo.safeAreaInsets.bottom, 16) + 8)
            }
        }
        .ignoresSafeArea()
    }

    // MARK: - Header

    private var compactHeader: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 6) {
                Text("OFFPATH")
                    .font(.system(size: 11, weight: .bold))
                    .kerning(2.4)
                    .foregroundStyle(.white.opacity(0.55))

                Text(viewModel.currentQuestionTitle)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
            }

            Spacer()

            // Step indicator
            HStack(spacing: 6) {
                ForEach(0..<4) { i in
                    Capsule()
                        .fill(i <= viewModel.currentQuestionIndex ? Color.white : Color.white.opacity(0.25))
                        .frame(width: i == viewModel.currentQuestionIndex ? 20 : 6, height: 6)
                        .animation(.spring(duration: 0.35), value: viewModel.currentQuestionIndex)
                }
            }
        }
    }

    // MARK: - Card

    private var questionCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(viewModel.currentQuestionPrompt)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(.white.opacity(0.70))
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)

            Divider().overlay(.white.opacity(0.12))

            questionContent
        }
        .padding(20)
        .background(.white.opacity(0.08), in: .rect(cornerRadius: 26))
        .overlay { RoundedRectangle(cornerRadius: 26).strokeBorder(.white.opacity(0.14)) }
    }

    @ViewBuilder
    private var questionContent: some View {
        switch viewModel.currentQuestionIndex {
        case 0:
            destinationModeContent
        case 1:
            destinationContent
        case 2:
            groupContent
        default:
            tripLengthContent
        }
    }

    // MARK: - Q0: Mode

    private var destinationModeContent: some View {
        VStack(spacing: 10) {
            ForEach(DestinationMode.allCases) { mode in
                CompactOptionButton(
                    title: mode.rawValue,
                    detail: mode == .know ? "I have a city in mind" : "Surprise me with a great pick",
                    isSelected: viewModel.answers.destinationMode == mode,
                    accent: Color.white
                ) {
                    viewModel.answers.destinationMode = mode
                    if mode == .suggest { viewModel.answers.destination = "" }
                }
            }
        }
    }

    // MARK: - Q1: Destination / Style

    private var destinationContent: some View {
        Group {
            if viewModel.answers.destinationMode == .suggest {
                let cols = [GridItem(.flexible()), GridItem(.flexible())]
                LazyVGrid(columns: cols, spacing: 10) {
                    ForEach(TravelStyle.allCases) { style in
                        CompactOptionButton(
                            title: style.rawValue,
                            detail: styleDetail(style),
                            isSelected: viewModel.answers.style == style,
                            accent: Color.white
                        ) {
                            viewModel.answers.style = style
                        }
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    TextField(
                        "Lisbon, Tokyo, Oaxaca…",
                        text: Binding(
                            get: { viewModel.answers.destination },
                            set: { viewModel.answers.destination = $0 }
                        )
                    )
                    .textInputAutocapitalization(.words)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 15)
                    .background(.white.opacity(0.10), in: .rect(cornerRadius: 16))
                    .overlay {
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(.white.opacity(0.20))
                    }

                    Text("Enter any city. I'll make it count.")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.45))
                }
            }
        }
    }

    // MARK: - Q2: Group

    private var groupContent: some View {
        HStack(spacing: 10) {
            ForEach(TravelerGroup.allCases) { group in
                CompactOptionButton(
                    title: group.rawValue,
                    detail: groupDetail(group),
                    isSelected: viewModel.answers.group == group,
                    accent: Color.white
                ) {
                    viewModel.answers.group = group
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Q3: Length

    private var tripLengthContent: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .lastTextBaseline, spacing: 6) {
                Text("\(viewModel.answers.tripLength)")
                    .font(.system(size: 52, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .contentTransition(.numericText())
                    .animation(.snappy, value: viewModel.answers.tripLength)

                Text("days")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.55))
                    .padding(.bottom, 6)
            }

            Slider(
                value: Binding(
                    get: { Double(viewModel.answers.tripLength) },
                    set: { viewModel.answers.tripLength = Int($0.rounded()) }
                ),
                in: 2...14,
                step: 1
            )
            .tint(.white)

            HStack {
                Text("2 days")
                Spacer()
                Text("2 weeks")
            }
            .font(.caption.weight(.medium))
            .foregroundStyle(.white.opacity(0.40))
        }
    }

    // MARK: - Continue button

    private var continueButton: some View {
        Button {
            viewModel.advanceQuestion()
        } label: {
            HStack {
                Text(viewModel.currentQuestionIndex == 3 ? "Build my trip" : "Continue")
                    .font(.system(size: 17, weight: .bold))
                Spacer()
                Image(systemName: "arrow.right")
                    .font(.system(size: 15, weight: .bold))
            }
            .foregroundStyle(viewModel.canContinueQuestion ? .black : .white.opacity(0.45))
            .padding(.horizontal, 22)
            .padding(.vertical, 18)
            .background(
                viewModel.canContinueQuestion ? Color.white : Color.white.opacity(0.14),
                in: .rect(cornerRadius: 22)
            )
            .animation(.easeInOut(duration: 0.2), value: viewModel.canContinueQuestion)
        }
        .buttonStyle(.plain)
        .disabled(!viewModel.canContinueQuestion)
    }

    // MARK: - Detail strings

    private func styleDetail(_ style: TravelStyle) -> String {
        switch style {
        case .slow: return "Wander & breathe"
        case .food: return "Tables & markets"
        case .culture: return "Art & history"
        case .nightlife: return "Late nights"
        }
    }

    private func groupDetail(_ group: TravelerGroup) -> String {
        switch group {
        case .solo: return "Flexible"
        case .couple: return "Romantic"
        case .group: return "High energy"
        }
    }
}

// MARK: - Compact Option Button

struct CompactOptionButton: View {
    let title: String
    let detail: String
    let isSelected: Bool
    let accent: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                ZStack {
                    Circle()
                        .fill(isSelected ? accent : Color.clear)
                        .frame(width: 16, height: 16)
                    Circle()
                        .strokeBorder(isSelected ? accent : accent.opacity(0.35), lineWidth: 1.5)
                        .frame(width: 16, height: 16)
                    if isSelected {
                        Circle().fill(.black).frame(width: 6, height: 6)
                    }
                }

                VStack(alignment: .leading, spacing: 1) {
                    Text(title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(detail)
                        .font(.system(size: 11, weight: .regular))
                        .foregroundStyle(.white.opacity(0.50))
                        .lineLimit(1)
                }

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(
                isSelected ? accent.opacity(0.12) : Color.white.opacity(0.06),
                in: .rect(cornerRadius: 16)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(isSelected ? accent.opacity(0.45) : Color.clear, lineWidth: 1.5)
            }
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.18), value: isSelected)
    }
}
