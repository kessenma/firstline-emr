//
//  CTranslate2Bridge.mm
//  FajrEMR
//
//  Objective-C++ native module bridging CTranslate2 + SentencePiece to React Native.
//  Provides on-device translation using int8 quantized MarianMT models.
//

#import <React/RCTBridgeModule.h>

#include <string>
#include <vector>
#include <map>
#include <mutex>
#include <memory>
#include <fstream>
#include <stdexcept>
#include <ctranslate2/translator.h>
#include <sentencepiece/sentencepiece_processor.h>
#include <nlohmann/json.hpp>

@interface CTranslate2Bridge : NSObject <RCTBridgeModule>
@end

@implementation CTranslate2Bridge {
  std::map<std::string, std::unique_ptr<ctranslate2::Translator>> _translators;
  std::map<std::string, std::unique_ptr<sentencepiece::SentencePieceProcessor>> _sourceProcessors;
  std::map<std::string, std::unique_ptr<sentencepiece::SentencePieceProcessor>> _targetProcessors;
  std::map<std::string, std::string> _targetLangTags; // e.g. "en-ar" -> ">>ara<<"
  std::mutex _mutex;
}

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

RCT_EXPORT_METHOD(loadModel:(NSString *)modelPath
                  direction:(NSString *)direction
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  NSString *capturedPath = [modelPath copy];
  NSString *capturedDirection = [direction copy];

  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    std::lock_guard<std::mutex> lock(self->_mutex);
    std::string dir = [capturedDirection UTF8String];
    std::string path = [capturedPath UTF8String];

    // Already loaded
    if (self->_translators.count(dir)) {
      resolve(@YES);
      return;
    }

    try {
      // Load SentencePiece tokenizers
      auto sourceSP = std::make_unique<sentencepiece::SentencePieceProcessor>();
      auto targetSP = std::make_unique<sentencepiece::SentencePieceProcessor>();

      auto sourceStatus = sourceSP->Load(path + "/source.spm");
      if (!sourceStatus.ok()) {
        reject(@"SP_ERROR",
               [NSString stringWithUTF8String:("source.spm: " + sourceStatus.ToString()).c_str()],
               nil);
        return;
      }

      auto targetStatus = targetSP->Load(path + "/target.spm");
      if (!targetStatus.ok()) {
        reject(@"SP_ERROR",
               [NSString stringWithUTF8String:("target.spm: " + targetStatus.ToString()).c_str()],
               nil);
        return;
      }

      // Load CTranslate2 translator
      auto translator = std::make_unique<ctranslate2::Translator>(
        path,
        ctranslate2::Device::CPU,
        ctranslate2::ComputeType::AUTO
      );

      NSLog(@"[CTranslate2] SP vocab sizes — source: %d, target: %d",
            sourceSP->GetPieceSize(), targetSP->GetPieceSize());

      // Read tokenizer_config.json to detect target language tag (Opus-MT multi-target models)
      std::string langTag;
      std::string tokConfigPath = path + "/tokenizer_config.json";
      std::ifstream tokFile(tokConfigPath);
      if (tokFile.is_open()) {
        auto cfg = nlohmann::json::parse(tokFile, nullptr, false);
        if (!cfg.is_discarded() && cfg.contains("target_lang")) {
          std::string targetLang = cfg["target_lang"].get<std::string>();
          // Check if the vocabulary contains the language tag
          std::string candidateTag = ">>" + targetLang + "<<";
          // Read shared_vocabulary.json to verify the tag exists
          std::ifstream vocabFile(path + "/shared_vocabulary.json");
          if (vocabFile.is_open()) {
            auto vocab = nlohmann::json::parse(vocabFile, nullptr, false);
            if (vocab.is_array()) {
              for (const auto &tok : vocab) {
                if (tok.get<std::string>() == candidateTag) {
                  langTag = candidateTag;
                  break;
                }
              }
            }
          }
        }
      }

      if (!langTag.empty()) {
        self->_targetLangTags[dir] = langTag;
        NSLog(@"[CTranslate2] Using language tag: %s for %@",
              langTag.c_str(), capturedDirection);
      }

      self->_translators[dir] = std::move(translator);
      self->_sourceProcessors[dir] = std::move(sourceSP);
      self->_targetProcessors[dir] = std::move(targetSP);

      NSLog(@"[CTranslate2] Loaded model for %@ from %s", capturedDirection, path.c_str());
      resolve(@YES);
    } catch (const std::exception &e) {
      reject(@"LOAD_ERROR",
             [NSString stringWithUTF8String:e.what()],
             nil);
    }
  });
}

RCT_EXPORT_METHOD(unloadModel:(NSString *)direction
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  std::lock_guard<std::mutex> lock(_mutex);
  std::string dir = [direction UTF8String];

  _translators.erase(dir);
  _sourceProcessors.erase(dir);
  _targetProcessors.erase(dir);
  _targetLangTags.erase(dir);

  NSLog(@"[CTranslate2] Unloaded model for %@", direction);
  resolve(@YES);
}

RCT_EXPORT_METHOD(translate:(NSString *)text
                  direction:(NSString *)direction
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  NSString *capturedText = [text copy];
  NSString *capturedDirection = [direction copy];

  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    std::lock_guard<std::mutex> lock(self->_mutex);
    std::string dir = [capturedDirection UTF8String];
    std::string inputText = [capturedText UTF8String];

    auto tIt = self->_translators.find(dir);
    auto sIt = self->_sourceProcessors.find(dir);
    auto dIt = self->_targetProcessors.find(dir);

    if (tIt == self->_translators.end() ||
        sIt == self->_sourceProcessors.end() ||
        dIt == self->_targetProcessors.end()) {
      reject(@"NOT_LOADED", @"Model not loaded for this direction", nil);
      return;
    }

    try {
      // Tokenize with source SentencePiece
      std::vector<std::string> tokens;
      sIt->second->Encode(inputText, &tokens);

      // Prepend target language tag if this model requires it (Opus-MT multi-target)
      auto tagIt = self->_targetLangTags.find(dir);
      if (tagIt != self->_targetLangTags.end()) {
        tokens.insert(tokens.begin(), tagIt->second);
      }

      // Log source tokens
      NSMutableString *tokenLog = [NSMutableString stringWithFormat:@"[CTranslate2] Input: \"%s\" -> %zu tokens: [", inputText.c_str(), tokens.size()];
      for (size_t i = 0; i < tokens.size(); i++) {
        if (i > 0) [tokenLog appendString:@", "];
        [tokenLog appendFormat:@"\"%s\"", tokens[i].c_str()];
      }
      [tokenLog appendString:@"]"];
      NSLog(@"%@", tokenLog);

      // Translate — constrain output length relative to input to prevent degeneration
      size_t inputLen = tokens.size();
      size_t maxLen = std::max((size_t)20, inputLen * 3);
      if (maxLen > 512) maxLen = 512;

      ctranslate2::TranslationOptions options;
      options.beam_size = 4;
      options.max_decoding_length = maxLen;
      options.repetition_penalty = 1.3;
      options.no_repeat_ngram_size = 3;

      std::vector<std::vector<std::string>> batch = {tokens};
      auto results = tIt->second->translate_batch(batch, options);

      if (results.empty() || results[0].hypotheses.empty()) {
        reject(@"TRANSLATE_ERROR", @"No translation result", nil);
        return;
      }

      // Log output tokens
      auto &hyp = results[0].hypotheses[0];
      NSMutableString *outLog = [NSMutableString stringWithFormat:@"[CTranslate2] Output %zu tokens: [", hyp.size()];
      for (size_t i = 0; i < hyp.size(); i++) {
        if (i > 0) [outLog appendString:@", "];
        [outLog appendFormat:@"\"%s\"", hyp[i].c_str()];
      }
      [outLog appendString:@"]"];
      NSLog(@"%@", outLog);

      // Detokenize with target SentencePiece
      std::string outputText;
      dIt->second->Decode(hyp, &outputText);

      NSLog(@"[CTranslate2] Decoded output: \"%s\"", outputText.c_str());

      resolve([NSString stringWithUTF8String:outputText.c_str()]);
    } catch (const std::exception &e) {
      reject(@"TRANSLATE_ERROR",
             [NSString stringWithUTF8String:e.what()],
             nil);
    }
  });
}

RCT_EXPORT_METHOD(isModelLoaded:(NSString *)direction
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  std::string dir = [direction UTF8String];
  BOOL loaded = _translators.count(dir) > 0;
  resolve(@(loaded));
}

@end
