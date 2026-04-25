# Cloud Run デプロイ セットアップガイド

## 前提条件

- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) がインストール済みであること
- GCP プロジェクトが作成済みであること

---

## 1. GCP へのログイン

```bash
export PATH="$PATH:/snap/bin"
gcloud auth login
gcloud config set project project-29a1ccba-6ef1-4614-870
gcloud auth application-default set-quota-project project-29a1ccba-6ef1-4614-870
```

---

## 2. 必要な API を有効化

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com
```

---

## 3. Artifact Registry リポジトリを作成

```bash
gcloud artifacts repositories create life-support-woff-server \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="life-support-woff Cloud Run image"
```

---

## 4. Workload Identity Federation の設定

GitHub Actions がサービスアカウントキーなしで GCP に認証できるようにします。

### 4-1. サービスアカウントを作成

```bash
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer"
```

### 4-2. 必要な権限を付与

```bash
PROJECT_ID=$(gcloud config get-value project)
SA="github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

# Artifact Registry への書き込み
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA" \
  --role="roles/artifactregistry.writer"

# Cloud Run へのデプロイ
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA" \
  --role="roles/run.admin"

# サービスアカウントとして動作する権限
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA" \
  --role="roles/iam.serviceAccountUser"
```

### 4-3. Workload Identity プールを作成

```bash
gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --display-name="GitHub Actions Pool"
```

### 4-4. プロバイダーを作成

```bash
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository_owner=='shinshou'"
```

### 4-5. サービスアカウントにバインド

```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SA="github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/shinshou/life-support-woff"
```

---

## 5. GitHub Secrets に登録する値を確認

以下のコマンドで各 Secret に設定する値を取得します。

```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

echo "GCP_PROJECT_ID: $PROJECT_ID"
echo ""
echo "WIF_PROVIDER:"
echo "  projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
echo ""
echo "WIF_SERVICE_ACCOUNT:"
echo "  github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
```

---

## 6. GitHub Secrets に登録

GitHub リポジトリの **Settings → Secrets and variables → Actions** で以下を登録します。

| Secret 名             | 値                                                                                     |
|-----------------------|----------------------------------------------------------------------------------------|
| `GCP_PROJECT_ID`      | GCP プロジェクト ID（例: `my-project-123456`）                                         |
| `WIF_PROVIDER`        | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `WIF_SERVICE_ACCOUNT` | `github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com`                          |

---

## 7. 環境変数（Cloud Run のランタイム設定）

サーバーが使用する環境変数は Cloud Run コンソールまたは以下のコマンドで設定します。

```bash
gcloud run services update life-support-woff-server \
  --region=asia-northeast1 \
  --set-env-vars="KEY=VALUE,KEY2=VALUE2"
```

---

## 8. デプロイの確認

`main` ブランチに `server/` 以下の変更をプッシュすると、GitHub Actions が自動的に Cloud Run へデプロイします。

```bash
git push origin main
```

GitHub リポジトリの **Actions** タブでデプロイの進行状況を確認できます。
