import SwiftUI

struct ContentView: View {
    @State private var viewModel: OffpathViewModel = OffpathViewModel()

    var body: some View {
        RootView(viewModel: viewModel)
    }
}

#Preview {
    ContentView()
}
