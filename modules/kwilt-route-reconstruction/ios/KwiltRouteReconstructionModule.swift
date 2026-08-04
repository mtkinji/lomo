import ExpoModulesCore
import MapKit

public final class KwiltRouteReconstructionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KwiltRouteReconstruction")

    Function("isAvailable") { true }

    AsyncFunction("routeBetween") { (
      fromLatitude: Double,
      fromLongitude: Double,
      toLatitude: Double,
      toLongitude: Double,
      transport: String,
      promise: Promise
    ) in
      let from = CLLocationCoordinate2D(latitude: fromLatitude, longitude: fromLongitude)
      let to = CLLocationCoordinate2D(latitude: toLatitude, longitude: toLongitude)
      guard CLLocationCoordinate2DIsValid(from), CLLocationCoordinate2DIsValid(to) else {
        promise.reject(InvalidRouteReconstructionException("The route endpoints are invalid."))
        return
      }
      let request = MKDirections.Request()
      request.source = MKMapItem(placemark: MKPlacemark(coordinate: from))
      request.destination = MKMapItem(placemark: MKPlacemark(coordinate: to))
      request.transportType = transport == "automobile" ? .automobile : .walking
      request.requestsAlternateRoutes = false
      MKDirections(request: request).calculate { response, error in
        if let error {
          promise.reject(RouteReconstructionException(error.localizedDescription))
          return
        }
        guard let route = response?.routes.first else {
          promise.reject(RouteReconstructionException("Apple Maps did not return a route."))
          return
        }
        let points = route.polyline.points()
        let coordinates = (0..<route.polyline.pointCount).map { index in
          let coordinate = points[index].coordinate
          return ["latitude": coordinate.latitude, "longitude": coordinate.longitude]
        }
        promise.resolve(["coordinates": coordinates, "distanceM": route.distance])
      }
    }
  }
}

private final class InvalidRouteReconstructionException: GenericException<String>, @unchecked Sendable {
  override var reason: String { param }
}

private final class RouteReconstructionException: GenericException<String>, @unchecked Sendable {
  override var reason: String { param }
}
