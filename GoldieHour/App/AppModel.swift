import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    var planningDate: LocalDate

    init(planningDate: LocalDate = .today()) {
        self.planningDate = planningDate
    }
}
