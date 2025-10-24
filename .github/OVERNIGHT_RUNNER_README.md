# Overnight Runner (automated lint/test/sonar)

This repository contains an automated "overnight" runner that is designed to perform
mechanical checks (lint, tests) and optionally run SonarQube analysis. It is configured
as a GitHub Actions workflow with a dry-run by default.

Files added

- `.github/scripts/overnight-sonar-run.sh` — the runner script that performs the work.
- `.github/workflows/overnight-sonar.yml` — the scheduled GitHub Actions workflow that executes the script nightly.

How it works (safe defaults)

- The workflow runs daily at 03:00 UTC and also supports manual triggering.
- By default the runner script runs in DRY_RUN mode and will NOT push branches or open PRs.
- If you want the job to apply automatic fixes and open a PR, set `DRY_RUN=0` and `AUTO_PR=1` in the workflow or environment variables.

Enabling Sonar

- To enable Sonar scans, add `SONAR_TOKEN` to repository secrets (Settings → Secrets and variables → Actions → New repository secret).
- The workflow will attempt to run `sonar-scanner` if `SONAR_TOKEN` is present. You may need to adjust `sonar-scanner` config in `sonar-project.properties`.

How to switch from dry-run to auto-PR (recommended workflow)

1. Inspect dry-run logs in the Actions UI and confirm the script behaves as expected.
2. Add `GITHUB_TOKEN` (already available to Actions) or a dedicated bot token as repo secret if you need elevated permissions.
3. Update the workflow step to set `DRY_RUN=0 AUTO_PR=1` (or change env in the Actions UI) and push the change.

Safety notes

- The script will only push branches and create PRs if `DRY_RUN=0` and `AUTO_PR=1`.
- By default the script only runs eslint --fix and doesn't attempt invasive refactors. Sonar issues requiring human judgement will still be reported for manual review.

If you'd like, I can flip this to auto-PR mode or extend the script to create issues/PR comments with Sonar findings.
