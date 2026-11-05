# 層渡りの旅録 v4.8.3

敵の実際の能力値に連動したレベル表示を追加したパッチリリースです。

- 敵スプライト左下に `Lv数字` を表示
- 算出式：`max(1, round((最大HP + 攻撃力×6 + 防御力×4) / 36))`
- 通常敵・鈍足／倍速の希少個体・ボス・敵対した店主に対応
- 既存の鈍足／倍速マーカーとHPバーを維持
- 表示専用のため、戦闘バランスとセーブスキーマv11は変更なし

## Hosting

Cloudflare PagesはGitHub連携でmainブランチへの更新を自動デプロイします。公開ルートはリポジトリ直下のindex.html、assets/、audio/、icons/、sw.js、manifest.webmanifestです。

## 検証

- v4.8.3敵レベル単体・描画回帰テスト：10/10 PASS
- JavaScriptモジュール構文チェック：PASS
- iOS/Android実機QA・人手プレイテスト：未実施
