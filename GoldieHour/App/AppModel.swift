import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    var planningDate: LocalDate
    var spots: [Spot] = []
    var selectedSpot: Spot?
    var isSearching = false
    var mapMessage: String?

    init(planningDate: LocalDate = .today()) {
        self.planningDate = planningDate
    }
}
