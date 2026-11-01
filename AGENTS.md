# VibeRemote StickS3 Product

Read README.md, docs/STATUS.md and product.json first. This Product is StickS3 K150 only.
Follow sources/gar-tools/AGENTS.md and its Web simulator design principles before panel work.
Inventory shared components. The device shell belongs in gar-tools, never reach into its Shadow DOM.
Keep the common C++ DeviceApplication and CompactUi shared with Plus2, not a JS reimplementation.
ButtonMapping.h is the same two-key policy for firmware and PC. A confirms, short B cycles,
long B opens/closes the list. Physical reset is not an application button. No C shortcuts.
Board pin facts and drivers belong to board-m5sticks3, not this Product.
BLE uses a distinct transport and reusable GATT byte adapters. Keep physical verification separate from PC tests. Do not relabel SPP as BLE. No Wi-Fi, LAN device listeners, hooks changes,
real relay restart or firmware writes during scaffold/panel work. Synthetic answers are not approvals.
Preserve original session/question/choice IDs and ACK semantics in any later BLE adapter.
Commit/push shared changes first, pin the commits here. Never commit generated WASM, tokens,
settings, absolute machine paths, firmware dumps, dependency caches or user data.
