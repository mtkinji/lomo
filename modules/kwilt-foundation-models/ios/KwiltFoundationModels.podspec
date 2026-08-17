Pod::Spec.new do |s|
  s.name           = 'KwiltFoundationModels'
  s.version        = '0.1.0'
  s.summary        = 'Bounded Apple Foundation Models generation for Kwilt'
  s.description    = 'Exposes availability, serialized generation, and cancellation for local-first Chat tasks.'
  s.license        = { :type => 'MIT' }
  s.author         = { 'Kwilt' => 'support@kwilt.app' }
  s.homepage       = 'https://kwilt.app'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :path => '.' }
  s.static_framework = true
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
  s.weak_frameworks = 'FoundationModels'
end
