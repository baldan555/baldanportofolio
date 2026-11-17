output "service_url" {
  description = "Cloud Run's own URL (the public site is served on portofolio.baldanproject.my.id)."
  value       = google_cloud_run_v2_service.site.uri
}

output "image" {
  description = "Image the latest revision runs."
  value       = var.image
}
