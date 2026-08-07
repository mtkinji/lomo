Pod::Spec.new do |s|
  s.name           = 'KwiltCookVoiceProcessing'
  s.version        = '0.1.0'
  s.summary        = 'Foreground echo-cancelled voice monitoring for Kwilt Cook Mode'
  s.description    = 'Detects a nearby voice while Cook Mode speech is playing so playback can yield.'
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
