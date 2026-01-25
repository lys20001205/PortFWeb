$port = 8080
$root = Get-Location
$url = "http://localhost:$port/"

Write-Host "Starting HTTP server at $url"
Write-Host "Press Ctrl+C to stop"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
$listener.Start()

Start-Process $url

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        
        $localPath = Join-Path $root $path.TrimStart("/")
        
        if (Test-Path $localPath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentLength64 = $content.Length
            
            # Simple content type detection
            $extension = [System.IO.Path]::GetExtension($localPath)
            switch ($extension) {
                ".html" { $response.ContentType = "text/html" }
                ".js" { $response.ContentType = "application/javascript" }
                ".css" { $response.ContentType = "text/css" }
                ".png" { $response.ContentType = "image/png" }
                ".jpg" { $response.ContentType = "image/jpeg" }
                default { $response.ContentType = "application/octet-stream" }
            }
            
            $response.OutputStream.Write($content, 0, $content.Length)
        }
        else {
            $response.StatusCode = 404
        }
        
        $response.Close()
    }
}
finally {
    $listener.Stop()
}
