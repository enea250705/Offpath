import SwiftUI

// MARK: - Official Google Sign-In button
// Matches Google's branding guidelines exactly.

struct GoogleSignInButton: View {
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 0) {
                // Google G logo box
                ZStack {
                    Color.white
                    GoogleGLogo()
                        .frame(width: 20, height: 20)
                }
                .frame(width: 52, height: 52)

                // Divider
                Color(red: 0.86, green: 0.86, blue: 0.86)
                    .frame(width: 1, height: 52)

                // Label
                Text(label)
                    .font(.system(size: 16, weight: .medium, design: .default))
                    .foregroundStyle(Color(red: 0.25, green: 0.25, blue: 0.25))
                    .frame(maxWidth: .infinity)

            }
            .frame(height: 52)
            .background(Color.white)
            .clipShape(.rect(cornerRadius: 4))
            .shadow(color: .black.opacity(0.18), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Google G logo drawn in SwiftUI
private struct GoogleGLogo: View {
    var body: some View {
        Canvas { ctx, size in
            let w = size.width
            let h = size.height
            let cx = w / 2
            let cy = h / 2
            let r  = min(w, h) / 2

            // Blue arc (top-right, bottom-right)
            drawArc(ctx: ctx, cx: cx, cy: cy, r: r,
                    from: -14, to: 90, color: Color(red: 0.259, green: 0.522, blue: 0.957))

            // Red arc (top)
            drawArc(ctx: ctx, cx: cx, cy: cy, r: r,
                    from: 90, to: 196, color: Color(red: 0.918, green: 0.263, blue: 0.208))

            // Yellow arc (left)
            drawArc(ctx: ctx, cx: cx, cy: cy, r: r,
                    from: 196, to: 256, color: Color(red: 0.984, green: 0.737, blue: 0.020))

            // Green arc (bottom)
            drawArc(ctx: ctx, cx: cx, cy: cy, r: r,
                    from: 256, to: 346, color: Color(red: 0.204, green: 0.659, blue: 0.325))

            // White center circle
            var circlePath = Path()
            circlePath.addEllipse(in: CGRect(x: cx - r * 0.58, y: cy - r * 0.58,
                                             width: r * 1.16, height: r * 1.16))
            ctx.fill(circlePath, with: .color(.white))

            // Blue horizontal bar (the crossbar of the G)
            let barH = r * 0.28
            let barY = cy - barH / 2
            var barPath = Path()
            barPath.addRoundedRect(
                in: CGRect(x: cx - r * 0.08, y: barY, width: r * 1.08, height: barH),
                cornerSize: CGSize(width: 2, height: 2)
            )
            ctx.fill(barPath, with: .color(Color(red: 0.259, green: 0.522, blue: 0.957)))
        }
    }

    private func drawArc(ctx: GraphicsContext, cx: CGFloat, cy: CGFloat, r: CGFloat,
                         from startDeg: Double, to endDeg: Double, color: Color) {
        var path = Path()
        path.move(to: CGPoint(x: cx, y: cy))
        path.addArc(center: CGPoint(x: cx, y: cy),
                    radius: r,
                    startAngle: .degrees(startDeg),
                    endAngle: .degrees(endDeg),
                    clockwise: false)
        path.closeSubpath()
        ctx.fill(path, with: .color(color))
    }
}
