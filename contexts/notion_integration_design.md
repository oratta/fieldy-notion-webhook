# Fieldy Notion連携 設計書

## 目的
Fieldyの録音データを自動的にNotionデータベースに保存する。

## アーキテクチャ
[Fieldy Webhook] -> [サーバー/クラウド関数 (今回の実装)] -> [Notion API]

## Notionデータベース設計 (スキーマ)
受信したデータを格納するためのデータベースが必要です。

| プロパティ名 | プロパティタイプ | Fieldyデータのマッピング |
|---|---|---|
| **Name** (タイトル) | Title | `文字起こし {YYYY-MM-DD HH:mm}` |
| **Date** | Date | `date` |
| **Full Text** | Text (またはページ本文) | `transcription` |
| **Speakers** | Multi-select (オプション) | `transcriptions` からユニークな話者を抽出 |
| **Summary** | Text | *Webhookには含まれていません*。(ミドルウェア側でLLMを使って生成するか検討が必要) |

## データフロー
1. **受信 (Receive)**: WebhookエンドポイントがJSONペイロードを受信。
2. **変換 (Transform)**:
    - `date` のパース。
    - タイトルのフォーマット。
    - (オプション) `transcriptions` 配列を読みやすい台本形式に整形 (例: "**Speaker A**: こんにちは...")。
3. **Notionへ書き込み (Write)**:
    - ターゲットのデータベースに新しいページを作成。
    - プロパティを設定 (`Date`, `Name`)。
    - ページブロックを追加:
        - `transcription` がプロパティの上限 (2000文字) を超える場合や、可読性を高めるため、整形した台本テキストをページ本文 (Body) に追加する。

## 今後のタスク (TODO)
- [ ] Notionインテグレーションの設定 (Internal Integration)。
- [ ] データベースIDの取得。
- [ ] ホスティング先の決定 (Vercel Functions, Cloudflare Workers など)。
- [ ] **重要な決定事項**: Fieldyから要約が送られてこないため、自前で要約を生成するかどうか？
