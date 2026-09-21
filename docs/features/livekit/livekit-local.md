> **📋 File Migration Info**
> - **Original Location:** `apps/docs/livekit/livekit-local.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

Running LiveKit locally
This will get a LiveKit instance up and running, ready to receive audio and video streams from participants.

Copy page
See more page options
Install LiveKit Server
MACOSLINUXWINDOWS
brew update && brew install livekit

curl -sSL https://get.livekit.io | bash


Download the latest release here.

Start the server in dev mode 
You can start LiveKit in development mode by running:
livekit-server --dev

This will start an instance using the following API key/secret pair:
API key: devkey
API secret: secret

To customize your setup for production, refer to our deployment guides.
Tip
By default LiveKit's signal server binds to 127.0.0.1:7880. If you'd like to access it from other devices on your network, pass in --bind 0.0.0.0
On this page

Install LiveKit Server
Start the server in dev mode
Was this page helpful?