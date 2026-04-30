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
