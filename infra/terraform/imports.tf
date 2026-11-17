# The registry, service and public access were first created with gcloud. These blocks adopt them into
# Terraform state on the first apply instead of creating duplicates; after that they are no-ops.
import {
  to = google_artifact_registry_repository.site
  id = "projects/gatherinsight/locations/asia-southeast1/repositories/baldanproject"
}

import {
  to = google_cloud_run_v2_service.site
  id = "projects/gatherinsight/locations/asia-southeast1/services/baldanproject"
}

import {
  to = google_cloud_run_v2_service_iam_member.public
  id = "projects/gatherinsight/locations/asia-southeast1/services/baldanproject roles/run.invoker allUsers"
}
