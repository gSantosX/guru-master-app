$baseUrl = "http://localhost:5000/api"
$imageDir = "C:\Users\ASUS\.gemini\antigravity\scratch\guru-master-app\backend\temp\828ee3a9-0733-42b7-9d1d-67e858f4a400"

$images = Get-ChildItem -Path $imageDir -Filter *.jpg | Select-Object -First 3

if ($images.Count -eq 0) {
    Write-Host "No images found."
    exit
}

$Form = @{
    projectName = "PowerShell Test Render"
    settings = '{"resolution": "1080p Horizontal (1920x1080)", "fps": "30 FPS", "transitionStyle": "crossfade", "zoomStyle": "zoom-in", "zoomSpeed": "Normal (1.1x)", "filterStyle": "nenhum"}'
}

for ($i = 0; $i -lt $images.Count; $i++) {
    $Form.Add("image_$i", $images[$i])
}

Write-Host "Sending render request..."
$resp = Invoke-RestMethod -Uri "$baseUrl/render" -Method Post -Form $Form

$jobId = $resp.job_id
Write-Host "Job started: $jobId"

while ($true) {
    $status = Invoke-RestMethod -Uri "$baseUrl/status/$jobId" -Method Get
    Write-Host "Status: $($status.status) | Progress: $($status.progress)%"
    
    if ($status.progress -eq 100 -or $status.status -like "*Erro*" -or $status.status -like "*Falha*") {
        break
    }
    
    Start-Sleep -Seconds 2
}

Write-Host "Final Status: $($status.status)"
