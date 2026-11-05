層渡りの旅録 v4.9.4 — 探索画面レイアウト再調整パッチ

v4.9.4 patch:
- 階数表示をコンパクトな横1行へ戻し、地下 N 階を必ず表示。
- TURN・GOLDを攻撃・防御の右側へステータス行内で集約。
- プレイ中の左右余白と探索枠の余白を削り、探索マップの表示幅を拡大。
- 移動ボタンは48px以上のタップ領域を維持。
- セーブスキーマv11を維持。セーブ移行不要。

v4.9.3 patch:
- タイトル画面の初級に付いていた「おすすめ」表示を削除。
- 最深部でも階数を省略せず、ダンジョン名側に最深部を併記。

起動方法:
1. ZIPを展開します。
2. 展開したフォルダで python3 -m http.server 8000 を実行します。
3. http://localhost:8000/ を開きます。

PWAインストール・Service Worker・オフライン起動には localhost または HTTPS が必要です。
ZIP内の index.html を file:// で直接開かず、HTTPサーバーで配信してください。
ホスティングではこのフォルダの中身を公開ディレクトリ直下へ配置してください。

主な内容:
- 5キャンペーン、60種類のモンスター、90種類のアイテム。
- 5種類のダンジョンBGM、ボスBGM、レベルアップ・ゲームオーバー音をローカル収録。
- ランダムなアイテム屋。商品ごとの操作は「拾う」「戻す」のみ。拾った商品はすべて自動的に購入対象となり、「まとめて購入」で一括精算。選択・解除操作はありません。
- 未払い商品は個別管理され、戻すと所持品・装備から対象だけを取り除き、商品棚へ戻して該当価格分の負債を取り消します。未払い商品の売却は禁止。
- 深層ほど強化値・基本性能が上がる装備、換金品、敵ドロップ・金貨経済。
- 縦画面専用UI、IndexedDBオートセーブ、セーブスキーマv11（v1〜v11互換）。

v4.7.3 patch:
- 「選択」「解除」「選択中を購入」を廃止。
- 拾った未払い商品すべてを購入対象に統一し、合計額で一括購入。
- 商品ごとの「戻す」は維持。戻した商品だけ負債を減額。
- セーブスキーマv11を維持し、v4.7.1/v4.7.2の既存セーブと互換。

v4.8.1 minor:
- 主人公とモンスターが8方向へ移動。斜め移動は1操作1ターン。
- 斜め移動では縦横両側の床を確認し、壁角をすり抜けない。
- 主人公・モンスター双方が斜め隣接から攻撃可能。敵の行動頻度・威力は据え置き。
- タッチパッドは3×3の8方向。中央は待機。セーブスキーマv11を維持。

検証:
- Nodeテスト 115/115
- レイアウトテスト 11/11
- v4.8.1専用斜め移動チェック 10/10
- ブラウザ用TypeScriptコンパイル PASS
- スタンドアロンプレビュー生成 PASS

未確認:
- Canonical Vite production build / iOS・Android実機QA / 人によるプレイテスト。
- GitHub Pagesの公開設定はリポジトリ側で有効化が必要。

推奨リポジトリ名: sou-watari-tabiroku（npm package: sou-watari-tabiroku-pwa）。


v4.8.1 hotfix: exported DIRECTION_DELTA from the dungeon module, fixing the ES module startup failure in the GitHub JavaScript assets. Service Worker cache namespace bumped to v4-8-1. Node tests 116/116 and module-linkage check pass; browser UI runtime testing and physical-device QA remain outstanding.
