import SwiftUI

struct AccountTabView: View {
    let viewModel: OffpathViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                avatarSection
                tripSection
                accessSection
                actionsSection
            }
            .padding(.horizontal, 20)
            .padding(.top, 24)
            .padding(.bottom, 40)
        }
    }

    // MARK: - Avatar

    private var avatarSection: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(LinearGradient(
                        colors: [Color(red: 0.90, green: 0.70, blue: 0.40), Color(red: 0.60, green: 0.40, blue: 0.90)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    ))
                    .frame(width: 88, height: 88)

                Text(initials)
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
            }

            VStack(spacing: 4) {
                Text(viewModel.currentUser?.displayName ?? "Traveler")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(.white)

                if let email = viewModel.currentUser?.email {
                    Text(email)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.60))
                }
            }

            if viewModel.hasFullAccess {
                Label("Trip Pass active", systemImage: "checkmark.seal.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.orange)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(.orange.opacity(0.14), in: Capsule())
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(.white.opacity(0.08), in: .rect(cornerRadius: 28))
        .overlay { RoundedRectangle(cornerRadius: 28).strokeBorder(.white.opacity(0.12)) }
    }

    // MARK: - Current trip

    @ViewBuilder
    private var tripSection: some View {
        if let plan = viewModel.plan {
            VStack(alignment: .leading, spacing: 14) {
                Label("Current trip", systemImage: "mappin.circle.fill")
                    .font(.caption.weight(.bold))
                    .kerning(0.5)
                    .foregroundStyle(.white.opacity(0.55))

                HStack {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(plan.destinationCity)
                            .font(.title3.weight(.bold))
                            .foregroundStyle(.white)
                        Text(plan.destinationCountry)
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.60))
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 6) {
                        Text("\(plan.fullDays.count)")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)
                        Text("days planned")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.55))
                    }
                }
            }
            .padding(20)
            .background(.white.opacity(0.08), in: .rect(cornerRadius: 24))
            .overlay { RoundedRectangle(cornerRadius: 24).strokeBorder(.white.opacity(0.12)) }
        }
    }

    // MARK: - Access / upgrade

    @ViewBuilder
    private var accessSection: some View {
        if !viewModel.hasFullAccess {
            Button {
                viewModel.appPhase = .preview
            } label: {
                HStack(spacing: 14) {
                    Image(systemName: "lock.open.fill")
                        .font(.title3)
                        .foregroundStyle(.orange)
                        .frame(width: 40, height: 40)
                        .background(.orange.opacity(0.14), in: Circle())

                    VStack(alignment: .leading, spacing: 3) {
                        Text("Unlock your full trip")
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("All hidden places + unlimited guide")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.60))
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.40))
                }
                .padding(18)
                .background(.orange.opacity(0.10), in: .rect(cornerRadius: 22))
                .overlay { RoundedRectangle(cornerRadius: 22).strokeBorder(.orange.opacity(0.30)) }
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Actions

    private var actionsSection: some View {
        VStack(spacing: 2) {
            AccountRow(icon: "arrow.counterclockwise", title: "Restore purchases") {
                Task { await viewModel.restorePurchases() }
            }

            AccountRow(icon: "shield.lefthalf.filled", title: "Privacy Policy") {
                // no-op for now
            }

            AccountRow(icon: "arrow.backward.circle", title: "Sign out", destructive: true) {
                viewModel.signOut()
            }
        }
        .background(.white.opacity(0.07), in: .rect(cornerRadius: 22))
        .overlay { RoundedRectangle(cornerRadius: 22).strokeBorder(.white.opacity(0.10)) }
    }

    // MARK: - Helpers

    private var initials: String {
        let name = viewModel.currentUser?.displayName ?? "T"
        let parts = name.split(separator: " ")
        if parts.count >= 2 {

            let first = parts[0].first.map(String.init) ?? ""
            let second = parts[1].first.map(String.init) ?? ""
            return (first + second).uppercased()        }
        return String(name.prefix(2)).uppercased()
    }
}

struct AccountRow: View {
    let icon: String
    let title: String
    var destructive: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(destructive ? .red : .white.opacity(0.65))
                    .frame(width: 36)

                Text(title)
                    .font(.body)
                    .foregroundStyle(destructive ? .red : .white)

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.25))
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 16)
        }
        .buttonStyle(.plain)
    }
}
