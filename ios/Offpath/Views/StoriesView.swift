import SwiftUI

struct StoriesView: View {
    let viewModel: OffpathViewModel

    @State private var currentSlide: Int = 0
    @State private var progress: Double = 0
    @State private var timer: Timer?
    @State private var appear: Bool = false
    @State private var photos: [PexelsPhoto] = []

    private let pexels = PexelsService()
    private let slideDuration: Double = 3.5

    private var slides: [StorySlide] {
        guard let plan = viewModel.plan else { return [] }
        var result: [StorySlide] = []
        result.append(StorySlide(
            tag: plan.destinationCountry.uppercased(),
            headline: plan.destinationCity,
            body: plan.shareLine,
            gradient: [Color(red: 0.08, green: 0.08, blue: 0.14), Color(red: 0.18, green: 0.12, blue: 0.28)],
            accent: Color(red: 0.90, green: 0.70, blue: 0.40)
        ))
        result.append(StorySlide(
            tag: "YOUR TRIP",
            headline: "Planned like a local",
            body: plan.intro,
            gradient: [Color(red: 0.05, green: 0.18, blue: 0.20), Color(red: 0.08, green: 0.28, blue: 0.30)],
            accent: Color(red: 0.40, green: 0.85, blue: 0.75)
        ))
        if let day = plan.fullDays.first {
            result.append(StorySlide(
                tag: "DAY 1",
                headline: day.title,
                body: day.mood,
                gradient: [Color(red: 0.20, green: 0.10, blue: 0.05), Color(red: 0.35, green: 0.18, blue: 0.08)],
                accent: Color(red: 0.95, green: 0.55, blue: 0.25)
            ))
        }
        if let day = plan.fullDays.dropFirst().first {
            result.append(StorySlide(
                tag: "DAY 2",
                headline: day.title,
                body: day.summary,
                gradient: [Color(red: 0.05, green: 0.12, blue: 0.25), Color(red: 0.10, green: 0.20, blue: 0.40)],
                accent: Color(red: 0.50, green: 0.72, blue: 1.00)
            ))
        }
        if let place = plan.hiddenPlaces.first {
            result.append(StorySlide(
                tag: "HIDDEN GEM",
                headline: place.name,
                body: place.note,
                gradient: [Color(red: 0.10, green: 0.06, blue: 0.18), Color(red: 0.22, green: 0.10, blue: 0.32)],
                accent: Color(red: 0.80, green: 0.50, blue: 1.00)
            ))
        }
        result.append(StorySlide(
            tag: "READY",
            headline: "Your plan is waiting",
            body: "Every moment chosen so the trip feels like it was made for you.",
            gradient: [Color(red: 0.04, green: 0.08, blue: 0.08), Color(red: 0.08, green: 0.16, blue: 0.12)],
            accent: Color(red: 0.45, green: 0.95, blue: 0.60),
            isFinal: true
        ))
        return result
    }

    // Pexels photo for the current slide (nil = use gradient fallback)
    private func photo(for index: Int) -> PexelsPhoto? {
        guard index < photos.count else { return nil }
        return photos[index]
    }

    var body: some View {
        ZStack {
            if slides.isEmpty {
                Color.black.ignoresSafeArea()
            } else {
                let slide = slides[min(currentSlide, slides.count - 1)]
                let currentPhoto = photo(for: currentSlide)

                // Background: Pexels photo if available, else gradient
                ZStack {
                    if let photo = currentPhoto {
                        AsyncImage(url: photo.largeURL) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .scaledToFill()
                                    .frame(maxWidth: UIScreen.main.bounds.width, maxHeight: UIScreen.main.bounds.height)
                                    .clipped()
                                    .ignoresSafeArea()
                                    .transition(.opacity)
                            default:
                                gradientBackground(slide: slide)
                            }
                        }
                    } else {
                        gradientBackground(slide: slide)
                    }

                    // Dark scrim so text is always readable over photos
                    LinearGradient(
                        colors: [
                            .black.opacity(0.35),
                            .black.opacity(0.10),
                            .black.opacity(0.65)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .ignoresSafeArea()
                }
                .animation(.easeInOut(duration: 0.5), value: currentSlide)

                // Tap zones (left / right to navigate)
                HStack(spacing: 0) {
                    Color.clear
                        .contentShape(Rectangle())
                        .onTapGesture { goToPrevious() }

                    Color.clear
                        .contentShape(Rectangle())
                        .onTapGesture { goToNext() }
                }

                // Content
                VStack(alignment: .leading, spacing: 0) {
                    // Progress bars
                    HStack(spacing: 4) {
                        ForEach(0..<slides.count, id: \.self) { i in
                            GeometryReader { geo in
                                Capsule()
                                    .fill(.white.opacity(0.30))
                                    .overlay(alignment: .leading) {
                                        Capsule()
                                            .fill(.white)
                                            .frame(width: geo.size.width * segmentFill(for: i))
                                    }
                            }
                            .frame(height: 3)
                            .animation(.linear(duration: 0.1), value: progress)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 60)

                    Spacer()

                    // Slide content
                    VStack(alignment: .leading, spacing: 20) {
                        Text(slide.tag)
                            .font(.system(size: 11, weight: .bold))
                            .kerning(3)
                            .foregroundStyle(slide.accent)
                            .opacity(appear ? 1 : 0)
                            .offset(y: appear ? 0 : 10)

                        Text(slide.headline)
                            .font(.system(size: 44, weight: .bold, design: .default))
                            .foregroundStyle(.white)
                            .lineLimit(3)
                            .minimumScaleFactor(0.7)
                            .opacity(appear ? 1 : 0)
                            .offset(y: appear ? 0 : 20)
                            .animation(.easeOut(duration: 0.55).delay(0.08), value: appear)

                        Text(slide.body)
                            .font(.system(size: 17, weight: .medium))
                            .foregroundStyle(.white.opacity(0.85))
                            .lineLimit(4)
                            .fixedSize(horizontal: false, vertical: true)
                            .opacity(appear ? 1 : 0)
                            .offset(y: appear ? 0 : 16)
                            .animation(.easeOut(duration: 0.55).delay(0.16), value: appear)

                        if slide.isFinal {
                            Button {
                                stopTimer()
                                viewModel.advanceFromStories()
                            } label: {
                                HStack(spacing: 10) {
                                    Text("See your plan")
                                        .font(.headline)
                                    Image(systemName: "arrow.right")
                                        .font(.headline.weight(.bold))
                                }
                                .foregroundStyle(.black)
                                .padding(.horizontal, 28)
                                .padding(.vertical, 18)
                                .background(slide.accent, in: Capsule())
                            }
                            .buttonStyle(.plain)
                            .opacity(appear ? 1 : 0)
                            .offset(y: appear ? 0 : 12)
                            .animation(.easeOut(duration: 0.55).delay(0.28), value: appear)
                        }

                    }
                    .padding(.horizontal, 28)
                    .padding(.bottom, 80)
                }

                // Skip button top-right
                VStack {
                    HStack {
                        Spacer()
                        Button {
                            stopTimer()
                            viewModel.advanceFromStories()
                        } label: {
                            Text("Skip")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.white.opacity(0.7))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(.white.opacity(0.15), in: Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 72)
                    Spacer()
                }
            }
        }
        .ignoresSafeArea()
        .onAppear {
            startSlide()
            loadPhotos()
        }
        .onDisappear { stopTimer() }
    }

    // MARK: - Gradient fallback background

    private func gradientBackground(slide: StorySlide) -> some View {
        ZStack {
            LinearGradient(
                colors: slide.gradient,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            Circle()
                .fill(slide.accent.opacity(0.08))
                .frame(width: 400, height: 400)
                .offset(x: 120, y: -180)
                .blur(radius: 60)

            Circle()
                .fill(slide.accent.opacity(0.06))
                .frame(width: 300, height: 300)
                .offset(x: -100, y: 200)
                .blur(radius: 50)
        }
    }

    // MARK: - Pexels photo loading

    private func loadPhotos() {
        guard let city = viewModel.plan?.destinationCity, !city.isEmpty else { return }
        Task {
            let fetched = await pexels.photos(for: city, count: slides.count)
            await MainActor.run { photos = fetched }
        }
    }

    // MARK: - Timer helpers

    private func segmentFill(for index: Int) -> Double {
        if index < currentSlide { return 1.0 }
        if index == currentSlide { return progress / slideDuration }
        return 0.0
    }

    private func startSlide() {
        appear = false
        withAnimation(.easeOut(duration: 0.45)) { appear = true }
        stopTimer()
        progress = 0
        timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
            Task { @MainActor in
                progress += 0.05
                if progress >= slideDuration { goToNext() }
            }
        }
    }

    private func goToNext() {
        stopTimer()
        if currentSlide < slides.count - 1 {
            currentSlide += 1
            startSlide()
        } else {
            viewModel.advanceFromStories()
        }
    }

    private func goToPrevious() {
        stopTimer()
        if currentSlide > 0 { currentSlide -= 1 }
        startSlide()
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
}

private struct StorySlide {
    let tag: String
    let headline: String
    let body: String
    let gradient: [Color]
    let accent: Color
    var isFinal: Bool = false
}
