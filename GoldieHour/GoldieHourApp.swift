import SwiftUI

@main
struct GoldieHourApp: App {
    @State private var appModel = AppModel()

    var body: some Scene {
        WindowGroup {
            MapScreen()
                .environment(appModel)
        }
    }
}
