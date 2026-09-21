/**
 * @format
 */

import 'react-native-get-random-values';
// Hermes ships no TextEncoder/TextDecoder, and livekit-client constructs both
// unguarded at module scope (9 and 4 sites respectively as of 2.21.0). Without
// this the very next import throws "Property 'TextDecoder' doesn't exist" and
// the app never boots. Must precede the @livekit/react-native import below.
import 'fast-text-encoding';
import 'react-native-gesture-handler';
import { registerGlobals as registerLiveKitGlobals } from '@livekit/react-native';
import { AppRegistry } from 'react-native';
import App from './App';

// Installs the WebRTC globals (RTCPeerConnection, mediaDevices, MediaStream…)
// that livekit-client expects to find on `window`. Must run before any call
// code loads, hence here rather than in the video-call feature.
registerLiveKitGlobals();

// Enable console.log capture for MCP debugging (only in dev)
if (__DEV__) {
  try {
    const { enableConsoleCapture } = require('./mcp-client');
    enableConsoleCapture();
  } catch (e) {
    // MCP client not available, skip
  }
}

AppRegistry.registerComponent('FajrEMR', () => App);
