# Container registry for the site's images, with a cleanup policy so old builds don't pile up.
resource "google_artifact_registry_repository" "site" {
  repository_id = var.service_name
  location      = var.region
  format        = "DOCKER"
  description   = "Portfolio site images (Cloud Run service ${var.service_name})"

  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "keep-recent-10"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  cleanup_policies {
    id     = "delete-older-than-30d"
    action = "DELETE"
    condition {
      older_than = "2592000s"
    }
  }
}

# The site itself: Next.js standalone server, scales to zero.
resource "google_cloud_run_v2_service" "site" {
  name                = var.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = true

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Public website: anyone may invoke it.
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = google_cloud_run_v2_service.site.project
  location = google_cloud_run_v2_service.site.location
  name     = google_cloud_run_v2_service.site.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# The custom domain (portofolio.baldanproject.my.id) is a Cloud Run domain mapping created by hand and left
# outside Terraform on purpose: it routes to this service by name, so redeploys never touch it.
