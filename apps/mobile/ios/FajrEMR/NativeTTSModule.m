// NativeTTSModule.m
// Fallback TTS using iOS AVSpeechSynthesizer when Kokoro model is not downloaded.

#import "NativeTTSModule.h"
#import <AVFoundation/AVFoundation.h>

@interface NativeTTSModule () <AVSpeechSynthesizerDelegate>
@property (nonatomic, strong) AVSpeechSynthesizer *synthesizer;
@property (nonatomic, copy) RCTPromiseResolveBlock speakResolve;
@property (nonatomic, copy) RCTPromiseRejectBlock speakReject;
@end

@implementation NativeTTSModule

RCT_EXPORT_MODULE();

- (instancetype)init {
  self = [super init];
  if (self) {
    _synthesizer = [[AVSpeechSynthesizer alloc] init];
    _synthesizer.delegate = self;
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

RCT_EXPORT_METHOD(speak:(NSString *)text
                  rate:(double)rate
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  // Stop any current speech first
  if (self.synthesizer.isSpeaking) {
    [self.synthesizer stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
  }

  self.speakResolve = resolve;
  self.speakReject = reject;

  AVSpeechUtterance *utterance = [[AVSpeechUtterance alloc] initWithString:text];
  utterance.rate = (float)rate;
  utterance.voice = [AVSpeechSynthesisVoice voiceWithLanguage:@"en-US"];

  [self.synthesizer speakUtterance:utterance];
}

RCT_EXPORT_METHOD(stop)
{
  if (self.synthesizer.isSpeaking) {
    [self.synthesizer stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
  }
  // If there's a pending promise, resolve it
  if (self.speakResolve) {
    self.speakResolve(nil);
    self.speakResolve = nil;
    self.speakReject = nil;
  }
}

#pragma mark - AVSpeechSynthesizerDelegate

- (void)speechSynthesizer:(AVSpeechSynthesizer *)synthesizer didFinishSpeechUtterance:(AVSpeechUtterance *)utterance {
  if (self.speakResolve) {
    self.speakResolve(nil);
    self.speakResolve = nil;
    self.speakReject = nil;
  }
}

- (void)speechSynthesizer:(AVSpeechSynthesizer *)synthesizer didCancelSpeechUtterance:(AVSpeechUtterance *)utterance {
  if (self.speakResolve) {
    self.speakResolve(nil);
    self.speakResolve = nil;
    self.speakReject = nil;
  }
}

@end
