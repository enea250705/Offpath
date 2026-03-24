import SwiftUI
import MapKit

struct MapTabView: View {
    let viewModel: OffpathViewModel

    @State private var mapPosition: MapCameraPosition = .automatic
    @State private var selectedPlace: MapPin?

    private var itineraryPins: [MapPin] {
        guard let plan = viewModel.plan else { return [] }
        return plan.fullDays.flatMap { day in
            day.moments.map { moment in
                MapPin(
                    id: moment.id,
                    title: moment.title,
                    subtitle: "\(day.title) · \(moment.timeLabel)",
                    coordinate: moment.coordinate.clCoordinate,
                    kind: .itinerary
                )
            }
        }
    }

    private var hiddenPins: [MapPin] {
        viewModel.displayHiddenPlaces.map { place in
            MapPin(
                id: place.id,
                title: place.name,
                subtitle: place.neighborhood,
                coordinate: place.coordinate.clCoordinate,
                kind: .hidden
            )
        }
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Map(position: $mapPosition) {
                // User location
                UserAnnotation()

                // Itinerary spots (orange)
                ForEach(itineraryPins) { pin in
                    Annotation(pin.title, coordinate: pin.coordinate) {
                        PinMarker(color: .orange, isSelected: selectedPlace?.id == pin.id)
                            .onTapGesture { selectedPlace = pin }
                    }
                }

                // Hidden places (purple)
                ForEach(hiddenPins) { pin in
                    Annotation(pin.title, coordinate: pin.coordinate) {
                        PinMarker(color: Color(red: 0.7, green: 0.4, blue: 1.0), isSelected: selectedPlace?.id == pin.id)
                            .onTapGesture { selectedPlace = pin }
                    }
                }
            }
            .mapStyle(.standard(elevation: .realistic, pointsOfInterest: .includingAll))
            .ignoresSafeArea()
            .onAppear { centerOnDestination() }

            // Bottom legend / selected card
            VStack(spacing: 0) {
                if let pin = selectedPlace {
                    selectedCard(pin)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                legendBar
            }
            .animation(.spring(duration: 0.3), value: selectedPlace?.id)
        }
        .ignoresSafeArea(edges: .bottom)
    }

    // MARK: - Selected card

    private func selectedCard(_ pin: MapPin) -> some View {
        HStack(spacing: 14) {
            Circle()
                .fill(pin.kind == .hidden ? Color(red: 0.7, green: 0.4, blue: 1.0) : .orange)
                .frame(width: 42, height: 42)
                .overlay {
                    Image(systemName: pin.kind == .hidden ? "eye.slash" : "sparkles")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                }

            VStack(alignment: .leading, spacing: 3) {
                Text(pin.title)
                    .font(.headline)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                Text(pin.subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Button {
                selectedPlace = nil
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.title3)
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
        }
        .padding(18)
        .background(.regularMaterial, in: .rect(cornerRadius: 22))
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }

    // MARK: - Legend

    private var legendBar: some View {
        HStack(spacing: 20) {
            HStack(spacing: 6) {
                Circle().fill(.orange).frame(width: 10, height: 10)
                Text("Itinerary spots")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
            }
            HStack(spacing: 6) {
                Circle().fill(Color(red: 0.7, green: 0.4, blue: 1.0)).frame(width: 10, height: 10)
                Text("Hidden places")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity)
        .background(.regularMaterial)
    }

    // MARK: - Helpers

    private func centerOnDestination() {
        guard let plan = viewModel.plan else { return }
        mapPosition = .region(MKCoordinateRegion(
            center: plan.destinationCoordinate.clCoordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.06, longitudeDelta: 0.06)
        ))
    }
}

// MARK: - Pin marker

struct PinMarker: View {
    let color: Color
    let isSelected: Bool

    var body: some View {
        ZStack {
            if isSelected {
                Circle()
                    .fill(color.opacity(0.25))
                    .frame(width: 44, height: 44)
            }
            Circle()
                .fill(color)
                .frame(width: isSelected ? 26 : 20, height: isSelected ? 26 : 20)
                .overlay { Circle().fill(.white).frame(width: 8, height: 8) }
                .shadow(color: color.opacity(0.5), radius: 6)
                .animation(.spring(duration: 0.3), value: isSelected)
        }
    }
}

// MARK: - Pin model

struct MapPin: Identifiable {
    let id: UUID
    let title: String
    let subtitle: String
    let coordinate: CLLocationCoordinate2D
    let kind: PinKind

    enum PinKind { case itinerary, hidden }
}
