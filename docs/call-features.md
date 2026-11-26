# Call feature checklist

## Starting and receiving
- Start a voice call from a conversation.
- Start a video call from a conversation.
- Show an incoming-call screen with caller name, photo, and listing context.
- Accept an incoming call.
- Decline an incoming call.
- Show a ringing state for the caller.
- Time out unanswered calls and mark them missed.
- Show busy/unavailable when the other person is already on a call.
- Ring and vibrate for incoming calls.
- Respect silent mode and Do Not Disturb.

## During a call
- Mute and unmute the microphone.
- Switch between speaker and earpiece.
- Turn the camera on and off.
- Switch between front and back camera.
- Show a local self-preview during video calls.
- Show the remote video full screen.
- Show a call duration timer.
- End the call from either side.
- Handle network drops and reconnect automatically.
- Keep audio routing correct for Bluetooth and wired headsets.
- Show a clear error if microphone or camera permission is denied.
- Request microphone and camera permission with a short explanation.
- Support low-bandwidth mode by dropping video and keeping audio.
- Switch an audio call to video and a video call to audio.

## After a call
- Save call history in the conversation.
- Show outgoing, incoming, missed, declined, and ended states.
- Show call duration in history.
- Show a missed-call badge or notification.
- Let the user call back from history.

## Reliability and privacy
- Use a TURN server for users behind strict NAT or mobile networks.
- Encrypt media with WebRTC DTLS-SRTP.
- Do not expose either party's IP address in the UI.
- Handle app backgrounding and lock-screen behavior.
- Clean up camera and microphone tracks when the call ends.
- Add accessibility labels for every call control.
- Test on slow networks and with permission denial.
