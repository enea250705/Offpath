import SwiftUI

// Matches the visual style of SignInWithAppleButton(.continue, style: .white)
struct GoogleSignInButton: View {
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Color.white

                HStack(spacing: 8) {
                    GoogleGLogo()
                        .frame(width: 20, height: 20)

                    Text(label)
                        .font(.system(size: 19, weight: .semibold, design: .default))
                        .foregroundStyle(Color(red: 0.11, green: 0.11, blue: 0.11))
                }
            }
            .clipShape(.rect(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Google G logo (SVG-accurate)

private struct GoogleGLogo: View {
    var body: some View {
        Canvas { ctx, size in
            let w = size.width
            let h = size.height
            let cx = w / 2
            let cy = h / 2
            let r  = min(w, h) / 2

            drawArc(ctx: ctx, cx: cx, cy: cy, r: r,
                    from: -14, to: 90,  color: Color(red: 0.259, green: 0.522, blue: 0.957))
            drawArc(ctx: ctx, cx: cx, cy: cy, r: r,
                    from: 90,  to: 196, color: Color(red: 0.918, green: 0.263, blue: 0.208))
            drawArc(ctx: ctx, cx: cx, cy: cy, r: r,
                    from: 196, to: 256, color: Color(red: 0.984, green: 0.737, blue: 0.020))
            drawArc(ctx: ctx, cx: cx, cy: cy, r: r,
                    from: 256, to: 346, color: Color(red: 0.204, green: 0.659, blue: 0.325))

            var circlePath = Path()
            circlePath.addEllipse(in: CGRect(x: cx - r * 0.58, y: cy - r * 0.58,
                                             width: r * 1.16, height: r * 1.16))
            ctx.fill(circlePath, with: .color(.white))

            let barH = r * 0.28
            var barPath = Path()
            barPath.addRoundedRect(
                in: CGRect(x: cx - r * 0.08, y: cy - barH / 2, width: r * 1.08, height: barH),
                cornerSize: CGSize(width: 2, height: 2)
            )
            ctx.fill(barPath, with: .color(Color(red: 0.259, green: 0.522, blue: 0.957)))
        }
    }

    private func drawArc(ctx: GraphicsContext, cx: CGFloat, cy: CGFloat, r: CGFloat,
                         from startDeg: Double, to endDeg: Double, color: Color) {
        var path = Path()
        path.move(to: CGPoint(x: cx, y: cy))
        path.addArc(center: CGPoint(x: cx, y: cy), radius: r,
                    startAngle: .degrees(startDeg), endAngle: .degrees(endDeg), clockwise: false)
        path.closeSubpath()
        ctx.fill(path, with: .color(color))
    }
}
