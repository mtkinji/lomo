require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name             = 'KwiltShareSheet'
  s.version          = package['version']
  s.summary          = package['description']
  s.description      = package['description']
  s.license          = 'MIT'
  s.author           = 'Kwilt'
  s.homepage         = 'https://kwilt.app'
  s.platforms        = { :ios => '15.1' }
  s.swift_version    = '5.9'
  s.source           = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'UIKit'
  s.source_files = '**/*.swift'
end
