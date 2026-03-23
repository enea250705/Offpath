import SwiftUI

struct OnboardingFlowView: View {
    let viewModel: OffpathViewModel

    var body: some View {
        VStack(spacing: 0) {
            header
            Spacer(minLength: 20)
            questionCard
            Spacer(minLength: 16)
            footerButton
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
        .padding(.bottom, 16)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("OFFPATH")
                    .font(.caption.weight(.semibold))
                    .kerning(2.2)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.white.opacity(0.16), in: .capsule)

                Spacer()

                Text("\(viewModel.currentQuestionIndex + 1)/4")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.8))
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Travel planning that sounds like\nsomeone with taste is texting you.")
                    .font(.system(.title, design: .default, weight: .bold))
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)

                Text("Warm, opinionated, and actually useful.")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.8))
            }

            ProgressView(value: Double(viewModel.currentQuestionIndex + 1), total: 4)
                .tint(.white)
                .progressViewStyle(.linear)
        }
    }

    private var questionCard: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text(viewModel.currentQuestionTitle)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)

                Text(viewModel.currentQuestionPrompt)
                    .font(.system(.title3, design: .default, weight: .bold))
                    .foregroundStyle(.primary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Group {
                switch viewModel.currentQuestionIndex {
                case 0:
                    destinationModePicker
                case 1:
                    destinationQuestion
                case 2:
                    travelerGroupPicker
                default:
                    tripLengthPicker
                }
            }
        }
        .padding(20)
        .background(.regularMaterial, in: .rect(cornerRadius: 28))
        .overlay {
            RoundedRectangle(cornerRadius: 28)
                .strokeBorder(.white.opacity(0.18))
        }
    }

    private var destinationModePicker: some View {
        VStack(spacing: 12) {
            ForEach(DestinationMode.allCases) { mode in
                OptionButton(
                    title: mode.rawValue,
                    subtitle: mode == .know ? "Start with your city, then I'll tighten the route." : "I'll pick somewhere that fits your energy.",
                    isSelected: viewModel.answers.destinationMode == mode
                ) {
                    viewModel.answers.destinationMode = mode
                    if mode == .suggest {
                        viewModel.answers.destination = ""
                    }
                }
            }
        }
    }

    private var destinationQuestion: some View {
        VStack(spacing: 12) {
            if viewModel.answers.destinationMode == .suggest {
                ForEach(TravelStyle.allCases) { style in
                    OptionButton(
                        title: style.rawValue,
                        subtitle: styleSubtitle(for: style),
                        isSelected: viewModel.answers.style == style
                    ) {
                        viewModel.answers.style = style
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    TextField(
                        "Lisbon",
                        text: Binding(
                            get: { viewModel.answers.destination },
                            set: { viewModel.answers.destination = $0 }
                        )
                    )
                    .textInputAutocapitalization(.words)
                    .font(.title3.weight(.semibold))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                    .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 18))

                    Text("Example: Lisbon, Oaxaca, Kyoto, or Mexico City.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    // Q3 — fixed: horizontal row so 3 options never overflow vertically
    private var travelerGroupPicker: some View {
        HStack(spacing: 10) {
            ForEach(TravelerGroup.allCases) { group in
                Button {
                    viewModel.answers.group = group
                } label: {
                    VStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(viewModel.answers.group == group ? .blue : .clear)
                                .frame(width: 20, height: 20)
                            Circle()
                                .strokeBorder(
                                    viewModel.answers.group == group ? Color.blue : Color.secondary.opacity(0.5),
                                    lineWidth: 2
                                )
                                .frame(width: 20, height: 20)
                        }

                        Text(group.rawValue)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)

                        Text(groupSubtitle(for: group))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.vertical, 14)
                    .padding(.horizontal, 8)
                    .frame(maxWidth: .infinity)
                    .background(
                        viewModel.answers.group == group ? .blue.opacity(0.08) : Color(.secondarySystemBackground),
                        in: .rect(cornerRadius: 18)
                    )
                }
                .buttonStyle(.plain)
                .animation(.easeInOut(duration: 0.18), value: viewModel.answers.group)
            }
        }
    }

    private var tripLengthPicker: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("\(viewModel.answers.tripLength) days")
                .font(.system(.largeTitle, design: .default, weight: .bold))

            Slider(value: Binding(
                get: { Double(viewModel.answers.tripLength) },
                set: { viewModel.answers.tripLength = Int($0.rounded()) }
            ), in: 2...14, step: 1)
            .tint(.blue)

            HStack {
                Text("2")
                Spacer()
                Text("14")
            }
            .font(.footnote.weight(.medium))
            .foregroundStyle(.secondary)
        }
    }

    private var footerButton: some View {
        Button {
            viewModel.advanceQuestion()
        } label: {
            HStack {
                Text(viewModel.currentQuestionIndex == 3 ? "Build my trip" : "Continue")
                    .font(.headline)
                Spacer()
                Image(systemName: "arrow.right")
                    .font(.headline.weight(.bold))
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 18)
        }
        .buttonStyle(.plain)
        .foregroundStyle(.white)
        .background(viewModel.canContinueQuestion ? .black.opacity(0.78) : .white.opacity(0.25), in: .rect(cornerRadius: 22))
        .disabled(!viewModel.canContinueQuestion)
    }

    private func styleSubtitle(for style: TravelStyle) -> String {
        switch style {
        case .slow:      "Neighborhoods, unforced pacing, and time to wander properly."
        case .food:      "Built around memorable tables, markets, and what's actually worth ordering."
        case .culture:   "Design, history, and places with texture instead of noise."
        case .nightlife: "Late dinners, bars with taste, and streets that stay interesting after dark."
        }
    }

    private func groupSubtitle(for group: TravelerGroup) -> String {
        switch group {
        case .solo:   "Flexible &\neasy to reroute"
        case .couple: "Cinematic\npacing"
        case .group:  "High energy,\nclean logistics"
        }
    }
}

// MARK: - OptionButton (original style)

struct OptionButton: View {
    let title: String
    let subtitle: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 14) {
                Circle()
                    .fill(isSelected ? .blue : .clear)
                    .frame(width: 18, height: 18)
                    .overlay {
                        Circle().strokeBorder(isSelected ? .blue : .secondary.opacity(0.5), lineWidth: 2)
                    }
                    .padding(.top, 2)

                VStack(alignment: .leading, spacing: 6) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(.primary)
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()
            }
            .padding(16)
            .background(isSelected ? .blue.opacity(0.08) : Color(.secondarySystemBackground), in: .rect(cornerRadius: 20))
        }
        .buttonStyle(.plain)
    }
}
