import SwiftUI

struct RootView: View {
    let viewModel: OffpathViewModel

    var body: some View {
        Group {
            switch viewModel.appPhase {
            case .onboarding:
                OnboardingFlowView(viewModel: viewModel)
                    .transition(.asymmetric(
                        insertion: .opacity,
                        removal: .opacity
                    ))
            case .generating:
                TripGenerationView(viewModel: viewModel)
                    .transition(.opacity)
            case .stories:
                StoriesView(viewModel: viewModel)
                    .transition(.opacity)
            case .preview:
                PreviewUnlockView(viewModel: viewModel)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            case .auth:
                AuthView(viewModel: viewModel)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            case .trip:
                MainTripView(viewModel: viewModel)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.4), value: viewModel.appPhase)
        .background(OffpathBackground())
        .task {
            viewModel.start()
        }
        .alert("Hold on", isPresented: Binding(
            get: { viewModel.errorMessage != nil },
            set: { newValue in
                if !newValue {
                    viewModel.errorMessage = nil
                }
            }
        )) {
            Button("OK") {
                viewModel.errorMessage = nil
            }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }
}

struct OffpathBackground: View {
    var body: some View {
        MeshGradient(
            width: 3,
            height: 3,
            points: [
                [0.0, 0.0], [0.5, 0.0], [1.0, 0.0],
                [0.0, 0.5], [0.5, 0.5], [1.0, 0.5],
                [0.0, 1.0], [0.5, 1.0], [1.0, 1.0]
            ],
            colors: [
                Color(red: 0.96, green: 0.80, blue: 0.62),
                Color(red: 0.80, green: 0.90, blue: 0.92),
                Color(red: 0.37, green: 0.61, blue: 0.77),
                Color(red: 0.98, green: 0.89, blue: 0.74),
                Color(red: 0.75, green: 0.83, blue: 0.71),
                Color(red: 0.19, green: 0.34, blue: 0.48),
                Color(red: 0.93, green: 0.77, blue: 0.62),
                Color(red: 0.41, green: 0.58, blue: 0.50),
                Color(red: 0.12, green: 0.19, blue: 0.27)
            ]
        )
        .ignoresSafeArea()
        .overlay(.black.opacity(0.08))
    }
}
