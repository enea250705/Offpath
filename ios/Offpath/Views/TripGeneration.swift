import SwiftUI
import MapKit

struct TripGenerationView: View {
    let viewModel: OffpathViewModel

    @State private var progress: Double       = 0
    @State private var pulseOrigin: Bool      = false
    @State private var pulseDestination: Bool = false
    @State private var trailProgress: Double  = 0
    @State private var loadingIndex: Int      = 0
    @State private var mapPosition: MapCameraPosition = .automatic
    @State private var pathPoints: [CLLocationCoordinate2D] = []
    @State private var hasZoomedIn: Bool      = false

    private let loadingMessages = [
        "Reading the city like a local...",
        "Finding the spots most people miss...",
        "Timing everything so it flows...",
        "Adding the hidden layer...",
        "Almost ready to hand it over..."
    ]

    var body: some View {
        ZStack(alignment: .bottom) {
            // Full-screen map
            mapLayer

            // Top gradient
            VStack {
                LinearGradient(
                    colors: [.black.opacity(0.55), .clear],
                    startPoint: .top, endPoint: .bottom
                )
                .frame(height: 140)
                .ignoresSafeArea()
                Spacer()
            }

            // Bottom gradient + card
            VStack(spacing: 0) {
                LinearGradient(
                    colors: [.clear, .black.opacity(0.85)],
                    startPoint: .top, endPoint: .bottom
                )
                .frame(height: 120)

                bottomCard
                    .background(.black.opacity(0.85))
            }

            // Top label
            VStack {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("PLANNING YOUR TRIP")
                            .font(.system(size: 11, weight: .semibold))
                            .kerning(2)
                            .foregroundStyle(.white.opacity(0.6))

                        Text(destinationName)
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white)
                    }
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.top, 60)
                Spacer()
            }
        }
        .ignoresSafeArea()
        .onAppear {
            buildPath()
            updateCamera()
            startAnimations()
        }
    }

    // MARK: - Map

    private var mapLayer: some View {
        Map(position: $mapPosition, interactionModes: []) {
            // Full curved path (dim)
            if pathPoints.count > 1 {
                MapPolyline(coordinates: pathPoints)
                    .stroke(
                        .white.opacity(0.18),
                        style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [6, 8])
                    )
            }

            // Traveled portion of path (bright)
            if pathPoints.count > 1 {
                let traveled = Array(pathPoints.prefix(max(2, Int(trailProgress * Double(pathPoints.count)))))
                MapPolyline(coordinates: traveled)
                    .stroke(
                        .white.opacity(0.9),
                        style: StrokeStyle(lineWidth: 3, lineCap: .round)
                    )
            }

            // Origin marker — pulsing
            Annotation("", coordinate: originCoord) {
                ZStack {
                    Circle()
                        .fill(.blue.opacity(0.25))
                        .frame(width: pulseOrigin ? 44 : 28, height: pulseOrigin ? 44 : 28)
                        .animation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true), value: pulseOrigin)

                    Circle()
                        .fill(.white)
                        .frame(width: 12, height: 12)
                        .overlay(Circle().fill(.blue).frame(width: 7, height: 7))
                        .shadow(color: .blue.opacity(0.6), radius: 8)
                }
            }

            // Destination marker — pulsing
            Annotation("", coordinate: destinationCoord) {
                ZStack {
                    Circle()
                        .fill(.orange.opacity(0.25))
                        .frame(width: pulseDestination ? 48 : 30, height: pulseDestination ? 48 : 30)
                        .animation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true), value: pulseDestination)

                    Circle()
                        .fill(.white)
                        .frame(width: 14, height: 14)
                        .overlay(Circle().fill(.orange).frame(width: 8, height: 8))
                        .shadow(color: .orange.opacity(0.8), radius: 10)
                }
            }

            // Airplane — follows the curved path
            if pathPoints.count > 1 {
                let idx = min(Int(progress * Double(pathPoints.count - 1)), pathPoints.count - 1)
                let planeCoord = pathPoints[idx]
                let rotation = planeBearing(at: idx)

                Annotation("", coordinate: planeCoord) {
                    ZStack {
                        // Glow
                        Circle()
                            .fill(.white.opacity(0.15))
                            .frame(width: 52, height: 52)
                            .blur(radius: 8)

                        // Shadow ring
                        Circle()
                            .fill(.black.opacity(0.3))
                            .frame(width: 40, height: 40)

                        // Plane icon
                        Image(systemName: "airplane")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(.white)
                            .rotationEffect(.degrees(rotation))
                            .shadow(color: .white.opacity(0.8), radius: 4)
                    }
                }
            }
        }
        .mapStyle(.hybrid(elevation: .realistic))
        .ignoresSafeArea()
    }

    // MARK: - Bottom card

    private var bottomCard: some View {
        VStack(spacing: 20) {
            // Loading message
            Text(loadingMessages[loadingIndex])
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(.white.opacity(0.85))
                .multilineTextAlignment(.center)
                .animation(.easeInOut(duration: 0.5), value: loadingIndex)

            // Progress dots
            HStack(spacing: 8) {
                ForEach(0..<5) { i in
                    Circle()
                        .fill(i == loadingIndex ? .white : .white.opacity(0.25))
                        .frame(width: i == loadingIndex ? 8 : 5, height: i == loadingIndex ? 8 : 5)
                        .animation(.spring(duration: 0.3), value: loadingIndex)
                }
            }

            // Route line
            HStack(spacing: 12) {
                VStack(spacing: 2) {
                    Text("FROM")
                        .font(.system(size: 9, weight: .semibold))
                        .kerning(1.5)
                        .foregroundStyle(.white.opacity(0.4))
                    Text("Your location")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.8))
                }

                HStack(spacing: 3) {
                    ForEach(0..<9) { i in
                        Circle()
                            .fill(Double(i) / 8.0 <= progress ? Color.white : Color.white.opacity(0.2))
                            .frame(width: 3, height: 3)
                            .animation(.easeInOut(duration: 0.1), value: progress)
                    }
                }
                .frame(maxWidth: .infinity)

                Image(systemName: "airplane")
                    .font(.system(size: 11))
                    .foregroundStyle(.orange)

                VStack(spacing: 2) {
                    Text("TO")
                        .font(.system(size: 9, weight: .semibold))
                        .kerning(1.5)
                        .foregroundStyle(.white.opacity(0.4))
                    Text(destinationName)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
        .padding(.horizontal, 24)
        .padding(.top, 24)
    }

    // MARK: - Helpers

    private var destinationName: String {
        let d = viewModel.answers.destination.trimmingCharacters(in: .whitespacesAndNewlines)
        return d.isEmpty ? "Your destination" : d.capitalized
    }

    private var originCoord: CLLocationCoordinate2D {
        viewModel.locationService.currentCoordinate.clCoordinate
    }

    private var destinationCoord: CLLocationCoordinate2D {
        approximateDestination.clCoordinate
    }

    private var approximateDestination: LocationCoordinate {
        let text = viewModel.answers.destination.lowercased()
        if text.contains("lisbon")      { return LocationCoordinate(latitude: 38.7223,  longitude: -9.1393)  }
        if text.contains("kyoto")       { return LocationCoordinate(latitude: 35.0116,  longitude: 135.7681) }
        if text.contains("mexico")      { return LocationCoordinate(latitude: 19.4326,  longitude: -99.1332) }
        if text.contains("istanbul")    { return LocationCoordinate(latitude: 41.0082,  longitude: 28.9784)  }
        if text.contains("paris")       { return LocationCoordinate(latitude: 48.8566,  longitude: 2.3522)   }
        if text.contains("tokyo")       { return LocationCoordinate(latitude: 35.6762,  longitude: 139.6503) }
        if text.contains("new york")    { return LocationCoordinate(latitude: 40.7128,  longitude: -74.0060) }
        if text.contains("barcelona")   { return LocationCoordinate(latitude: 41.3851,  longitude: 2.1734)   }
        if text.contains("amsterdam")   { return LocationCoordinate(latitude: 52.3676,  longitude: 4.9041)   }
        if text.contains("rome")        { return LocationCoordinate(latitude: 41.9028,  longitude: 12.4964)  }
        if text.contains("london")      { return LocationCoordinate(latitude: 51.5074,  longitude: -0.1278)  }
        if text.contains("dubai")       { return LocationCoordinate(latitude: 25.2048,  longitude: 55.2708)  }
        if text.contains("bangkok")     { return LocationCoordinate(latitude: 13.7563,  longitude: 100.5018) }
        if text.contains("bali")        { return LocationCoordinate(latitude: -8.3405,  longitude: 115.0920) }
        if text.contains("prague")      { return LocationCoordinate(latitude: 50.0755,  longitude: 14.4378)  }
        if text.contains("vienna")      { return LocationCoordinate(latitude: 48.2082,  longitude: 16.3738)  }
        if text.contains("miami")       { return LocationCoordinate(latitude: 25.7617,  longitude: -80.1918) }
        if text.contains("sydney")      { return LocationCoordinate(latitude: -33.8688, longitude: 151.2093) }
        return LocationCoordinate(latitude: 48.8566, longitude: 2.3522) // Paris as fallback
    }

    // Generate curved bezier path between origin and destination.
    // Arc scale kept small (0.10) so the plane stays within the visible map region.
    private func buildPath() {
        let origin   = originCoord
        let dest     = destinationCoord
        let segments = 180   // more points = smoother movement

        let midLat = (origin.latitude  + dest.latitude)  / 2
        let midLon = (origin.longitude + dest.longitude) / 2
        let dLat   = dest.latitude  - origin.latitude
        let dLon   = dest.longitude - origin.longitude

        // Smaller perpendicular offset so the arc fits inside the overview viewport
        let scale   = 0.10
        let ctrlLat = midLat - dLon * scale
        let ctrlLon = midLon + dLat * scale

        pathPoints = (0...segments).map { i in
            let t  = Double(i) / Double(segments)
            let t1 = 1 - t
            let lat = t1*t1 * origin.latitude  + 2*t1*t * ctrlLat + t*t * dest.latitude
            let lon = t1*t1 * origin.longitude + 2*t1*t * ctrlLon + t*t * dest.longitude
            return CLLocationCoordinate2D(latitude: lat, longitude: lon)
        }
    }

    private func updateCamera() {
        let origin = originCoord
        let dest   = destinationCoord

        // Compute bounds that include the full Bezier arc, not just the endpoints
        let allLats = pathPoints.isEmpty
            ? [origin.latitude, dest.latitude]
            : pathPoints.map(\.latitude)
        let allLons = pathPoints.isEmpty
            ? [origin.longitude, dest.longitude]
            : pathPoints.map(\.longitude)

        let minLat = allLats.min()!, maxLat = allLats.max()!
        let minLon = allLons.min()!, maxLon = allLons.max()!
        let centerLat = (minLat + maxLat) / 2
        let centerLon = (minLon + maxLon) / 2
        let spanLat   = (maxLat - minLat) * 1.5
        let spanLon   = (maxLon - minLon) * 1.5

        mapPosition = .region(MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon),
            span: MKCoordinateSpan(
                latitudeDelta:  max(spanLat, 8),
                longitudeDelta: max(spanLon, 8)
            )
        ))
    }

    // Bearing angle for the plane to face the right direction
    private func planeBearing(at index: Int) -> Double {
        guard pathPoints.count > 1 else { return 0 }
        let next = min(index + 3, pathPoints.count - 1)
        let curr = pathPoints[index]
        let nxt  = pathPoints[next]
        let dLon = (nxt.longitude - curr.longitude) * .pi / 180
        let lat1 = curr.latitude * .pi / 180
        let lat2 = nxt.latitude  * .pi / 180
        let y = sin(dLon) * cos(lat2)
        let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
        let bearing = atan2(y, x) * 180 / .pi
        return bearing
    }

    private func startAnimations() {
        // Pulse markers
        withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) {
            pulseOrigin = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) {
                pulseDestination = true
            }
        }

        // Fly the plane over 6.6s (180 steps × 37ms).
        // At 85% progress the map zooms in; the plane simultaneously fast-lands
        // to destination so it stays visible and on-path during the zoom.
        Task {
            for step in 0...180 {
                let t = Double(step) / 180.0
                // Ease in-out cubic
                let eased = t < 0.5 ? 4*t*t*t : 1 - pow(-2*t+2, 3)/2

                await MainActor.run {
                    withAnimation(.linear(duration: 0.035)) {
                        progress      = eased
                        trailProgress = eased
                    }

                    // At 85%: zoom map in AND slide plane to destination over 2.5s
                    if eased >= 0.85 && !hasZoomedIn {
                        hasZoomedIn = true

                        // Map zooms into destination
                        withAnimation(.easeInOut(duration: 2.5)) {
                            mapPosition = .region(MKCoordinateRegion(
                                center: destinationCoord,
                                span: MKCoordinateSpan(latitudeDelta: 0.06, longitudeDelta: 0.06)
                            ))
                        }

                        // Plane completes its flight in sync with the zoom
                        withAnimation(.easeIn(duration: 2.5)) {
                            progress      = 1.0
                            trailProgress = 1.0
                        }
                    }
                }

                // Stop stepping once the zoom+land animation has been triggered
                if hasZoomedIn { break }

                try? await Task.sleep(for: .milliseconds(37))
            }
        }

        // Cycle loading messages
        Task {
            for i in 1..<loadingMessages.count {
                try? await Task.sleep(for: .seconds(2.2))
                await MainActor.run {
                    withAnimation { loadingIndex = i }
                }
            }
        }
    }
}
