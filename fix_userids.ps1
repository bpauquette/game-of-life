$shapes = Get-Content "backend\data\shapes.json" | ConvertFrom-Json
Write-Host "Setting userId to 'system-user' for all $($shapes.Count) shapes..."
foreach ($shape in $shapes) {
    $shape.userId = "system-user"
}
$shapes | ConvertTo-Json -Depth 10 | Out-File -FilePath "backend\data\shapes.json" -Encoding UTF8
Write-Host "Updated shapes.json with system-user IDs"
