// apps/mobile/src/components/patient-chart/video-call/VideoCallSheet.tsx
//
// The live call surface, in its OWN BottomSheet instance.
//
// Why a dedicated sheet rather than reusing the dashboard's shared
// `activeSection` sheet: that sheet swaps its contents when another section is
// opened, which would unmount the call. Two sibling sheets are fine — the
// warning in patient-chart/CLAUDE.md is about *nested* BottomSheetModals.
//
// Minimizing (snap index 0) leaves the sheet mounted with no backdrop, so the
// chart behind stays scrollable and tappable while the call runs. The header
// keeps rendering at every snap point, which is where the live thumbnail goes.

import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { BottomSheet, type BottomSheetHandle } from '../../BottomSheet';
import {
  useVideoCallSession,
  VideoCallSessionBridge,
} from './VideoCallSessionProvider';
import { CallStage } from './components/CallStage';
import { CallControls } from './components/CallControls';
import { CallPillThumb } from './components/CallPillThumb';
import { spacing } from '../../../utils/theme';

export const VideoCallSheet: React.FC = () => {
  const session = useVideoCallSession();
  const sheetRef = useRef<BottomSheetHandle>(null);

  const {
    connectionState,
    patientName,
    endCall,
    setMinimized,
    isMinimized,
    setSheetPresented,
    reopenRequestId,
    requestReopen,
  } = session;

  const visible =
    connectionState === 'connecting' ||
    connectionState === 'connected' ||
    connectionState === 'reconnecting';

  // Identity of the call currently being shown, NOT whether one exists.
  const callId = session.activeCall?.sessionId ?? null;

  // Always-current mirror of `visible`, for callbacks the sheet library may
  // invoke from a stale closure. See handleClose.
  const liveRef = useRef(visible);
  liveRef.current = visible;

  // Open at the normal snap point as soon as a call starts.
  //
  // Keyed on callId rather than `visible`, because `visible` is a boolean that
  // only fires this effect on its false→true edge. If the provider ever holds a
  // visible connectionState across the end of one call and the start of the
  // next — which is exactly what was observed on device, where the first render
  // of a brand new call already had a non-null sheetRef — that edge never
  // arrives and the sheet silently never presents again for the rest of the
  // session. A session id changes on every call, so this cannot miss.
  //
  // present() and snapToIndex() must also not be issued in the same tick: the
  // modal is not laid out until present() has run, so the snap is swallowed and
  // the sheet settles wherever present() left it.
  useEffect(() => {
    if (!visible || !callId) return;
    sheetRef.current?.present();
    const frame = requestAnimationFrame(() => {
      sheetRef.current?.snapToIndex(2);
    });
    return () => cancelAnimationFrame(frame);
  }, [visible, callId]);

  // Re-present when the Video section asks for the call back.
  //
  // This is the user's escape hatch when the sheet is gone but the call is
  // live, so it must work from ANY state — including one where the sheet was
  // dismissed without onDismiss firing, leaving the library thinking it is
  // still presented. present() and snapToIndex() are both no-ops in that case,
  // which is why minimized is force-reset here: a stale isMinimized renders the
  // sheet with an empty body (rawContent passes `false` straight through), so
  // re-presenting alone would put back a header and nothing else.
  useEffect(() => {
    if (reopenRequestId === 0 || !visible) return;
    setMinimized(false);
    sheetRef.current?.present();
    const frame = requestAnimationFrame(() => {
      sheetRef.current?.snapToIndex(2);
    });
    return () => cancelAnimationFrame(frame);
  }, [reopenRequestId, visible, setMinimized]);

  const handleIndexChange = useCallback(
    (index: number) => {
      setMinimized(index === 0);
      // sheetPresented is derived from what the sheet actually did, never from
      // what we asked it to do. Setting it optimistically alongside present()
      // is how it gets stuck true with nothing on screen: the Video section
      // then shows "Minimize the call to keep browsing" and offers no way back.
      //
      // -1 means swiped away — the call is still live, so the Video section
      // needs to offer a way back in.
      setSheetPresented(index >= 0);
    },
    [setMinimized, setSheetPresented],
  );

  const handleClose = useCallback(() => {
    setSheetPresented(false);
    // Ending a call already prompts in CallControls, then awaits
    // room.disconnect(), which drives visible → false and makes BottomSheet
    // dismiss — firing onClose and a SECOND "End call?" for a call that has
    // already ended.
    //
    // Read through a ref, not the captured `visible`: gorhom can invoke a
    // stale onDismiss closure, so a value captured at useCallback time is not
    // trustworthy here. A ref is always current.
    if (!liveRef.current) return;
    Alert.alert('End call?', `This will end the video call with ${patientName}.`, [
      // Declining must put the sheet back. Without this the call keeps running
      // with no controls anywhere and no way to hang up.
      { text: 'Keep talking', style: 'cancel', onPress: requestReopen },
      { text: 'End call', style: 'destructive', onPress: () => void endCall() },
    ]);
  }, [endCall, patientName, requestReopen, setSheetPresented]);

  // NOTE: deliberately no `if (!visible) return null` here.
  //
  // Every sheet in the app that works (NoteCreationSheet, SendPatientSheet,
  // CareTeamSheet) stays mounted and toggles `visible`. Mounting already-
  // visible issues present() in the same commit as BottomSheetModal's own
  // mount, which is a documented footgun — see the `visible` prop docs in
  // BottomSheet.tsx. BottomSheet renders nothing until presented, so staying
  // mounted costs nothing.
  //
  // (For the record: this was NOT what kept this sheet from opening. That was
  // gorhom v5's enableDynamicSizing defaulting to true — the content below
  // starts with a Context.Provider wrapping a flex:1 View, which measures 0,
  // so there was no layout to present into. Fixed in BottomSheet.tsx.)
  return (
    <BottomSheet
      ref={sheetRef}
      visible={visible}
      onClose={handleClose}
      title={patientName}
      snapPoint={90}
      // Open full-screen (index 2). At 90% the call controls sat below the fold
      // and the clinician had to drag the sheet up before they could mute or
      // hang up. The header chevron still minimizes to the pill for browsing
      // the chart mid-call, so nothing is lost.
      startExpanded
      showHandle
      showCloseButton
      rawContent
      titleAccessory={
        // Rendered by BottomSheet inside its Portal, which detaches the React
        // context tree — bridge the session across so the thumb can read it.
        <VideoCallSessionBridge value={session}>
          <CallPillThumb />
        </VideoCallSessionBridge>
      }
      onIndexChange={handleIndexChange}
    >
      <VideoCallSessionBridge value={session}>
        {/* Tearing the stage down while minimized means only one video surface
            is ever bound to the remote track — the header thumbnail. */}
        {!isMinimized && (
          <View style={styles.content}>
            <CallStage />
            <CallControls />
          </View>
        )}
      </VideoCallSessionBridge>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.sm,
  },
});

export default VideoCallSheet;
