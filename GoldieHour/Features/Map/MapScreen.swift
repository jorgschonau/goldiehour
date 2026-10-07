import MapKit
import SwiftUI

struct MapScreen: View {
    @State private var cameraPosition: MapCameraPosition = .automatic

    var body: some View {
        Map(position: $cameraPosition)
            .mapStyle(.standard(elevation: .realistic))
            .mapControls {
                MapCompass()
                MapScaleView()
            }
            .safeAreaInset(edge: .top, spacing: 0) {
                header
            }
            .tint(GoldieHourTheme.accent)
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("GOLDIEHOUR")
                    .font(.caption.weight(.semibold))
                    .tracking(1.6)
                Text("Find your best light")
                    .font(.title3.weight(.medium))
            }

            Spacer()

            Button(action: {}) {
                Image(systemName: "calendar")
                    .font(.body.weight(.semibold))
                    .frame(width: 40, height: 40)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Choose a planning date")
        }
        .foregroundStyle(GoldieHourTheme.ink)
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
    }
}

#Preview {
    MapScreen()
}
