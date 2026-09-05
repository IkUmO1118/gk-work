# GK CRAFT — コーポレートサイト

HP制作会社「GK CRAFT」の静的コーポレートサイト。ビルド不要の HTML / CSS / JS。

```
.
├── public/                 ← Netlify が公開するディレクトリ
│   ├── index.html          トップページ
│   ├── contact.html        無料相談フォーム
│   ├── 404.html
│   ├── robots.txt / sitemap.xml
│   └── assets/
│       ├── css/style.css   デザインシステム "Modernist" のトークン＋レイアウト
│       ├── js/config.js    ★ GAS のエンドポイントを設定するファイル
│       ├── js/contact.js   フォーム送信処理
│       └── img/            写真・ファビコン
├── gas/
│   ├── Code.gs             Google Apps Script（スプレッドシート保存＋メール通知）
│   └── README.md           ★ GAS のセットアップ手順
└── netlify.toml            公開設定・セキュリティヘッダ・リダイレクト
```

## 公開までの手順

### 1. フォームの受け皿を用意する

`gas/README.md` の手順どおりに Google Apps Script をデプロイし、
ウェブアプリの URL（`https://script.google.com/macros/s/.../exec`）を控える。

### 2. エンドポイントを設定する

`public/assets/js/config.js` の `GAS_ENDPOINT` を、控えた URL に差し替える。
併せて `FALLBACK_EMAIL` を実在のアドレスにしておく（送信失敗時の案内に出る）。

### 3. Netlify にデプロイする

**ドラッグ&ドロップの場合**（最短）
Netlify の Sites 画面に `public/` フォルダをドロップする。
※この方法では `netlify.toml` が読まれないため、セキュリティヘッダとリダイレクトは効かない。

**Git 連携の場合**（推奨）

```bash
git init && git add -A && git commit -m "GK CRAFT corporate site"
# GitHub にプッシュしたあと、Netlify の "Import an existing project" から接続
```

Netlify 側の設定は `netlify.toml` が持っているので、画面での入力は不要
（Build command: 空 / Publish directory: `public`）。

**Netlify CLI の場合**

```bash
npx netlify-cli deploy --prod
```

### 4. 公開後にやること

- サイト名を `gk-craft` にして `https://gk-craft.netlify.app/` を確保する
  （別名にした場合は下記「ドメインを変えるとき」を参照）
- `public/contact.html` からテスト送信し、スプレッドシートへの記録と
  管理者宛て・申込者宛て両方のメールが届くことを確認する

## ローカルで確認する

```bash
cd public && python3 -m http.server 8000
# http://localhost:8000
```

フォーム送信まで試す場合は、GAS のウェブアプリを「全員」アクセスでデプロイしておく。

## ドメインを変えるとき

`gk-craft.netlify.app` を独自ドメイン等に変える場合、次の箇所を置換する。

| ファイル | 箇所 |
|---|---|
| `public/index.html` | `canonical` / `og:url` / `og:image` / JSON-LD の `url`・`image` |
| `public/contact.html` | `canonical` / `og:url` / `og:image` |
| `public/robots.txt` | `Sitemap:` |
| `public/sitemap.xml` | 各 `<loc>` |
| `gas/Code.gs` | 自動返信メール本文の URL |

```bash
# まとめて置換する例
grep -rl 'gk-craft.netlify.app' . | xargs sed -i '' 's#gk-craft\.netlify\.app#example.co.jp#g'
```

## 差し替えポイント

- **写真** — `public/assets/img/office.jpg`。CSS の `.grayscale` で自動的にモノクロ化されるので、カラー写真をそのまま置いてよい。縦横比 951:665 に近いものが崩れない。
- **電話番号** — 全ファイルの `050-3590-0212` と `tel:05035900212`
- **料金表** — `public/index.html` の `#price` セクション
- **フォームの選択肢** — `public/contact.html` の `<select>`。
  項目を増やしたら `public/assets/js/contact.js` の `FIELDS` と
  `gas/Code.gs` の `HEADERS` / `normalize()` / `appendToSheet()` にも同じ名前を足す。

## 設計メモ

- デザインは Claude Design のデザインシステム "Modernist" 由来。
  角丸ゼロ・2px の罫線・アクセント `#ec3013` が骨格で、`style.css` 冒頭のトークンが源泉。
- フォームは Netlify Forms ではなく Google Apps Script に直接 POST している。
  件数無制限・無料で、営業側がスプレッドシートのまま扱えるため。
- GAS の `doPost` は CORS プリフライトに応答できないので、
  `Content-Type: text/plain;charset=utf-8` の「単純リクエスト」として送り、
  GAS 側で `JSON.parse` している（`contact.js` のコメント参照）。
