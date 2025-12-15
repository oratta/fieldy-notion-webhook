# Fieldy Webhook 仕様書

**出典**: [Fieldy Developer Docs](https://fieldlabsinc.github.io/docs/webhooks.md)

## エンドポイント要件
- メソッド: `POST` (Webhookの標準として暗黙的に指定)
- Content-Type: `application/json`

## ペイロードスキーマ (JSON)
```json
{
  "date": "2025-03-01T16:35:00.100907+00:00",
  "transcription": "会話の全文テキスト...",
  "transcriptions": [
    {
      "text": "発言ごとのテキスト",
      "speaker": "A",
      "start": 0.04,
      "end": 4.4,
      "duration": 4.36
    },
    ...
  ]
}
```

## フィールド詳細
| フィールド名 | データ型 | 説明 |
|---|---|---|
| `date` | String (ISO 8601) | 録音/文字起こしの日時。 |
| `transcription` | String | 録音全体の結合されたテキスト。 |
| `transcriptions` | Array | 話者分離（ダイアライゼーション）とタイムスタンプを含む詳細セグメントの配列。 |

## 注意点
- ペイロードには**要約 (Summary)** は含まれません。
- 公開されているURL (Public URL) である必要があります。
