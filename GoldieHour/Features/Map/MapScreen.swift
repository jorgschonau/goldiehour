import MapKit
import SwiftUI
import UIKit

struct MapScreen: View {
    @Environment(AppModel.self) private var appModel
    @Environment(\.openURL) private var openURL

    @State private var cameraPosition: MapCameraPosition = .automatic
    @State private var visibleRegion: MKCoordinateRegion?
    @State private var locationService = LocationService()
    @State private var hasCenteredOnUser = false
    @State private var showsLocationAlert = false

    var body: some View {
        @Bindable var appModel = appModel

        Map(position: $cameraPosition) {
            if locationService.authorization == .authorized {
                UserAnnotation()
            }

            ForEach(appModel.spots) { spot in
                Annotation(
                    "",
                    coordinate: spot.coordinate.clLocationCoordinate,
                    anchor: .bottom
                ) {
                    Button {
                        appModel.selectedSpot = spot
                    } label: {
                        SpotAnnotationView(isSelected: appModel.selectedSpot?.id == spot.id)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(spot.name)
                    .accessibilityHint("Shows golden-hour details")
                }
            }
        }
            .mapStyle(.standard(elevation: .realistic))
            .mapControls {
                MapCompass()
                MapScaleView()
            }
            .onMapCameraChange(frequency: .onEnd) { context in
                visibleRegion = context.region
                if !appModel.isSearching {
                    appModel.mapMessage = nil
                }
            }
            .safeAreaInset(edge: .top, spacing: 0) {
                header
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                mapActions
            }
            .tint(GoldieHourTheme.accent)
            .task {
                locationService.start()
            }
            .onChange(of: locationService.userLocation) { _, newLocation in
                guard let newLocation, !hasCenteredOnUser else {
                    return
                }
                centerMap(on: newLocation.coordinate)
                hasCenteredOnUser = true
            }
            .onChange(of: locationService.error) { _, error in
                switch error {
                case .servicesDisabled:
                    appModel.mapMessage = "Location Services are turned off. You can still explore the map."
                case .unavailable:
                    appModel.mapMessage = "Current location is unavailable. You can still explore the map."
                case nil:
                    break
                }
            }
            .sheet(item: $appModel.selectedSpot) { spot in
                SpotSheet(spot: spot, planningDate: appModel.planningDate)
            }
            .alert("Location access needed", isPresented: $showsLocationAlert) {
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        openURL(url)
                    }
                }
                Button("Not now", role: .cancel) {}
            } message: {
                Text("Enable location access to jump to nearby places. The map remains usable without it.")
            }
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

            Label(planningDateLabel, systemImage: "calendar")
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 12)
                .frame(height: 38)
                .background(.regularMaterial, in: Capsule())
        }
        .foregroundStyle(.primary)
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
    }

    private var mapActions: some View {
        VStack(spacing: 10) {
            if let message = appModel.mapMessage {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)
            }

            HStack(spacing: 10) {
                Button(action: handleLocationButton) {
                    Group {
                        if locationService.isRefreshing {
                            ProgressView()
                        } else {
                            Image(systemName: "location.fill")
                        }
                    }
                    .frame(width: 48, height: 48)
                }
                .buttonStyle(.bordered)
                .buttonBorderShape(.circle)
                .accessibilityLabel("Go to my location")

                Button {
                    Task {
                        await searchVisibleRegion()
                    }
                } label: {
                    HStack(spacing: 8) {
                        if appModel.isSearching {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "sparkle.magnifyingglass")
                        }
                        Text(appModel.isSearching ? "Finding places…" : "Search this area")
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                }
                .buttonStyle(.borderedProminent)
                .tint(GoldieHourTheme.accent)
                .disabled(visibleRegion == nil || appModel.isSearching)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .background(.ultraThinMaterial)
    }

    private var planningDateLabel: String {
        if appModel.planningDate == .today() {
            return "Today"
        }

        guard let date = appModel.planningDate.interval(in: .current)?.start else {
            return "Date"
        }

        let formatter = DateFormatter()
        formatter.locale = .autoupdatingCurrent
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    private func handleLocationButton() {
        switch locationService.authorization {
        case .notDetermined:
            locationService.requestPermission()
        case .authorized:
            if let location = locationService.userLocation {
                centerMap(on: location.coordinate)
                hasCenteredOnUser = true
            } else {
                locationService.refresh()
            }
        case .restricted, .denied:
            showsLocationAlert = true
        }
    }

    private func centerMap(on coordinate: Coordinate) {
        let currentSpan = visibleRegion?.span
        let span = MKCoordinateSpan(
            latitudeDelta: min(max(currentSpan?.latitudeDelta ?? 0.16, 0.04), 0.25),
            longitudeDelta: min(max(currentSpan?.longitudeDelta ?? 0.16, 0.04), 0.25)
        )
        cameraPosition = .region(
            MKCoordinateRegion(
                center: coordinate.clLocationCoordinate,
                span: span
            )
        )
    }

    private func searchVisibleRegion() async {
        guard let visibleRegion else {
            return
        }

        appModel.isSearching = true
        appModel.mapMessage = nil
        defer {
            appModel.isSearching = false
        }

        do {
            let spots = try await SpotSearchService().search(in: visibleRegion)
            appModel.spots = spots
            appModel.selectedSpot = nil
            appModel.mapMessage = spots.isEmpty
                ? "No outdoor places found here. Move the map and try another area."
                : "\(spots.count) places found"
        } catch {
            appModel.mapMessage = error.localizedDescription
        }
    }
}

#Preview {
    MapScreen()
        .environment(AppModel())
}
