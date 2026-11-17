#!/usr/bin/env bash
# One-time setup so GitHub Actions can deploy without any stored keys (Workload Identity Federation).
# Run once by a project owner; everything after this is done by the pipeline and Terraform.
#
#   bash infra/bootstrap.sh
set -euo pipefail

PROJECT_ID="gatherinsight"
REGION="asia-southeast1"
REPO="baldan555/baldanportofolio"          # the only GitHub repo allowed to deploy
SERVICE="baldanproject"                   # Cloud Run service and Artifact Registry repo
STATE_BUCKET="gatherinsight-baldanproject-tfstate"
SA_ID="github-deployer"
POOL="github"
PROVIDER="github-actions"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
SA="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com iam.googleapis.com \
  run.googleapis.com artifactregistry.googleapis.com --project "$PROJECT_ID"

# Terraform state: private, versioned bucket
gcloud storage buckets describe "gs://${STATE_BUCKET}" >/dev/null 2>&1 || \
  gcloud storage buckets create "gs://${STATE_BUCKET}" --project "$PROJECT_ID" --location "$REGION" \
    --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update "gs://${STATE_BUCKET}" --versioning

# Deployer identity, with access only to what this site needs
gcloud iam service-accounts describe "$SA" --project "$PROJECT_ID" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "$SA_ID" --project "$PROJECT_ID" --display-name "GitHub Actions deployer (portfolio)"

gcloud run services add-iam-policy-binding "$SERVICE" --project "$PROJECT_ID" --region "$REGION" \
  --member "serviceAccount:${SA}" --role roles/run.admin
# read-only, project-wide: Terraform polls Cloud Run's long-running operations, which live at project level
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:${SA}" --role roles/run.viewer \
  --condition None >/dev/null
gcloud artifacts repositories add-iam-policy-binding "$SERVICE" --project "$PROJECT_ID" --location "$REGION" \
  --member "serviceAccount:${SA}" --role roles/artifactregistry.admin
gcloud storage buckets add-iam-policy-binding "gs://${STATE_BUCKET}" \
  --member "serviceAccount:${SA}" --role roles/storage.objectAdmin
# deploy revisions that run as the default runtime identity
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" --project "$PROJECT_ID" \
  --member "serviceAccount:${SA}" --role roles/iam.serviceAccountUser

# GitHub's OIDC tokens are trusted only for this repository
gcloud iam workload-identity-pools describe "$POOL" --project "$PROJECT_ID" --location global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create "$POOL" --project "$PROJECT_ID" --location global --display-name "GitHub Actions"
gcloud iam workload-identity-pools providers describe "$PROVIDER" --project "$PROJECT_ID" --location global \
  --workload-identity-pool "$POOL" >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --project "$PROJECT_ID" --location global \
    --workload-identity-pool "$POOL" --display-name "GitHub Actions" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository == '${REPO}'"

gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO}"

echo "Workload identity provider: projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
echo "Service account:            ${SA}"
