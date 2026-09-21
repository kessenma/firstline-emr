Pod::Spec.new do |s|
  s.name         = "CTranslate2"
  s.version      = "4.5.0"
  s.summary      = "CTranslate2 + SentencePiece for on-device translation"
  s.homepage     = "https://github.com/OpenNMT/CTranslate2"
  s.license      = { :type => "MIT" }
  s.author       = "Fajr EMR"
  s.platform     = :ios, "15.1"
  s.source       = { :path => "." }

  s.vendored_frameworks = "frameworks/libctranslate2.xcframework",
                          "frameworks/libsentencepiece.xcframework"

  s.preserve_paths = "include/**/*"

  s.frameworks = "Accelerate"
  s.libraries  = "c++"

  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => "$(PODS_TARGET_SRCROOT)/include",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "EXCLUDED_ARCHS[sdk=iphonesimulator*]" => "i386 x86_64",
  }

  s.user_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => "$(PODS_ROOT)/../CTranslate2/include",
    "EXCLUDED_ARCHS[sdk=iphonesimulator*]" => "i386 x86_64",
  }
end
