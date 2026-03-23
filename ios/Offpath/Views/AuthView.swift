import SwiftUI
import AuthenticationServices

struct AuthView: View {
    let viewModel: OffpathViewModel

    var body: some View {
        @Bindable var bindableViewModel = viewModel

        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header
                socialSection
                divider
                emailSection
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 18)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Save your trip")
                .font(.system(.largeTitle, design: .default, weight: .bold))
                .foregroundStyle(.white)

            Text("Your answers transfer instantly. No lost progress, no clumsy reset.")
                .font(.headline)
                .foregroundStyle(.white.opacity(0.8))
        }
    }

    private var socialSection: some View {
        VStack(spacing: 12) {
            // MARK: Sign in with Apple — fully wired
            SignInWithAppleButton(.continue) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                switch result {
                case .success(let authorization):
                    guard
                        let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                        let tokenData  = credential.identityToken,
                        let token      = String(data: tokenData, encoding: .utf8)
                    else { return }
                    let fullName = [
                        credential.fullName?.givenName,
                        credential.fullName?.familyName
                    ]
                    .compactMap { $0 }
                    .joined(separator: " ")
                    Task {
                        await viewModel.completeAppleAuth(
                            token: token,
                            fullName: fullName.isEmpty ? nil : fullName
                        )
                    }
                case .failure:
                    break
                }
            }
            .signInWithAppleButtonStyle(.white)
            .frame(height: 52)
            .clipShape(.rect(cornerRadius: 4))

            // MARK: Google Sign-In — official branded button
            GoogleSignInButton(label: "Continue with Google") {
                Task { await viewModel.completeGoogleAuth() }
            }
            .frame(height: 52)
        }
    }

    private var divider: some View {
        HStack(spacing: 12) {
            Rectangle().fill(.white.opacity(0.22)).frame(height: 1)
            Text("or")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white.opacity(0.72))
            Rectangle().fill(.white.opacity(0.22)).frame(height: 1)
        }
    }

    private var emailSection: some View {
        @Bindable var vm = viewModel
        return VStack(alignment: .leading, spacing: 16) {
            Picker("Mode", selection: $vm.authModeIsLogin) {
                Text("Sign Up").tag(false)
                Text("Login").tag(true)
            }
            .pickerStyle(.segmented)

            VStack(spacing: 12) {
                if !vm.authModeIsLogin {
                    AuthTextField(title: "Name", text: $vm.authName, systemImage: "person")
                }
                AuthTextField(title: "Email", text: $vm.authEmail, systemImage: "envelope")
                SecureAuthField(title: "Password", text: $vm.authPassword, systemImage: "lock")
            }

            Button {
                Task { await viewModel.completeEmailAuth() }
            } label: {
                HStack {
                    if viewModel.isAuthenticating {
                        ProgressView().tint(.white)
                    } else {
                        Text(viewModel.authModeIsLogin ? "Login" : "Create account")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 56)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.white)
            .background(.black.opacity(0.84), in: .rect(cornerRadius: 20))
            .disabled(viewModel.isAuthenticating)

            Text("By continuing, you keep your preview and unlock the complete destination guide without starting over.")
                .font(.footnote)
                .foregroundStyle(.white.opacity(0.72))
        }
        .padding(22)
        .background(.regularMaterial, in: .rect(cornerRadius: 28))
    }
}

struct AuthTextField: View {
    let title: String
    @Binding var text: String
    let systemImage: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage).foregroundStyle(.secondary)
            TextField(title, text: $text)
                .textInputAutocapitalization(title == "Email" ? .never : .words)
                .keyboardType(title == "Email" ? .emailAddress : .default)
                .textContentType(title == "Email" ? .emailAddress : .name)
        }
        .padding(.horizontal, 16)
        .frame(height: 56)
        .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 18))
    }
}

struct SecureAuthField: View {
    let title: String
    @Binding var text: String
    let systemImage: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage).foregroundStyle(.secondary)
            SecureField(title, text: $text).textContentType(.password)
        }
        .padding(.horizontal, 16)
        .frame(height: 56)
        .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 18))
    }
}
