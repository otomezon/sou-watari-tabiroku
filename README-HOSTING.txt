層渡りの旅録 v4.7.0 — 静的ホスティング用

このフォルダ内のファイルとフォルダを、ホスティングサービスの公開ディレクトリ直下へすべて配置してください。
index.html が公開ディレクトリ直下に来る構成です。プロジェクトZIP全体やIMPLEMENTATIONフォルダをそのまま公開しないでください。

必要な主なファイル: index.html / assets/ / audio/ / icons/ / manifest.webmanifest / sw.js

HTTPSで公開するとPWAインストール、Service Worker、オフラインキャッシュが利用できます。
GitHub Pagesなどのサブディレクトリ配下でもService Workerの登録スコープを基準にURLを解決します。
更新後に古い表示が残る場合は、Service Workerとサイトデータのキャッシュを更新してから再読み込みしてください。

セーブスキーマ: v11（今回のバランス調整では変更なし）
