import SwiftUI

// MARK: - Modern Google Sign-In button
// Matches Google's branding guidelines for the "Standard" button.
// Designed to align perfectly with the Apple Sign-In button.

struct GoogleSignInButton: View {
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                GoogleGLogo()
                    .frame(width: 18, height: 18)
                    .padding(.leading, 12)

                Text(label)
                    .font(.system(size: 16, weight: .medium, design: .default))
                    .foregroundStyle(Color(red: 0.25, green: 0.25, blue: 0.25))
                
                Spacer()
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(Color.white)
            .clipShape(.rect(cornerRadius: 12)) // Softer, more modern corners
            .shadow(color: .black.opacity(0.08), radius: 4, x: 0, y: 2)
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color(white: 0.9), lineWidth: 0.5)
            }
        }
        .buttonStyle(GoogleButtonStyle())
    }
}

// MARK: - Custom Button Style for press effect
struct GoogleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Refined Google G logo
private struct GoogleGLogo: View {
    var body: some View {
        Canvas { ctx, size in
            let w = size.width
            let h = size.height
            let cx = w / 2
            let cy = h / 2
            let r  = min(w, h) / 2

            // Colors from official branding
            let blue   = Color(red: 66/255, green: 133/255, blue: 244/255)
            let green  = Color(red: 52/255, green: 168/255, blue: 83/255)
            let yellow = Color(red: 251/255, green: 188/255, blue: 5/255)
            let red    = Color(red: 234/255, green: 67/255, blue: 53/255)

            // Red (top)
            ctx.fill(arc(cx, cy, r, -190, -320), with: .color(red))
            
            // Yellow (bottom-left)
            ctx.fill(arc(cx, cy, r, -135, -195), with: .color(yellow))
            
            // Green (bottom)
            ctx.fill(arc(cx, cy, r, -15, -145), with: .color(green))
            
            // Blue (right + crossbar)
            ctx.fill(arc(cx, cy, r, 45, -20), with: .color(blue))
            
            // Crossbar
            var bar = Path()
            bar.addRect(CGRect(x: cx, y: cy - r*0.2, width: r, height: r*0.4))
            ctx.fill(bar, with: .color(blue))
            
            // Inner cutout (white)
            var cutout = Path()
            cutout.addEllipse(in: CGRect(x: cx - r*0.65, y: cy - r*0.65, width: r*1.3, height: r*1.3))
            ctx.blendMode = .clear
            ctx.fill(cutout, with: .color(.white))
        }
    }

    private func arc(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ start: Double, _ end: Double) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: x, y: y))
        p.addArc(center: CGPoint(x: x, y: y), radius: r, startAngle: .degrees(start), endAngle: .degrees(end), clockwise: true)
        p.closeSubpath()
        return p
    }
}
