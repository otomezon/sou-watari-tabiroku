# 層渡りの旅録 v4.8.2

スマートフォン向け8方向操作パッドの操作性を改善したパッチリリースです。

- 中央ボタンを「待機／1ターン」と明示
- 待機ボタンをゴールドアクセントで識別しやすく変更
- 方向ボタンの間隔を全画面幅で8pxに統一
- 押下時の沈み込み・明度変化と、フォーカス表示を追加
- 1タップ1行動を維持（長押し連続移動なし）
- ゲームバランスとセーブスキーマv11は変更なし

## 起動

GitHub PagesなどのHTTPS静的ホスティングで公開してください。index.html、assets/、audio/、icons/、sw.js、manifest.webmanifestを同じ公開ルートに配置します。

## 検証

- Node回帰テスト：119/119 PASS
- 操作パッド静的確認：13/13 PASS
- PWA静的確認：26/26 PASS
- ローカルHTTPアセット確認：26/26 PASS
- ブラウザー用TypeScriptコンパイル／プレビュー生成：PASS
- Vite本番ビルド：環境の@types/node不足（TS2688）により未完了
- iOS/Android実機QA：未実施

GitHub Pages用workflowは .github/workflows/deploy-pages.yml にあります。リポジトリの Settings → Pages で Source を GitHub Actions に設定してください。
