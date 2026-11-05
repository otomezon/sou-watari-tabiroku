# 層渡りの旅録 v4.7.3

Patch release: shop interaction simplified.

- Per-item actions are now only **拾う** and **戻す**.
- Every picked-up unpaid item is automatically a purchase target.
- **まとめて購入** settles all remaining picked-up items at once.
- Per-item **選択 / 解除 / 選択中を購入** controls have been removed.
- Returning an item still removes only that item from inventory/equipment, restores it to the shelf, and cancels only its price from the debt.
- Save schema remains v11; legacy selectedGoodId is retained for read compatibility but ignored by purchase logic.

Verification: Node 108/108, layout 10/10, shop 27/27, browser TypeScript compile and standalone preview pass.
