# AWS / EKS exercise (archived)

Persodict was first deployed on AWS (EKS, Terraform, ArgoCD, ECR, GitOps) as a proof of concept, then moved to **Vercel**. The AWS setup is kept as a reference and is no longer run.

| Piece | Where | State |
|---|---|---|
| Image build, ECR push, GitOps tag bump | [`image.yaml`](./image.yaml) in this folder | Commented out, and moved out of `.github/workflows/` so GitHub ignores it |
| AWS infrastructure (VPC, EKS, ECR, IRSA, Secrets Manager) | `persodict-infra` repo (Terraform) | Every `.tf` file commented out |
| Helm chart and ArgoCD Application | `persodict-gitops` repo | Everything commented out |

Restore steps for the two repos are in their READMEs ("Restoring this config"). To restore `image.yaml`, move it back to `.github/workflows/`, remove the leading `# ` from each line after the header, and re-create the `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `GITOPS_PAT` repo secrets.

`Dockerfile`, `compose.yaml` and `.dockerignore` in the repo root are still active files, but nothing deploys them now.
