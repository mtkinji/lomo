import ExpoModulesCore
import Network

public final class KwiltNearbyTableModule: Module {
  private let serviceType = "_kwilt-table._tcp"
  private let queue = DispatchQueue(label: "app.kwilt.games.nearby-table")
  private var listener: NWListener?
  private var browser: NWBrowser?

  public func definition() -> ModuleDefinition {
    Name("KwiltNearbyTable")
    Events("onTablesChanged", "onNearbyState")

    Function("isAvailable") { true }

    AsyncFunction("startAdvertising") { (rawCode: String, rawGame: String) in
      self.stopAdvertising()
      let code = self.normalizeCode(rawCode)
      let game = rawGame.lowercased()
      guard code.count == 6, ["bank", "slanguage"].contains(game) else {
        throw NearbyTableException("Invalid nearby table advertisement.")
      }

      let parameters = NWParameters.tcp
      parameters.includePeerToPeer = true
      let listener = try NWListener(using: parameters, on: .any)
      listener.service = NWListener.Service(name: "KWILT-\(game.uppercased())-\(code)", type: self.serviceType)
      listener.newConnectionHandler = { connection in connection.cancel() }
      listener.stateUpdateHandler = { [weak self] state in
        switch state {
        case .ready:
          self?.sendEvent("onNearbyState", ["state": "advertising"])
        case .failed(let error):
          self?.sendEvent("onNearbyState", ["state": "failed", "message": error.localizedDescription])
        case .cancelled:
          self?.sendEvent("onNearbyState", ["state": "idle"])
        default:
          break
        }
      }
      self.listener = listener
      listener.start(queue: self.queue)
    }

    Function("stopAdvertising") { self.stopAdvertising() }

    AsyncFunction("startBrowsing") {
      self.stopBrowsing()
      let parameters = NWParameters.tcp
      parameters.includePeerToPeer = true
      let browser = NWBrowser(for: .bonjour(type: self.serviceType, domain: nil), using: parameters)
      browser.browseResultsChangedHandler = { [weak self] results, _ in
        let tables = results.compactMap { self?.table(from: $0.endpoint) }
          .sorted { ($0["code"] ?? "") < ($1["code"] ?? "") }
        self?.sendEvent("onTablesChanged", ["tables": tables])
      }
      browser.stateUpdateHandler = { [weak self] state in
        switch state {
        case .ready:
          self?.sendEvent("onNearbyState", ["state": "browsing"])
        case .failed(let error):
          self?.sendEvent("onNearbyState", ["state": "failed", "message": error.localizedDescription])
        case .cancelled:
          self?.sendEvent("onNearbyState", ["state": "idle"])
        default:
          break
        }
      }
      self.browser = browser
      browser.start(queue: self.queue)
    }

    Function("stopBrowsing") { self.stopBrowsing() }

    OnDestroy {
      self.stopAdvertising()
      self.stopBrowsing()
    }
  }

  private func normalizeCode(_ value: String) -> String {
    value.uppercased().filter { $0.isLetter || $0.isNumber }
  }

  private func table(from endpoint: NWEndpoint) -> [String: String]? {
    guard case let .service(name, _, _, _) = endpoint else { return nil }
    let upper = name.uppercased()
    let game: String
    let prefix: String
    if upper.hasPrefix("KWILT-BANK-") {
      game = "bank"
      prefix = "KWILT-BANK-"
    } else if upper.hasPrefix("KWILT-SLANGUAGE-") {
      game = "slanguage"
      prefix = "KWILT-SLANGUAGE-"
    } else {
      return nil
    }
    let code = normalizeCode(String(name.dropFirst(prefix.count)))
    guard code.count == 6 else { return nil }
    return ["code": code, "game": game]
  }

  private func stopAdvertising() {
    listener?.cancel()
    listener = nil
  }

  private func stopBrowsing() {
    browser?.cancel()
    browser = nil
    sendEvent("onTablesChanged", ["tables": []])
  }
}

private final class NearbyTableException: GenericException<String> {
  override var reason: String { param }
}
