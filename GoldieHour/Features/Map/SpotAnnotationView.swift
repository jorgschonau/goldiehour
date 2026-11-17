import SwiftUI

struct SpotAnnotationView: View {
    let isSelected: Bool

    var body: some View {
        Image(systemName: "sun.max.fill")
            .font(.system(size: isSelected ? 17 : 14, weight: .semibold))
            .foregroundStyle(.white)
            .frame(
                width: isSelected ? 42 : 34,
                height: isSelected ? 42 : 34
            )
            .background(GoldieHourTheme.accent, in: Circle())
            .overlay {
                Circle()
                    .stroke(.white.opacity(0.9), lineWidth: 2)
            }
            .contentShape(Circle())
            .accessibilityHidden(true)
    }
}
