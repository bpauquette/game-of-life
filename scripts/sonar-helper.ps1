param(
  [ValidateSet("start", "stop", "status", "logs", "scan", "scan-fast", "scan-status", "help")]
  [string]$Command = "help",
  [string]$Token,
  [string]$TaskId,
  [string]$Inclusions,
  [string]$TestInclusions,
  [int]$MaxChecks = 120
)

$ErrorActionPreference = "Stop"

$composeFile = "docker-compose.sonarqube.yml"
$sonarUrl = "http://localhost:9000"
$scannerUrl = "http://host.docker.internal:9000"
$projectKey = "game-of-life"
$scanCacheVolume = "gol-sonar-scanner-cache"
$scannerCacheMount = "/opt/sonar-scanner/.sonar/cache"
$scannerWorkDir = "/tmp/sonar-scanner-work"
$reportTaskPath = ".scannerwork/report-task.txt"
$sessionPath = ".scannerwork/sonar-scan-session.json"

function Read-SonarTokenFromEnvFile {
  if (-not (Test-Path ".env.local")) {
    return $null
  }

  $line = Select-String -Path ".env.local" -Pattern "^SONAR_TOKEN=" | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  return ($line.Line -replace "^SONAR_TOKEN=", "").Trim()
}

function Resolve-SonarToken {
  param([string]$ExplicitToken)

  if ($ExplicitToken) {
    return $ExplicitToken
  }

  if ($env:SONAR_TOKEN) {
    return $env:SONAR_TOKEN
  }

  return Read-SonarTokenFromEnvFile
}

function Ensure-ComposeFile {
  if (-not (Test-Path $composeFile)) {
    throw "Missing $composeFile in repository root."
  }
}

function Ensure-SonarReady {
  try {
    $status = (Invoke-RestMethod -Uri "$sonarUrl/api/system/status" -TimeoutSec 5).status
    if ($status -ne "UP") {
      throw "SonarQube is not ready (status=$status). Run start first."
    }
  } catch {
    throw "SonarQube is not reachable at $sonarUrl. Run start first."
  }
}

function Wait-ForSonarUp {
  param([int]$MaxChecks = 120)

  for ($i = 1; $i -le $MaxChecks; $i++) {
    try {
      $status = (Invoke-RestMethod -Uri "$sonarUrl/api/system/status" -TimeoutSec 5).status
      if ($status -eq "UP") {
        Write-Output "SonarQube is ready at $sonarUrl"
        return
      }
      Write-Output "Current SonarQube status: $status"
    } catch {
      Write-Output "Waiting for SonarQube..."
    }
    Start-Sleep -Seconds 3
  }

  throw "Timed out waiting for SonarQube to become ready."
}

function New-SonarAuthHeader {
  param([string]$ResolvedToken)
  $pair = "${ResolvedToken}:"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
  return @{ Authorization = "Basic $encoded" }
}

function Ensure-ScannerCacheVolume {
  docker volume create $scanCacheVolume | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create or access Docker volume '$scanCacheVolume'."
  }
}

function Ensure-ScannerworkDir {
  if (-not (Test-Path ".scannerwork")) {
    New-Item -ItemType Directory -Path ".scannerwork" | Out-Null
  }
}

function Reset-ScannerTempState {
  Ensure-ScannerworkDir
  $tempPath = ".scannerwork/.sonartmp"
  if (Test-Path $tempPath) {
    Remove-Item -Recurse -Force -Path $tempPath -ErrorAction SilentlyContinue
  }
}

function Normalize-LcovPaths {
  $lcovPath = "coverage/lcov.info"
  if (-not (Test-Path $lcovPath)) {
    return
  }

  $content = Get-Content -Raw -Path $lcovPath
  $normalized = [Regex]::Replace($content, "(?m)^SF:(.+)$", {
      param($m)
      $pathValue = $m.Groups[1].Value -replace "\\", "/"
      return "SF:$pathValue"
    })

  if ($normalized -ne $content) {
    Set-Content -Path $lcovPath -Value $normalized -NoNewline
  }
}

function Save-ScanSession {
  param(
    [string]$SavedTaskId,
    [string]$Mode
  )

  Ensure-ScannerworkDir
  $session = [pscustomobject]@{
    taskId    = $SavedTaskId
    mode      = $Mode
    updatedAt = (Get-Date).ToString("o")
  }
  $session | ConvertTo-Json | Set-Content -Path $sessionPath
}

function Read-SessionTaskId {
  if (-not (Test-Path $sessionPath)) {
    return $null
  }

  try {
    $session = Get-Content -Raw -Path $sessionPath | ConvertFrom-Json
    return $session.taskId
  } catch {
    return $null
  }
}

function Read-ReportValue {
  param([string]$Key)

  if (-not (Test-Path $reportTaskPath)) {
    return $null
  }

  $line = Select-String -Path $reportTaskPath -Pattern ("^{0}=" -f [Regex]::Escape($Key)) | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  return ($line.Line -replace ("^{0}=" -f [Regex]::Escape($Key)), "").Trim()
}

function Resolve-TaskId {
  param([string]$ExplicitTaskId)

  if ($ExplicitTaskId) {
    return $ExplicitTaskId
  }

  $fromReport = Read-ReportValue -Key "ceTaskId"
  if ($fromReport) {
    return $fromReport
  }

  return Read-SessionTaskId
}

function Invoke-Scanner {
  param(
    [string]$ResolvedToken,
    [string]$ResolvedInclusions,
    [string]$ResolvedTestInclusions
  )

  Ensure-ScannerCacheVolume
  Reset-ScannerTempState

  $projectPath = (Resolve-Path ".").Path
  $scannerArgs = @(
    "-Dsonar.host.url=$scannerUrl",
    "-Dsonar.token=$ResolvedToken",
    "-Dsonar.projectBaseDir=/usr/src",
    "-Dsonar.working.directory=$scannerWorkDir",
    "-Dsonar.scanner.metadataFilePath=/usr/src/$reportTaskPath"
  )
  if ($ResolvedInclusions) {
    $scannerArgs += "-Dsonar.inclusions=$ResolvedInclusions"
    # Targeted scans should not drag in all tests unless explicitly requested.
    if ($ResolvedTestInclusions) {
      $scannerArgs += "-Dsonar.test.inclusions=$ResolvedTestInclusions"
      Normalize-LcovPaths
    } else {
      $scannerArgs += "-Dsonar.test.exclusions=**/*"
      # Skip full coverage import for tight feedback loops.
      $scannerArgs += "-Dsonar.javascript.lcov.reportPaths="
    }
  }
  $scanCommand = "cd /usr/src && sonar-scanner " + ($scannerArgs -join " ")

  docker run --rm `
    -e SONAR_HOST_URL=$scannerUrl `
    -e SONAR_TOKEN=$ResolvedToken `
    -v "${projectPath}:/usr/src" `
    -v "${scanCacheVolume}:${scannerCacheMount}" `
    sonarsource/sonar-scanner-cli `
    sh -c $scanCommand

  if ($LASTEXITCODE -ne 0) {
    throw "Sonar scanner failed with exit code $LASTEXITCODE."
  }
}

function Get-CeTask {
  param(
    [string]$ResolvedToken,
    [string]$ResolvedTaskId
  )

  $headers = New-SonarAuthHeader -ResolvedToken $ResolvedToken
  return (Invoke-RestMethod -Uri "$sonarUrl/api/ce/task?id=$ResolvedTaskId" -Headers $headers -TimeoutSec 15).task
}

function Wait-ForCeTask {
  param(
    [string]$ResolvedToken,
    [string]$ResolvedTaskId,
    [int]$Checks = 120
  )

  for ($i = 1; $i -le $Checks; $i++) {
    $task = Get-CeTask -ResolvedToken $ResolvedToken -ResolvedTaskId $ResolvedTaskId
    if ($task.status -eq "SUCCESS") {
      return $task
    }
    if ($task.status -eq "FAILED" -or $task.status -eq "CANCELED") {
      throw "Compute Engine task $ResolvedTaskId ended with status: $($task.status)"
    }
    Start-Sleep -Seconds 3
  }

  throw "Timed out waiting for Compute Engine task $ResolvedTaskId"
}

function Get-QualityGateStatus {
  param(
    [string]$ResolvedToken,
    [string]$ResolvedProjectKey
  )

  $headers = New-SonarAuthHeader -ResolvedToken $ResolvedToken
  return (Invoke-RestMethod -Uri "$sonarUrl/api/qualitygates/project_status?projectKey=$ResolvedProjectKey" -Headers $headers -TimeoutSec 15).projectStatus
}

switch ($Command) {
  "start" {
    Ensure-ComposeFile
    docker compose -f $composeFile up -d
    Wait-ForSonarUp -MaxChecks $MaxChecks
    break
  }

  "stop" {
    Ensure-ComposeFile
    docker compose -f $composeFile down
    break
  }

  "status" {
    try {
      $status = Invoke-RestMethod -Uri "$sonarUrl/api/system/status" -TimeoutSec 5
      Write-Output ("SonarQube status: " + $status.status)
    } catch {
      Write-Output "SonarQube is not reachable at $sonarUrl"
      Ensure-ComposeFile
      docker compose -f $composeFile ps
    }
    break
  }

  "logs" {
    Ensure-ComposeFile
    docker compose -f $composeFile logs -f sonarqube
    break
  }

  "scan-fast" {
    $resolvedToken = Resolve-SonarToken -ExplicitToken $Token
    if (-not $resolvedToken) {
      throw "SONAR_TOKEN not found. Pass -Token, set `$env:SONAR_TOKEN, or add SONAR_TOKEN=... to .env.local."
    }

    Ensure-SonarReady
    Invoke-Scanner -ResolvedToken $resolvedToken -ResolvedInclusions $Inclusions -ResolvedTestInclusions $TestInclusions

    $resolvedTaskId = Resolve-TaskId -ExplicitTaskId $null
    if (-not $resolvedTaskId) {
      throw "Scan finished but ceTaskId was not found in $reportTaskPath."
    }

    Save-ScanSession -SavedTaskId $resolvedTaskId -Mode "scan-fast"

    $task = Get-CeTask -ResolvedToken $resolvedToken -ResolvedTaskId $resolvedTaskId
    Write-Output "Sonar scan submitted. ceTaskId: $resolvedTaskId"
    Write-Output "Current CE status: $($task.status)"
    Write-Output "Use: ./scripts/sonar-helper.ps1 -Command scan-status -TaskId $resolvedTaskId"
    break
  }

  "scan-status" {
    $resolvedToken = Resolve-SonarToken -ExplicitToken $Token
    if (-not $resolvedToken) {
      throw "SONAR_TOKEN not found. Pass -Token, set `$env:SONAR_TOKEN, or add SONAR_TOKEN=... to .env.local."
    }

    Ensure-SonarReady

    $resolvedTaskId = Resolve-TaskId -ExplicitTaskId $TaskId
    if (-not $resolvedTaskId) {
      throw "No CE task id found. Pass -TaskId or run scan-fast first."
    }

    $task = Get-CeTask -ResolvedToken $resolvedToken -ResolvedTaskId $resolvedTaskId
    Write-Output "CE task: $resolvedTaskId"
    Write-Output "Status: $($task.status)"
    if ($task.submittedAt) { Write-Output "Submitted: $($task.submittedAt)" }
    if ($task.executedAt) { Write-Output "Executed: $($task.executedAt)" }

    if ($task.status -eq "SUCCESS") {
      $resolvedProjectKey = Read-ReportValue -Key "projectKey"
      if (-not $resolvedProjectKey) { $resolvedProjectKey = $projectKey }
      $qg = Get-QualityGateStatus -ResolvedToken $resolvedToken -ResolvedProjectKey $resolvedProjectKey
      Write-Output "Quality Gate: $($qg.status)"
      Save-ScanSession -SavedTaskId $resolvedTaskId -Mode "scan-status"
    }

    if ($task.status -eq "FAILED" -or $task.status -eq "CANCELED") {
      throw "Compute Engine task $resolvedTaskId ended with status: $($task.status)"
    }
    break
  }

  "scan" {
    $resolvedToken = Resolve-SonarToken -ExplicitToken $Token
    if (-not $resolvedToken) {
      throw "SONAR_TOKEN not found. Pass -Token, set `$env:SONAR_TOKEN, or add SONAR_TOKEN=... to .env.local."
    }

    Ensure-SonarReady
    Invoke-Scanner -ResolvedToken $resolvedToken -ResolvedInclusions $Inclusions -ResolvedTestInclusions $TestInclusions

    $resolvedTaskId = Resolve-TaskId -ExplicitTaskId $null
    if (-not $resolvedTaskId) {
      throw "Scan finished but ceTaskId was not found in $reportTaskPath."
    }

    Save-ScanSession -SavedTaskId $resolvedTaskId -Mode "scan"

    Wait-ForCeTask -ResolvedToken $resolvedToken -ResolvedTaskId $resolvedTaskId -Checks $MaxChecks | Out-Null

    $resolvedProjectKey = Read-ReportValue -Key "projectKey"
    if (-not $resolvedProjectKey) { $resolvedProjectKey = $projectKey }
    $qg = Get-QualityGateStatus -ResolvedToken $resolvedToken -ResolvedProjectKey $resolvedProjectKey
    Write-Output "Sonar scan completed. ceTaskId: $resolvedTaskId"
    Write-Output "Quality Gate: $($qg.status)"
    break
  }

  default {
    Write-Output "SonarQube Helper (PowerShell)"
    Write-Output ""
    Write-Output "Usage:"
    Write-Output "  ./scripts/sonar-helper.ps1 -Command start"
    Write-Output "  ./scripts/sonar-helper.ps1 -Command status"
    Write-Output "  ./scripts/sonar-helper.ps1 -Command scan-fast [-Inclusions 'src/fileA.js,src/fileB.js'] [-TestInclusions 'src/fileA.test.js'] [-Token squ_...]"
    Write-Output "  ./scripts/sonar-helper.ps1 -Command scan-status [-TaskId <ceTaskId>] [-Token squ_...]"
    Write-Output "  ./scripts/sonar-helper.ps1 -Command scan [-Inclusions 'src/fileA.js,src/fileB.js'] [-TestInclusions 'src/fileA.test.js'] [-MaxChecks 120] [-Token squ_...]"
    Write-Output "  ./scripts/sonar-helper.ps1 -Command stop"
    Write-Output ""
    Write-Output "Recommended flow for throughput:"
    Write-Output "  1) scan-fast (submit analysis quickly)"
    Write-Output "  2) scan-status (poll when convenient)"
    Write-Output "  3) scan (full blocking gate check only at batch checkpoints)"
    break
  }
}
