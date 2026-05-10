# mcp-allowlist

GitHub Copilot の Organization 設定 **"Restrict MCP access to registry servers" → "Registry only"** で利用する、社内向け MCP レジストリ（許可リスト）を **GitHub Pages** で配信する静的サイトです。

[Official MCP Registry v0.1 仕様](https://registry.modelcontextprotocol.io/docs) に準拠した HTTPS エンドポイントを提供します。

実装は [JMDC TECH BLOG: GitHub Copilot向けMCP RegistryをGitHub Pagesで構築する](https://techblog.jmdc.co.jp/entry/2025-12-23) を参考にしています。

## 提供エンドポイント

Base URL: `https://hit-shinto.github.io/mcp-allowlist`

| Method | Path | 説明 |
| --- | --- | --- |
| GET | `/v0.1/servers` | 登録済みサーバーの一覧 |
| GET | `/v0.1/servers/{serverName}/versions/latest` | 指定サーバーの最新版 |
| GET | `/v0.1/servers/{serverName}/versions/{version}` | 指定サーバーの特定バージョン |

## 登録サーバー

| name | URL | transport |
| --- | --- | --- |
| `com.atlassian/remote-mcp` | `https://mcp.atlassian.com/v1/mcp` | streamable-http |

## ファイル構成

```
.
├── .github/workflows/deploy.yml           # GitHub Pages 自動デプロイ
├── .gitignore                             # docs/ をコミット対象外に
├── .node-version                          # Node.js バージョン指定
├── mcp-registry.json                      # ★ 許可サーバーの定義。サーバ追加時はここを編集
├── scripts/
│   └── generate-registry-endpoints.js    # mcp-registry.json から docs/ を生成
└── docs/                                  # 生成物（CI で生成・Pages で公開）
    └── v0.1/servers/
        ├── index.html                     # GET /v0.1/servers
        └── com.atlassian/remote-mcp/versions/
            ├── latest/index.html          # GET /v0.1/servers/com.atlassian%2Fremote-mcp/versions/latest
            └── 1.0.0/index.html           # GET /v0.1/servers/com.atlassian%2Fremote-mcp/versions/1.0.0
```

`docs/` は CI で生成される成果物のため、手動編集・コミット不要です。

## GitHub Copilot 側の設定（設定済み）

| 項目 | 値 |
| --- | --- |
| Restrict MCP access | Registry only |
| MCP registry URL | `https://hit-shinto.github.io/mcp-allowlist` |

> **注意**: Registry URL には Base URL のみを指定します。`/v0.1/servers` を含めると Copilot が二重にパスを付加し動作しません。

## IDE からの接続方法

### VS Code

拡張機能パネルで `@mcp` と検索 → Atlassian Remote MCP Server を選択 → **Install** をクリック。
インストール後、VS Code の `settings.json` に設定が自動追記されます（`mcp.json` の手書き不要）。

## サーバを追加する場合

1. [`mcp-registry.json`](mcp-registry.json) の `servers` 配列にエントリを追加し、`metadata.count` を更新。
2. PR を作成 → レビュー → main にマージで自動デプロイ。

スキーマ詳細は [MCP Registry OpenAPI 仕様](https://registry.modelcontextprotocol.io/docs#/operations/list-servers-v0.1) を参照してください。

## 疎通確認

```bash
curl -L https://hit-shinto.github.io/mcp-allowlist/v0.1/servers
curl -L "https://hit-shinto.github.io/mcp-allowlist/v0.1/servers/com.atlassian%2Fremote-mcp/versions/latest"
curl -L "https://hit-shinto.github.io/mcp-allowlist/v0.1/servers/com.atlassian%2Fremote-mcp/versions/1.0.0"
```

## ローカル生成

```bash
node scripts/generate-registry-endpoints.js
```

## トラブルシューティング

| 症状 | 確認事項 |
| --- | --- |
| `Failed to fetch` | リポジトリが Public か確認（Private だと GitHub Pages に Copilot からアクセスできない） |
| `@mcp` 検索で何も出ない | Registry URL が正しいか・Copilot Policy が "Registry only" か確認 → VS Code 再起動 |
| Start ボタンが表示されない | `type: "http"` のリモートサーバーは起動不要。Copilot Chat の Agent モードから直接利用する |
