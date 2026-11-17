variable "project_id" {
  description = "Google Cloud project that hosts the site."
  type        = string
  default     = "gatherinsight"
}

variable "region" {
  description = "Region for Cloud Run and Artifact Registry."
  type        = string
  default     = "asia-southeast1"
}

variable "service_name" {
  description = "Cloud Run service name (also the Artifact Registry repository id)."
  type        = string
  default     = "baldanproject"
}

variable "image" {
  description = "Container image to run. CI passes the image it just built, tagged with the commit SHA."
  type        = string
  default     = "asia-southeast1-docker.pkg.dev/gatherinsight/baldanproject/site:v6"
}

variable "min_instances" {
  description = "Minimum instances. 0 = scale to zero when idle (no cost without traffic, a short cold start)."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Upper bound on instances, a hard ceiling on cost."
  type        = number
  default     = 3
}
