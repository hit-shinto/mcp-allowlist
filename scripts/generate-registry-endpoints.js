#!/usr/bin/env node
/**
 * MCP レジストリエンドポイント生成スクリプト
 *
 * mcp-registry.json から GitHub Pages 用の HTML ファイルを生成します。
 *
 * 生成されるエンドポイント:
 *   - GET /v0.1/servers (全サーバー一覧)
 *   - GET /v0.1/servers/{serverName}/versions/latest (最新バージョン)
 *   - GET /v0.1/servers/{serverName}/versions/{version} (特定バージョン)
 *
 * 使用方法:
 *   node scripts/generate-registry-endpoints.js
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_FILE = path.join(__dirname, '..', 'mcp-registry.json');
const OUTPUT_BASE = path.join(__dirname, '..', 'docs', 'v0.1', 'servers');

/**
 * packages プロパティを除外したサーバーエントリを返す
 * @param {Object} serverEntry - サーバーエントリ
 * @returns {Object} packages を除外したエントリ
 */
function removePackages(serverEntry) {
  const { server, _meta } = serverEntry;
  const { packages, ...serverWithoutPackages } = server;
  return { server: serverWithoutPackages, _meta };
}

/**
 * メイン処理
 */
function main() {
  console.log('MCP レジストリエンドポイントを生成中...\n');

  // 1. mcp-registry.json を読み込み
  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));

  // 2. エンドポイント1: 全サーバー一覧 (GET /v0.1/servers)
  const indexPath = path.join(OUTPUT_BASE, 'index.html');
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, JSON.stringify(registry));
  console.log('✓ GET /v0.1/servers');

  // 3. エンドポイント2 & 3: 各サーバーの個別ファイル
  let count = 0;
  for (const serverEntry of registry.servers) {
    const serverName = serverEntry.server.name;
    const version = serverEntry.server.version;

    // packages を除外したデータを作成
    const cleanedEntry = removePackages(serverEntry);
    const jsonString = JSON.stringify(cleanedEntry);

    const serverDir = path.join(OUTPUT_BASE, serverName, 'versions');

    // エンドポイント2: latest 版 (GET /v0.1/servers/{serverName}/versions/latest)
    const latestPath = path.join(serverDir, 'latest', 'index.html');
    fs.mkdirSync(path.dirname(latestPath), { recursive: true });
    fs.writeFileSync(latestPath, jsonString);

    // エンドポイント3: バージョン指定版 (GET /v0.1/servers/{serverName}/versions/{version})
    const versionPath = path.join(serverDir, version, 'index.html');
    fs.mkdirSync(path.dirname(versionPath), { recursive: true });
    fs.writeFileSync(versionPath, jsonString);

    console.log(`✓ ${serverName} (v${version})`);
    count++;
  }

  console.log(`\n✅ 完了: ${count}個のサーバーを処理しました`);
  console.log(`   合計: ${1 + count * 2}個のHTMLファイルを生成`);
}

// スクリプト実行
main();
