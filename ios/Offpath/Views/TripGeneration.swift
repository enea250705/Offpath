import SwiftUI
import MapKit

struct TripGenerationView: View {
    let viewModel: OffpathViewModel
    @State private var planeProgress: Double = 0
    @State private var mapPosition: MapCameraPosition = .automatic

    var body: some View {
        VStack(spacing: 24) {
            Spacer(minLength: 12)

            VStack(alignment: .leading, spacing: 10) {
                Text("Building your route")
                    .font(.system(.largeTitle, design: .default, weight: .bold))
                    .foregroundStyle(.white)

                Text("Timing, hidden corners, better pacing, and the little details most people miss.")
                    .font(.headline)
                    .foregroundStyle(.white.opacity(0.78))
            }
            .padding(.horizontal, 20)

            mapCard
                .padding(.horizontal, 20)

            VStack(spacing: 10) {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.white)
                    .scaleEffect(1.2)

                Text(viewModel.plan == nil ? "Checking the city, tuning the route, and finding the places people usually miss." : "Almost there.")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.white.opacity(0.82))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 36)
            }

            Spacer()
        }
        .task {
            await animatePlane()
        }
        .onAppear {
            updateMapPosition()
        }
    }

    private var mapCard: some View {
        let origin: CLLocationCoordinate2D = viewModel.locationService.currentCoordinate.clCoordinate
        let destination: CLLocationCoordinate2D = approximateDestination.clCoordinate
        let planeCoordinate: CLLocationCoordinate2D = interpolatedCoordinate(from: origin, to: destination, progress: planeProgress)

        return VStack(alignment: .leading, spacing: 14) {
            Text("From where you are to where you should be next")
                .font(.headline)
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.top, 16)

            Map(position: $mapPosition, interactionModes: []) {
                Marker("You", coordinate: origin)
                    .tint(.blue)
                Marker(viewModel.answers.destination.isEmpty ? "Suggested destination" : viewModel.answers.destination, coordinate: destination)
                    .tint(.orange)
                MapPolyline(coordinates: [origin, destination])
                    .stroke(.white.opacity(0.9), style: StrokeStyle(lineWidth: 4, lineCap: .round, dash: [8, 8]))
                Annotation("Flight", coordinate: planeCoordinate) {
                    Image(systemName: "airplane")
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(10)
                        .background(.black.opacity(0.78), in: .circle)
                        .shadow(radius: 12, y: 6)
                }
            }
            .frame(height: 320)
            .mapStyle(.standard(elevation: .realistic))
            .clipShape(.rect(cornerRadius: 28))
            .padding(12)
        }
        .background(.ultraThinMaterial, in: .rect(cornerRadius: 32))
        .overlay {
            RoundedRectangle(cornerRadius: 32)
                .strokeBorder(.white.opacity(0.16))
        }
    }

    private var approximateDestination: LocationCoordinate {
        let text: String = viewModel.answers.destination.lowercased()
        if text.contains("lisbon") { return LocationCoordinate(latitude: 38.7223, longitude: -9.1393) }
        if text.contains("kyoto") { return LocationCoordinate(latitude: 35.0116, longitude: 135.7681) }
        if text.contains("mexico") { return LocationCoordinate(latitude: 19.4326, longitude: -99.1332) }
        if text.contains("istanbul") { return LocationCoordinate(latitude: 41.0082, longitude: 28.9784) }
        return LocationCoordinate(latitude: 38.7223, longitude: -9.1393)
    }

    private func animatePlane() async {
        for step in 0 ... 100 {
            withAnimation(.smooth(duration: 0.1)) {
                planeProgress = Double(step) / 100
            }
            try? await Task.sleep(for: .milliseconds(45))
        }
    }

    private func updateMapPosition() {
        let origin: CLLocationCoordinate2D = viewModel.locationService.currentCoordinate.clCoordinate
        let destination: CLLocationCoordinate2D = approximateDestination.clCoordinate
        let center: CLLocationCoordinate2D = CLLocationCoordinate2D(latitude: (origin.latitude + destination.latitude) / 2, longitude: (origin.longitude + destination.longitude) / 2)
        mapPosition = .camera(MapCamera(centerCoordinate: center, distance: 7_000_000, heading: 0, pitch: 0))
    }

    private func interpolatedCoordinate(from origin: CLLocationCoordinate2D, to destination: CLLocationCoordinate2D, progress: Double) -> CLLocationCoordinate2D {
        CLLocationCoordinate2D(
            latitude: origin.latitude + (destination.latitude - origin.latitude) * progress,
            longitude: origin.longitude + (destination.longitude - origin.longitude) * progress
        )
    }
}
