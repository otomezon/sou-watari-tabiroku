層渡りの旅録 v4.6.1 — 静的ホスティング用パッケージ

このZIPは公開用に整形済みです。ZIPの中身を、そのままホスティングサービスの公開ディレクトリ（Document Root / Publish Directory）直下へ配置してください。

公開ディレクトリ直下に、次のファイル・フォルダが並ぶ状態が正解です。
  index.html
  assets/
  audio/
  icons/
  manifest.webmanifest
  sw.js

重要:
- ZIP全体を別の親フォルダごと公開しないでください。
- v4.6.0プロジェクトZIP内の IMPLEMENTATION/index.html は開発用であり、公開しないでください。
- このZIPにはコンパイル済みJavaScriptとCSSが含まれています。追加のビルドコマンドは不要です。
- GitHub PagesなどサブディレクトリURL配下の公開にも対応し、Service WorkerのキャッシュURLも登録スコープに合わせて解決します。
- PWAインストールとService WorkerにはHTTPSが必要です（localhostを除く）。

更新後に以前の画面が残る場合:
1. 公開ページを強制再読み込みしてください。
2. 旧版のService Workerが残る場合は、ブラウザーのサイトデータ／キャッシュを消して再読み込みしてください。
3. ホーム画面に旧PWAを追加済みの場合は、旧アイコンからではなくブラウザーで公開URLを開き直してください。

ソース一式は別途 project-v4.6.1 ZIP に含まれます。
