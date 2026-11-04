---
name: viberemote-connect
description: VibeRemoteと接続して、VibeRemoteに接続、接続を復旧して、という依頼でPCの状態ブリッジ・Codexセッション監視・実機中継を起動または復旧する。現在のProductはGarVibeRemote-M5StickS3、BLE接続。通常の再接続でファームウェアを書き直さない。
---

# VibeRemote connection

Treat 「VibeRemoteと接続して」 as a request to restore the existing physical-device connection, including starting missing PC services. It is not a request to launch the simulator.

Resolve this skill's real path through its junction; the Product root is two directories above this SKILL.md's containing directory. Read the Product's AGENTS.md and docs/INSTALL.md. Use its scripts/setup_remote.py, not the Plus2 SPP setup.

1. Run `python scripts/setup_remote.py doctor`. Inspect existing listeners and process ownership before starting anything; reuse healthy services and avoid duplicate monitors or port conflicts.
2. Reuse `artifacts/connection/local.json` without displaying tokens. If absent, configure it with the current Codex chat ID and project; preserve a previously authorized monitoring scope. Do not silently expand scope or overwrite another Product's settings.
3. Run `python scripts/setup_remote.py ble-scan` to identify the intended M5StickS3. Do not assume its address or USB COM number. Reuse existing pairing; request matching-number confirmation only when pairing actually requires it.
4. Start missing services from the Product root:
   - `python scripts/setup_remote.py bridge`
   - `python scripts/setup_remote.py sessions` for configured multi-session scope, or `questions` for single-chat question integration.
   - `python scripts/setup_remote.py device --transport ble --port <discovered-address>`
   The session/question service must inherit the current Codex App environment, including CODEX_APP_TOOLS_PIPE_PATH. Do not claim an ordinary terminal or Windows startup task supplies that environment. Refresh a monitor using an obsolete App environment when necessary.
5. On Windows, background services use Start-Process with WindowStyle Hidden and separate stdout/stderr logs under ignored artifacts/connection/logs. Record process IDs; stop only the relevant owned service tree when recovery requires it.
6. Verify bridge reachability, collector readiness and the BLE relay's `device-ready` event. Connection/pairing alone does not prove state delivery. If available, read a device snapshot without claiming a USB transport lease, and confirm activeTransport is bluetooth-ble and the expected sessions reached it. Report any unverified display or reply behavior explicitly.

Keep this a reconnect operation: no firmware flashing, hook replacement, global startup installation or test answers on behalf of the user unless separately requested. BLE requires no USB data connection once installed. Product diagnosis/repair beyond reconnect follows embedded-development's GAR workflow.
