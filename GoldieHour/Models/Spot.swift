import Foundation

struct Spot: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let name: String
    let coordinate: Coordinate
    let locality: String?
    let administrativeArea: String?
    let countryCode: String?
    let categoryIdentifier: String?
    let timeZoneIdentifier: String?

    init(
        id: String? = nil,
        name: String,
        coordinate: Coordinate,
        locality: String? = nil,
        administrativeArea: String? = nil,
        countryCode: String? = nil,
        categoryIdentifier: String? = nil,
        timeZoneIdentifier: String? = nil
    ) {
        self.id = id ?? Self.stableID(name: name, coordinate: coordinate)
        self.name = name
        self.coordinate = coordinate
        self.locality = locality
        self.administrativeArea = administrativeArea
        self.countryCode = countryCode
        self.categoryIdentifier = categoryIdentifier
        self.timeZoneIdentifier = timeZoneIdentifier
    }

    var regionDescription: String? {
        let parts = [locality, administrativeArea]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        guard !parts.isEmpty else {
            return countryCode
        }

        if parts.count == 2, parts[0] == parts[1] {
            return parts[0]
        }

        return parts.joined(separator: ", ")
    }

    static func stableID(name: String, coordinate: Coordinate) -> String {
        let normalizedName = name
            .folding(
                options: [.caseInsensitive, .diacriticInsensitive],
                locale: Locale(identifier: "en_US_POSIX")
            )
            .unicodeScalars
            .map { CharacterSet.alphanumerics.contains($0) ? Character(String($0)) : "-" }

        let slug = String(normalizedName)
            .split(separator: "-", omittingEmptySubsequences: true)
            .joined(separator: "-")
            .lowercased()
        let latitude = String(
            format: "%.5f",
            locale: Locale(identifier: "en_US_POSIX"),
            coordinate.latitude
        )
        let longitude = String(
            format: "%.5f",
            locale: Locale(identifier: "en_US_POSIX"),
            coordinate.longitude
        )

        return "\(slug)|\(latitude)|\(longitude)"
    }
}
