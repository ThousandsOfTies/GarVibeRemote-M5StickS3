# BLE adapter contract (implemented, physical verification pending)

The Product selects a reusable UART-like GATT component. GATT byte handling
must not know Codex sessions or answer semantics. The shared application receives
the same UTF-8 JSON Lines as the existing USB transport.

- Profile: Nordic UART Service, RX Write / TX Notify. UUID selection is Product configuration.
- Split writes/notifications by negotiated payload size, serialize writes, bound queues.
- Reassemble bytes before decoding UTF-8/JSON; preserve the 64KiB JSONL limit.
- On disconnect discard partial input and release ownership; reconnect by subscribing,
  hello, then a fresh session snapshot. Never replay an uncertain answer automatically.
- Keep sessionId/uiId/actionId and application ACK. GATT write success is not an application ACK.
- Use authenticated bonding/pairing suited to the two-button device; do not add a fixed PIN.
- Windows uses a GATT client, not a virtual SPP COM port. No company LAN connection is required.

The reusable adapters live in sources/gar-tools/transports/ble-uart. Product profile.json is the UUID source; firmware headers are generated from it. Physical verification is pending.
