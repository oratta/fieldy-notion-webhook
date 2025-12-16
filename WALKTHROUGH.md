# Fieldy Webhook to Notion 連携 実装完了報告

FieldyからのWebhookを受信し、Notionデータベースに保存するGoogle Cloud Workers (Hono) アプリケーションを実装しました。

## 作成されたファイル

### ドキュメント
- `contexts/fieldy_overview.md`: Fieldyの概要調査
- `contexts/webhook_spec.md`: Webhookの仕様詳細
- `contexts/notion_integration_design.md`: 連携の設計書

### 実装コード
- `src/index.ts`: Webhookのエントリーポイント。ペイロードを受信し、処理を振り分けます。
- `src/notion.ts`: Notion APIとの通信ロジック。
    - 受信した文字起こしテキストを、読みやすい形式（話者ごとのブロックなど）に整形してNotionページに追加します。
- `package.json`, `wrangler.toml`, `tsconfig.json`: プロジェクト設定ファイル。

## セットアップ手順

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
Cloudflare Workers (Wrangler) のローカル開発では、機密情報（APIキーなど）を `.dev.vars` というファイルで管理するのが標準です。（Node.jsの `.env` に相当します）

`.dev.vars.example` をコピーして `.dev.vars` を作成し、値を設定してください。

```bash
cp .dev.vars.example .dev.vars
```

```ini
# .dev.vars
NOTION_API_KEY=secret_xxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxx
```

### 3. Notionの準備

**3-1. インテグレーションの作成**
1. [Notion My Integrations](https://www.notion.so/my-integrations) にアクセスします。
2. 「新しいインテグレーション」を作成します。
3. **種類 (Type)**: 「内部 (Internal)」を選択します。（個人利用のためこれでOKです）
4. 「シークレット (Internal Integration Secret)」をコピーし、`.dev.vars` の `NOTION_API_KEY` に設定します。

**3-2. データベースの作成**
以下のプロパティを持つデータベースをNotionで作成し、そのIDをメモしてください。

| プロパティ名 | 種類 (Type) | 説明 |
|---|---|---|
| **Name** | タイトル (Title) | ページのタイトル (`Transcription 2023-10-27...`) |
| **Date** | 日付 (Date) | 録音日時 |

**3-3. インテグレーションの接続 (重要)**
作成したデータベースにインテグレーションをアクセス可能にする必要があります。
1. Notionデータベースのページを開きます。
2. 右上の「…」（メニュー）をクリックします。
3. メニュー下部の「接続先 (Connect to)」または「接続 (Connections)」をクリックします。
4. 作成したインテグレーションを検索して追加します。

※ これを行わないと、APIからデータベースが見つからずエラーになります。



### 4. ローカルでの動作確認
開発サーバーを起動します。
```bash
npm run dev
```

以下のコマンドでWebhookをシミュレートしてテストできます（別のターミナルで実行）。
```bash
curl -X POST http://localhost:8787/webhook \
  -H "Content-Type: application/json" \
  -d '{ "date": "2023-10-27T10:00:00Z", "transcription": "これはテストです。", "transcriptions": [] }'
```

### 4. デプロイ
Cloudflare Workersへデプロイする場合：
```bash
npm run deploy
```
※ デプロイ後は、Cloudflareのダッシュボードまたは `wrangler secret put` コマンドで環境変数（`NOTION_API_KEY`, `NOTION_DATABASE_ID`）を設定する必要があります。

## 運用コストについて
**Cloudflare Workers** の無料プラン（Free Tier）で十分運用可能です。
- **1日 100,000 リクエスト**まで無料
- **CPU時間 10ms/リクエスト**まで（Standardモードならもっと長い）
- 個人利用のWebhook用途であれば、この制限を超えることはまずありません。完全無料で運用できます。

## 運用コストについて
**Cloudflare Workers** の無料プラン（Free Tier）で十分運用可能です。
- **1日 100,000 リクエスト**まで無料
- **CPU時間 10ms/リクエスト**まで（Standardモードならもっと長い）
- 個人利用のWebhook用途であれば、この制限を超えることはまずありません。完全無料で運用できます。

## 運用コストについて
**Cloudflare Workers** の無料プラン（Free Tier）で十分運用可能です。
- **1日 100,000 リクエスト**まで無料
- **CPU時間 10ms/リクエスト**まで
- 個人利用のWebhook用途であれば、この制限を超えることはまずありません。完全無料で運用できます。

## 運用コストについて
**Cloudflare Workers** の無料プラン（Free Tier）で十分運用可能です。
- **1日 100,000 リクエスト**まで無料
- **CPU時間 10ms/リクエスト**まで
- 個人利用のWebhook用途であれば、この制限を超えることはまずありません。完全無料で運用できます。

## 今後の拡張について




現在の実装では、Fieldyから送られてくる「生の文字起こしテキスト」のみを保存しています。
要約が必要な場合は、`src/index.ts` 内でOpenAI APIなどを呼び出し、要約生成処理を追加することが可能です。
