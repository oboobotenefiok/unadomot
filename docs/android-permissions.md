# Android permissions

UnaDomot needs these runtime and manifest permissions:

- Internet and network state for API calls.
- Camera for video calls, listing photos, and verification documents.
- Microphone for voice notes and voice/video calls.
- Location for map centering and nearby listings.
- Photos and videos for listing uploads and chat attachments.
- Storage for PDF, DOC, and DOCX attachments on older Android versions.
- Notifications for messages, incoming calls, and missed calls.
- Vibrate for incoming call alerts.
- Bluetooth connect for headset audio routing.
- Wake lock and foreground services so calls survive screen lock.

The CI workflow runs `scripts/apply_android_permissions.sh` after Flutter creates the Android project. Run the same script locally after `flutter create` if you build in Termux.
