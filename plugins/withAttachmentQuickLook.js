const { withBuildSourceFile } = require('@expo/config-plugins/build/ios/XcodeProjectFile');

const ATTACHMENT_PREVIEW_SWIFT = `import Foundation
import QuickLook
import React
import UIKit

@objc(KwiltAttachmentPreview)
class KwiltAttachmentPreview: NSObject, QLPreviewControllerDataSource, QLPreviewControllerDelegate {
  private var previewURL: URL?

  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc(previewRemoteURL:fileName:resolver:rejecter:)
  func previewRemoteURL(
    _ remoteURLString: String,
    fileName: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let remoteURL = URL(string: remoteURLString) else {
      reject("E_BAD_URL", "Attachment preview URL is invalid", nil)
      return
    }

    URLSession.shared.downloadTask(with: remoteURL) { [weak self] temporaryURL, response, error in
      guard let self else { return }
      if let error {
        reject("E_DOWNLOAD_FAILED", "Unable to download attachment for preview", error)
        return
      }
      if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
        reject("E_DOWNLOAD_FAILED", "Attachment download returned HTTP \\(http.statusCode)", nil)
        return
      }
      guard let temporaryURL else {
        reject("E_DOWNLOAD_FAILED", "Attachment download did not create a file", nil)
        return
      }

      let safeName = Self.safeFileName(fileName)
      let destination = FileManager.default.temporaryDirectory
        .appendingPathComponent("kwilt-attachment-\\(UUID().uuidString)", isDirectory: true)
        .appendingPathComponent(safeName, isDirectory: false)

      do {
        try FileManager.default.createDirectory(
          at: destination.deletingLastPathComponent(),
          withIntermediateDirectories: true
        )
        try FileManager.default.moveItem(at: temporaryURL, to: destination)
      } catch {
        reject("E_PREVIEW_FILE_FAILED", "Unable to prepare attachment for preview", error)
        return
      }

      DispatchQueue.main.async {
        guard let presenter = Self.topViewController() else {
          reject("E_NO_PRESENTER", "Unable to present attachment preview", nil)
          return
        }

        self.previewURL = destination
        let controller = QLPreviewController()
        controller.dataSource = self
        controller.delegate = self
        presenter.present(controller, animated: true) {
          resolve(true)
        }
      }
    }.resume()
  }

  func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
    return previewURL == nil ? 0 : 1
  }

  func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
    return (previewURL ?? URL(fileURLWithPath: "")) as NSURL
  }

  func previewControllerDidDismiss(_ controller: QLPreviewController) {
    guard let previewURL else { return }
    self.previewURL = nil
    try? FileManager.default.removeItem(at: previewURL.deletingLastPathComponent())
  }

  private static func safeFileName(_ raw: String) -> String {
    let candidate = URL(fileURLWithPath: raw).lastPathComponent
    if candidate.isEmpty || candidate == "." || candidate == ".." {
      return "Attachment"
    }
    return candidate
  }

  private static func topViewController() -> UIViewController? {
    let window = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }
    var current = window?.rootViewController

    while true {
      if let presented = current?.presentedViewController {
        current = presented
      } else if let navigation = current as? UINavigationController {
        current = navigation.visibleViewController
      } else if let tabs = current as? UITabBarController {
        current = tabs.selectedViewController
      } else {
        return current
      }
    }
  }
}
`;

const ATTACHMENT_PREVIEW_EXTERN = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(KwiltAttachmentPreview, NSObject)

RCT_EXTERN_METHOD(
  previewRemoteURL:(NSString *)remoteURL
  fileName:(NSString *)fileName
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
`;

module.exports = function withAttachmentQuickLook(config) {
  config = withBuildSourceFile(config, {
    filePath: 'KwiltAttachmentPreview.swift',
    contents: ATTACHMENT_PREVIEW_SWIFT,
    overwrite: true,
  });
  config = withBuildSourceFile(config, {
    filePath: 'KwiltAttachmentPreview.m',
    contents: ATTACHMENT_PREVIEW_EXTERN,
    overwrite: true,
  });
  return config;
};
