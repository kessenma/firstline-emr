// NativeTTSModule.h
// Fallback TTS using iOS AVSpeechSynthesizer when Kokoro model is not downloaded.

#import <React/RCTBridgeModule.h>

@interface NativeTTSModule : NSObject <RCTBridgeModule>
@end
