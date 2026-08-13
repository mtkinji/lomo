Pod::Spec.new do |s|
  s.name           = 'KwiltSeamlessLoop'
  s.version        = '0.1.0'
  s.summary        = 'Sample-timeline Focus soundscape looping for Kwilt'
  s.description    = 'Decodes one local soundscape to PCM and keeps native audio segments queued across loop boundaries.'
  s.license        = { :type => 'MIT' }
  s.author         = { 'Kwilt' => 'support@kwilt.app' }
  s.homepage       = 'https://kwilt.app'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :path => '.' }
  s.static_framework = true
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFAudio'
end
