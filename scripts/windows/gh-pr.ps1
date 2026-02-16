param(
  [string]$Base = "main",
  [string]$Title = "",
  [string]$Body = "",
  [switch]$Draft,
  [switch]$Help
)

$ErrorActionPreference = "Stop"

if ($Help) {
  Write-Host "Usage:"
  Write-Host "  ./scripts/windows/gh-pr.ps1"
  Write-Host "  ./scripts/windows/gh-pr.ps1 -Draft"
  Write-Host "  ./scripts/windows/gh-pr.ps1 -Base main -Title 'Title' -Body 'Body'"
  return
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI (gh) is required."
}

gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Run 'gh auth login' first."
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -eq $Base) {
  throw "Refusing to open a PR from '$branch' into itself. Create a feature branch first."
}

Write-Host "Pushing $branch to origin..."
git push -u origin $branch

$args = @("pr", "create", "--base", $Base, "--head", $branch)
if ($Draft) {
  $args += "--draft"
}

$hasCustomTitle = -not [string]::IsNullOrWhiteSpace($Title)
$hasCustomBody = -not [string]::IsNullOrWhiteSpace($Body)

if ($hasCustomTitle -or $hasCustomBody) {
  if (-not ($hasCustomTitle -and $hasCustomBody)) {
    throw "If setting title/body manually, provide both -Title and -Body."
  }
  $args += @("--title", $Title, "--body", $Body)
} else {
  $args += "--fill"
}

Write-Host "Creating pull request..."
& gh @args
