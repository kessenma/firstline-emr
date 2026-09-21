// apps/mobile/src/components/patient-chart/video-call/index.ts

// Main components
export { VideoCallContainer } from './VideoCallContainer';
export { VideoCallView } from './VideoCallView';
export { VideoCallSheet } from './VideoCallSheet';

// Session ownership — the Room lives above every sheet so minimizing the call
// (or opening another section) cannot tear it down.
export {
  VideoCallSessionProvider,
  VideoCallSessionBridge,
  useVideoCallSession,
} from './VideoCallSessionProvider';

// Sub-components
export { CallStage } from './components/CallStage';
export { CallControls } from './components/CallControls';
export { CallPillThumb } from './components/CallPillThumb';
export { InviteLinkCard } from './components/InviteLinkCard';
export { SendInviteModal } from './components/SendInviteModal';
export { CallHistoryList } from './components/CallHistoryList';

// Hooks
export { useVideoCallViewModel } from './hooks/useVideoCallViewModel';
export { useCallPermissions } from './hooks/useCallPermissions';
export { useCallTracks } from './hooks/useCallTracks';

// Types
export type {
  VideoCallViewModel,
  InviteSendState,
} from './hooks/useVideoCallViewModel';
export type { CallPermissionState } from './hooks/useCallPermissions';
