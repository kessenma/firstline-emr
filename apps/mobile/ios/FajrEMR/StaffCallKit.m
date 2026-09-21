//
//  StaffCallKit.m
//  FajrEMR
//
//  Objective-C bridge for StaffCallKit (Swift → React Native).
//  See StaffCallKit.swift for why the PushKit/CallKit path itself never
//  crosses this bridge.
//

#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(StaffCallKit, RCTEventEmitter)

RCT_EXTERN_METHOD(getVoipToken:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endCall:(NSString *)callId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reportConnected:(NSString *)callId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
