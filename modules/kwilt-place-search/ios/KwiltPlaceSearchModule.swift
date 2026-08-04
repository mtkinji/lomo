import CoreLocation
import ExpoModulesCore
import MapKit

public final class KwiltPlaceSearchModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KwiltPlaceSearch")

    Function("isAvailable") { true }

    AsyncFunction("searchNearby") { (latitude: Double, longitude: Double, rawRadiusMeters: Double, promise: Promise) in
      guard CLLocationCoordinate2DIsValid(.init(latitude: latitude, longitude: longitude)) else {
        promise.reject(InvalidPlaceSearchException("The nearby search center is invalid."))
        return
      }
      let radiusMeters = min(max(rawRadiusMeters, 100), 1609.344)
      let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
      let request = MKLocalPointsOfInterestRequest(center: center, radius: radiusMeters)
      request.pointOfInterestFilter = MKPointOfInterestFilter(including: self.recommendationCategories())
      let search = MKLocalSearch(request: request)
      search.start { response, error in
        if let error {
          promise.reject(PlaceSearchException(error.localizedDescription))
          return
        }
        let origin = CLLocation(latitude: latitude, longitude: longitude)
        let places: [[String: Any?]] = (response?.mapItems ?? []).compactMap { item in
          guard let rawName = item.name?.trimmingCharacters(in: .whitespacesAndNewlines), !rawName.isEmpty else {
            return nil
          }
          let coordinate = item.placemark.coordinate
          let distance = origin.distance(from: CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude))
          guard distance <= radiusMeters else { return nil }
          let slug = rawName.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
            .lowercased()
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
          return [
            "id": "apple-poi:\(slug):\(String(format: "%.5f", coordinate.latitude)):\(String(format: "%.5f", coordinate.longitude))",
            "name": rawName,
            "category": item.pointOfInterestCategory?.rawValue,
            "latitude": coordinate.latitude,
            "longitude": coordinate.longitude,
          ]
        }
        promise.resolve(places)
      }
    }
  }

  private func recommendationCategories() -> [MKPointOfInterestCategory] {
    var categories: [MKPointOfInterestCategory] = [
      .aquarium,
      .beach,
      .campground,
      .library,
      .museum,
      .nationalPark,
      .park,
      .theater,
      .zoo,
    ]
    if #available(iOS 18.0, *) {
      categories.append(contentsOf: [
        .castle,
        .fortress,
        .hiking,
        .landmark,
        .nationalMonument,
        .planetarium,
      ])
    }
    return categories
  }
}

private final class InvalidPlaceSearchException: GenericException<String>, @unchecked Sendable {
  override var reason: String { param }
}

private final class PlaceSearchException: GenericException<String>, @unchecked Sendable {
  override var reason: String { param }
}
