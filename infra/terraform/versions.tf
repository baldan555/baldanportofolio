terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # State lives in a private, versioned GCS bucket (created once by infra/bootstrap.sh).
  backend "gcs" {
    bucket = "gatherinsight-baldanproject-tfstate"
    prefix = "portfolio"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
