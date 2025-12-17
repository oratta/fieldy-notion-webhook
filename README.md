# Fieldy Webhook to Notion

[Fieldy](https://www.fieldy.ai/)の文字起こしWebhookを受信し、Notionデータベースに自動保存するCloudflare Workersアプリケーションです。

## 機能

- Fieldyからの文字起こしWebhookを受信
- 話者分離（Speaker Diarization）に対応
- Notionデータベースへ自動保存
- **ページ集約機能**: 日単位/時間単位でページをまとめて一覧性を向上
- Cloudflare Workers無料プランで運用可能

## 必要なもの

- [Cloudflare](https://cloudflare.com/)アカウント
- [Notion](https://notion.so/)アカウント
- [Fieldy](https://www.fieldy.ai/)アカウント
- Node.js 18以上

## セットアップ

### 1. リポジトリのクローンと依存関係のインストール

```bash
git clone https://github.com/oratta/fieldy-notion-webhook.git
cd fieldy-notion-webhook
npm install
```

### 2. Notionの準備

#### 2-1. インテグレーションの作成

1. [Notion My Integrations](https://www.notion.so/my-integrations) にアクセス
2. 「新しいインテグレーション」を作成
3. **種類**: 「内部 (Internal)」を選択
4. 「シークレット」をコピー

#### 2-2. データベースの作成

以下のプロパティを持つデータベースを作成：

| プロパティ名 | 種類 | 説明 |
|---|---|---|
| **Name** | タイトル | ページのタイトル |
| **Date** | 日付 | 録音日時 |

#### 2-3. インテグレーションの接続

1. データベースページを開く
2. 右上「…」→「接続先」をクリック
3. 作成したインテグレーションを追加

### 3. 環境変数の設定

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` を編集：

```ini
NOTION_API_KEY=secret_xxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GROUPING_MODE=daily
```

| 変数名 | 説明 |
|--------|------|
| `NOTION_API_KEY` | Notionインテグレーションのシークレット |
| `NOTION_DATABASE_ID` | 保存先データベースのID（UUID形式） |
| `GROUPING_MODE` | ページ集約モード（下記参照） |

**GROUPING_MODE オプション**：
| 値 | 動作 |
|----|------|
| `none` | Webhook毎に新規ページ作成 |
| `daily` | 1日1ページにまとめて追記 |
| `hourly` | 1時間1ページにまとめて追記（デフォルト） |

**データベースIDの取得方法**：
NotionのデータベースURL `https://notion.so/workspace/xxxxxxxx...` の32文字をUUID形式（8-4-4-4-12）に変換

### 4. ローカル開発

```bash
npm run dev
```

テスト用リクエスト：

```bash
curl -X POST http://localhost:8787/webhook \
  -H "Content-Type: application/json" \
  -d '{"date": "2023-10-27T10:00:00Z", "transcription": "テスト", "transcriptions": []}'
```

### 5. デプロイ

```bash
npm run deploy
```

デプロイ後、シークレットを設定：

```bash
npx wrangler secret put NOTION_API_KEY
npx wrangler secret put NOTION_DATABASE_ID
npx wrangler secret put GROUPING_MODE
```

### 6. FieldyでWebhook URLを設定

デプロイ後のURL（例: `https://fieldy-webhook.xxx.workers.dev/webhook`）をFieldyのWebhook設定に登録

## コスト

Cloudflare Workers無料プランで運用可能：
- 1日 100,000リクエストまで無料
- 個人利用では制限に達することはほぼありません

## ライセンス

MIT
