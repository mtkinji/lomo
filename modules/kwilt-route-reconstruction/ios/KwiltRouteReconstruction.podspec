Pod::Spec.new do |s|
  s.name           = 'KwiltRouteReconstruction'
  s.version        = '0.1.0'
  s.summary        = 'Bounded Apple Maps reconstruction for recorded Explore paths'
  s.description    = s.summary
  s.license        = { :type => 'MIT' }
  s.author         = { 'Kwilt' => 'support@kwilt.app' }
  s.homepage       = 'https://kwilt.app'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :path => '.' }
  s.static_framework = true
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.frameworks     = 'MapKit'
  s.dependency 'ExpoModulesCore'
end
