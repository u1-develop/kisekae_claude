# AI Virtual Try-On App

Gemini 2.5 Flash APIを使用したバーチャル試着アプリケーションです。

## 機能
- 人物画像のアップロード
- 定義済みの服の選択
- Gemini 2.5 Flash による自然な合成

## 技術スタック
- HTML5 / CSS3 / JavaScript
- React (CDN版)
- Google Gemini API

## Setup
1. このリポジトリをクローンします
2. `index.html` をブラウザで開くか、ローカルサーバーで起動します
   ```bash
   npx http-server .
   ```

## デプロイ
Vercelなどの静的ホスティングサービスで簡単にデプロイ可能です。
APIキーはクライアントサイドで入力するため、環境変数の設定は必須ではありませんが、
本番運用時はセキュリティを考慮した構成（プロキシサーバー経由など）を推奨します。
