# mcp-allowlist

GitHub Copilot の Organization 設定 **"Restrict MCP access to registry servers" → "Registry only"** で利用する、社内向け MCP レジストリ（許可リスト）を **GitHub Pages** で配信する静的サイトです。

[Official MCP Registry v0.1 仕様](https://registry.modelcontextprotocol.io/docs) に準拠した HTTPS エンドポイントを提供します。

実装は [JMDC TECH BLOG: GitHub Copilot向けMCP RegistryをGitHub Pagesで構築する](https://techblog.jmdc.co.jp/entry/2025-12-23) を参考にしています。

## 提供エンドポイント

公開ベース URL を `https://<org-or-user>.github.io/mcp-allowlist` とした場合、以下のエンドポイントを提供します。

| Method | Path | 説明 |
| --- | --- | --- |
| GET | `/v0.1/servers` | 登録済みサーバーの一覧 (`ServerList`) |
| GET | `/v0.1/servers/{serverName}/versions/latest` | 指定サーバーの最新版 (`ServerResponse`) |
| GET | `/v0.1/servers/{serverName}/versions/{version}` | 指定サーバーの特定バージョン (`ServerResponse`) |

`{serverName}` は Reverse-DNS 形式（例: `com.atlassian/remote-mcp`）で、URL では URL エンコードされ `com.atlassian%2Fremote-mcp` となります。

## 登録サーバー

- **Atlassian Remote MCP Server**
  - name: `com.atlassian/remote-mcp`
  - URL: `https://mcp.atlassian.com/v1/mcp`
  - transport: `streamable-http`

## ファイル構成

```
.
├── .github/workflows/deploy.yml           # GitHub Pages 自動デプロイ
├── .node-version                          # Node.js のバージョン指定
├── .gitignore                             # docs/ などをコミット対象外に
├── mcp-registry.json                      # ★ 単一の真実のソース。サーバ追加時はここを編集
├── scripts/
│   └── generate-registry-endpoints.js    # mcp-registry.json から docs/ を生成
└── docs/                                   # 生成物（CI で生成、Pages の公開ディレクトリ）
    └── v0.1/servers/
        ├── index.html
        └── com.atlassian/remote-mcp/versions/
            ├── latest/index.html
            └── 1.0.0/index.html
```

各 `index.html` の中身は仕様で定義された JSON ボディそのものです。GitHub Pages はディレクトリ index 用に `index.json` を割り当てる仕組みがないため、`index.html` を用いて JSON ペイロードを配信しています。`Content-Type` は `text/html` になりますが、Copilot のレジストリ取得処理はレスポンスを JSON として正しく解釈するため動作します（[JMDC事例](https://techblog.jmdc.co.jp/entry/2025-12-23)で実証済み）。

GitHub Pages は `Access-Control-Allow-Origin: *` を自動付与するため、Copilot 側のシンプル GET リクエストには問題なく応答できます。

## ローカル動作確認

```bash
node scripts/generate-registry-endpoints.js
```

`docs/` 以下に各エンドポイント用の `index.html` が生成されます。

## デプロイ手順

1. このリポジトリを GitHub にプッシュします（**Public** リポジトリ必須。Private では Copilot から `Failed to fetch` エラーになります）。
2. リポジトリの **Settings → Pages** で、Source を **GitHub Actions** に設定します。
3. `main` ブランチへの push を契機に [.github/workflows/deploy.yml](.github/workflows/deploy.yml) が走り、`docs/` を生成して GitHub Pages にデプロイします。
4. デプロイ後、疎通確認:
   ```bash
   curl -L https://<org-or-user>.github.io/mcp-allowlist/v0.1/servers
   curl -L "https://<org-or-user>.github.io/mcp-allowlist/v0.1/servers/com.atlassian%2Fremote-mcp/versions/latest"
   curl -L "https://<org-or-user>.github.io/mcp-allowlist/v0.1/servers/com.atlassian%2Fremote-mcp/versions/1.0.0"
   ```

## GitHub Copilot 側の設定

1. Organization の **Settings → Copilot → Policies** を開く。
2. **Restrict MCP access to registry servers** を **Registry only** に設定。
3. **MCP registry URL (optional)** に **Base URL** を指定:
   - 正: `https://<org-or-user>.github.io/mcp-allowlist`
   - 誤: `https://<org-or-user>.github.io/mcp-allowlist/v0.1/servers` ← `/v0.1/servers` を含めると重複してアクセスされ動作しません
4. VS Code を再起動し、拡張機能パネルで `@mcp` と検索してレジストリのサーバーが表示されることを確認します。

## サーバを追加する場合

1. [`mcp-registry.json`](mcp-registry.json) の `servers` 配列にエントリを追加し、`metadata.count` を更新。
2. PR を作成 → レビュー → main にマージで自動デプロイ。

スキーマ詳細は [MCP Registry OpenAPI 仕様](https://registry.modelcontextprotocol.io/docs#/operations/list-servers-v0.1) を参照してください。

## トラブルシューティング

- **VS Code で `Failed to fetch` と表示される**
  - リポジトリが Private になっていないか確認（GitHub Pages も Public 必須）
  - Registry URL に `/v0.1/servers` を含めていないか確認
- **`@mcp` 検索で何も出ない**
  - `curl <registry-url>/v0.1/servers` で JSON が返ることを確認
  - Copilot Policy が "Registry only" になっているか確認
  - VS Code を再起動してキャッシュを更新
# mcp-allowlist

GitHub Copilot の Organization 設定 **"Restrict MCP access to registry servers" → "Registry only"** で利用する、社内向け MCP レジストリ（許可リスト）を配信する静的サイトです。

[Official MCP Registry v0.1 仕様](https://registry.modelcontextprotocol.io/docs) に準拠した HTTPS エンドポイントを提供します。

## ホスティング: Cloudflare Pages 推奨

> **重要**: Copilot のレジストリ検証クライアントはレスポンスの `Content-Type` を厳格に評価するため、`application/json` で返す必要があります。**GitHub Pages はカスタム HTTP ヘッダーをサポートしないため、`Content-Type: text/html` のままで配信され、Copilot 側の検証に失敗します**。
>
> 同じリポジトリのまま、`_headers` / `_redirects` をサポートする **Cloudflare Pages**（推奨）または Netlify にデプロイしてください。GitHub Pages 構成と矛盾しないため共存可能です。

## 提供エンドポイント

公開ベース URL を `https://<your-project>.pages.dev`（または独自ドメイン）とした場合、以下のエンドポイントを提供します。

| Method | Path | 説明 |
| --- | --- | --- |
| GET | `/v0.1/servers` | 登録済みサーバーの一覧 (`ServerList`) |
| GET | `/v0.1/servers/{serverName}/versions` | サーバーの全バージョン一覧 (`ServerList`) |
| GET | `/v0.1/servers/{serverName}/versions/latest` | 指定サーバーの最新版 (`ServerResponse`) |
| GET | `/v0.1/servers/{serverName}/versions/{version}` | 指定サーバーの特定バージョン (`ServerResponse`) |

`{serverName}` は Reverse-DNS 形式（`com.atlassian/remote-mcp`）で、URL 上では URL エンコードされ `com.atlassian%2Fremote-mcp` として扱われます。

## 登録サーバー

- **Atlassian Remote MCP Server**
  - name: `com.atlassian/remote-mcp`
  - URL: `https://mcp.atlassian.com/v1/mcp`
  - transport: `streamable-http`

## ディレクトリ構成

```
.
├── _headers                                       # Cloudflare Pages: Content-Type / CORS 設定
├── _redirects                                     # Cloudflare Pages: 末尾スラッシュ正規化
├── .nojekyll                                      # GitHub Pages: Jekyll 無効化
├── index.html                                     # ルートページ（リンク集）
├── mcp-allowlist.json                             # 元の社内許可リスト
└── v0.1/
    └── servers/
        ├── index.html                             # GET /v0.1/servers
        └── com.atlassian/
            └── remote-mcp/
                └── versions/
                    ├── index.html                 # GET /v0.1/servers/com.atlassian%2Fremote-mcp/versions
                    ├── latest/index.html          # GET /v0.1/servers/com.atlassian%2Fremote-mcp/versions/latest
                    └── 1.0.0/index.html           # GET /v0.1/servers/com.atlassian%2Fremote-mcp/versions/1.0.0
```

各 `index.html` の中身は仕様で定義された JSON ボディです。Cloudflare Pages では `_headers` の `Content-Type: application/json` 上書きにより、これらのレスポンスは正しく JSON として配信されます。

## `_headers` の内容

```
/v0.1/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, OPTIONS
  Access-Control-Allow-Headers: *
  Cache-Control: public, max-age=300
  X-Content-Type-Options: nosniff
```

## デプロイ手順 (Cloudflare Pages)

1. Cloudflare ダッシュボード → **Workers & Pages → Create application → Pages → Connect to Git** からこのリポジトリを選択。
2. ビルド設定はすべて空欄のまま（静的ファイルをそのまま配信）。
   - Framework preset: `None`
   - Build command: 空欄
   - Build output directory: `/`（ルート）
3. デプロイ完了後、`https://<project>.pages.dev/v0.1/servers` で疎通確認:
   ```bash
   curl -i https://<project>.pages.dev/v0.1/servers
   curl -i "https://<project>.pages.dev/v0.1/servers/com.atlassian%2Fremote-mcp/versions/latest"
   curl -i "https://<project>.pages.dev/v0.1/servers/com.atlassian%2Fremote-mcp/versions/1.0.0"
   ```
   レスポンスヘッダーに `Content-Type: application/json; charset=utf-8` と `Access-Control-Allow-Origin: *` があることを確認してください。

## GitHub Copilot 側の設定

1. Organization の **Settings → Copilot → Policies** を開く。
2. **Restrict MCP access to registry servers** を **Registry only** に設定。
3. **Registry URL** に Cloudflare Pages の公開ベース URL（例: `https://<project>.pages.dev`）を指定。
   - 末尾スラッシュは付けません。
   - `/v0.1` のパスは指定しません（Copilot 側が自動的に `/v0.1/servers` を付与します）。

## VS Code 側の設定

`.vscode/mcp.json` または `settings.json` にて、許可リストにある URL と完全一致する MCP サーバーを登録します。

```json
{
  "servers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp"
    }
  }
}
```

レジストリ側 (`com.atlassian/remote-mcp`) の `remotes[].url` と一致するため、許可されます。

## サーバを追加する場合

1. `v0.1/servers/<reverse-dns>/<name>/versions/<version>/index.html` を作成し、`ServerResponse` 形式の JSON を記述。
2. 同階層に `latest/index.html` を作成し、最新バージョンの `ServerResponse` を複製（`isLatest: true`）。
3. `v0.1/servers/<reverse-dns>/<name>/versions/index.html` の `ServerList` を更新。
4. `v0.1/servers/index.html`（`ServerList`）の `servers` 配列にエントリを追加し、`metadata.count` を更新。

## トラブルシューティング

- **VS Code の MCP サーバが起動しない / 許可リストに無いと表示される**
  - `curl -i <registry-url>/v0.1/servers` で `Content-Type: application/json` を確認
  - `mcp.json` の `url` がレジストリの `remotes[].url` と完全一致しているか確認（クエリ文字列、末尾スラッシュ含む）
  - VS Code を再起動してレジストリキャッシュを更新
- **Cloudflare Pages デプロイが反映されない**
  - `_headers` / `_redirects` がリポジトリのルートにあるか確認
  - Cloudflare Pages のデプロイログを確認
# mcp-allowlist

GitHub Copilot の Organization 設定 **"Restrict MCP access to registry servers" → "Registry only"** で利用する、社内向け MCP レジストリ（許可リスト）を GitHub Pages で配信する静的サイトです。

[Official MCP Registry v0.1 仕様](https://registry.modelcontextprotocol.io/docs) に準拠した HTTPS エンドポイントを提供します。

## 提供エンドポイント

レジストリの公開ベース URL を `https://<org>.github.io/mcp-allowlist` とした場合、以下のエンドポイントを提供します。

| Method | Path | 説明 |
| --- | --- | --- |
| GET | `/v0.1/servers` | 登録済みサーバーの一覧 (`ServerList`) |
| GET | `/v0.1/servers/{serverName}/versions/latest` | 指定サーバーの最新版 (`ServerResponse`) |
| GET | `/v0.1/servers/{serverName}/versions/{version}` | 指定サーバーの特定バージョン (`ServerResponse`) |

`{serverName}` は Reverse-DNS 形式（`com.atlassian/remote-mcp`）で、URL 上では URL エンコードされ `com.atlassian%2Fremote-mcp` として扱われます。

## 登録サーバー

- **Atlassian Remote MCP Server**
  - name: `com.atlassian/remote-mcp`
  - URL: `https://mcp.atlassian.com/v1/mcp`
  - transport: `streamable-http`

## ディレクトリ構成

```
.
├── .nojekyll                                      # Jekyll を無効化
├── index.html                                     # ルートページ（リンク集）
├── mcp-allowlist.json                             # 元の社内許可リスト
└── v0.1/
    └── servers/
        ├── index.html                             # GET /v0.1/servers
        └── com.atlassian/
            └── remote-mcp/
                └── versions/
                    ├── latest/index.html          # GET /v0.1/servers/com.atlassian%2Fremote-mcp/versions/latest
                    └── 1.0.0/index.html           # GET /v0.1/servers/com.atlassian%2Fremote-mcp/versions/1.0.0
```

各 `index.html` の中身は仕様で定義された JSON ボディそのものです。GitHub Pages には拡張子なし URL のディレクトリ index として `index.json` を割り当てる仕組みがないため、`index.html` を用いて JSON ペイロードを配信しています。`Content-Type` は `text/html` になりますが、レスポンスボディは正規の JSON のため、JSON パーサで正しく解釈できます。

> **メモ**: GitHub Pages は URL パス中の `%2F` を `/` にデコードしてからファイルを解決します。このため、サーバー名 `com.atlassian/remote-mcp` を、ディレクトリ階層 `com.atlassian/remote-mcp/` として配置しています。

## デプロイ手順

1. このリポジトリを GitHub にプッシュします。
2. リポジトリの **Settings → Pages** で、Source を `Deploy from a branch` にし、`main` ブランチの `/ (root)` を選択します。
3. しばらく待つと `https://<org-or-user>.github.io/mcp-allowlist/` で公開されます。
4. 動作確認:
   ```bash
   curl -L https://<org-or-user>.github.io/mcp-allowlist/v0.1/servers
   curl -L "https://<org-or-user>.github.io/mcp-allowlist/v0.1/servers/com.atlassian%2Fremote-mcp/versions/latest"
   curl -L "https://<org-or-user>.github.io/mcp-allowlist/v0.1/servers/com.atlassian%2Fremote-mcp/versions/1.0.0"
   ```

## GitHub Copilot 側の設定

1. Organization の **Settings → Copilot → Policies** を開く。
2. **Restrict MCP access to registry servers** を **Registry only** に設定。
3. **Registry URL** に GitHub Pages の公開 URL（例: `https://<org-or-user>.github.io/mcp-allowlist`）を指定。

## サーバを追加する場合

1. `v0.1/servers/<reverse-dns>/<name>/versions/<version>/index.html` を作成し、`ServerResponse` 形式の JSON を記述。
2. 同階層に `latest/index.html` を作成し、最新バージョンの `ServerResponse` を複製（`isLatest: true`）。
3. `v0.1/servers/index.html`（`ServerList`）の `servers` 配列にエントリを追加し、`metadata.count` を更新。
