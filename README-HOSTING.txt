層渡りの旅録 v4.8.2 — 静的ホスティング用

このリポジトリのルートを公開ディレクトリとして配信します。
index.html、assets/、audio/、icons/、sw.js、manifest.webmanifest が同じ階層に並ぶ構成です。
HTTPSで配信するとPWAインストール・Service Worker・オフラインキャッシュを利用できます。

GitHub Pages用workflowは .github/workflows/deploy-pages.yml にあります。初回は Settings > Pages で Source を GitHub Actions に設定してください。

v4.8.2: 中央ボタンを「待機／1ターン」と明示。ボタン間隔を8pxに統一し、押下フィードバックとフォーカス表示を追加。ゲームバランスとセーブスキーマv11は維持。Service Workerキャッシュはsou-watari-tabiroku-v4-8-2。
