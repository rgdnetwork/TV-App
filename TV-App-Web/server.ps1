param([int]$Port = 4173)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = "http://127.0.0.1:$Port/"

try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $listener.Start()
} catch {
    Write-Host "El puerto $Port ya esta en uso."
    Write-Host "Abriendo $url por si TV App ya esta en marcha..."
    Start-Process $url
    exit 0
}

$mime = @{
    '.html'        = 'text/html; charset=utf-8'
    '.htm'         = 'text/html; charset=utf-8'
    '.css'         = 'text/css; charset=utf-8'
    '.js'          = 'text/javascript; charset=utf-8'
    '.json'        = 'application/json; charset=utf-8'
    '.webmanifest' = 'application/manifest+json; charset=utf-8'
    '.png'         = 'image/png'
    '.jpg'         = 'image/jpeg'
    '.jpeg'        = 'image/jpeg'
    '.gif'         = 'image/gif'
    '.svg'         = 'image/svg+xml'
    '.ico'         = 'image/x-icon'
    '.woff'        = 'font/woff'
    '.woff2'       = 'font/woff2'
    '.ttf'         = 'font/ttf'
    '.txt'         = 'text/plain; charset=utf-8'
}

$rootFull = [System.IO.Path]::GetFullPath($root)
$rootPrefix = $rootFull.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

Write-Host "TV App en marcha: $url"
Write-Host "Deja esta ventana abierta mientras usas la app. Ctrl+C para cerrar."
Start-Process $url

while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
        $requestLine = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }

        while ($true) {
            $line = $reader.ReadLine()
            if ($null -eq $line -or $line -eq '') { break }
        }

        $parts = $requestLine.Split(' ')
        if ($parts.Length -lt 2) { continue }
        $method = $parts[0]
        $target = $parts[1]

        $path = $target.Split('?')[0]
        $path = [System.Uri]::UnescapeDataString($path)
        if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }

        $relative = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $file = [System.IO.Path]::GetFullPath((Join-Path $rootFull $relative))

        $status = '200 OK'
        $contentType = 'application/octet-stream'

        if (-not $file.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            $status = '403 Forbidden'
            $body = [System.Text.Encoding]::UTF8.GetBytes('403')
            $contentType = 'text/plain; charset=utf-8'
        } elseif (Test-Path -LiteralPath $file -PathType Leaf) {
            $body = [System.IO.File]::ReadAllBytes($file)
            $ext = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
            if ($mime.ContainsKey($ext)) { $contentType = $mime[$ext] }
        } else {
            $status = '404 Not Found'
            $body = [System.Text.Encoding]::UTF8.GetBytes('404')
            $contentType = 'text/plain; charset=utf-8'
        }

        $head = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
        $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
        $stream.Write($headBytes, 0, $headBytes.Length)
        if ($method -ne 'HEAD' -and $body.Length -gt 0) {
            $stream.Write($body, 0, $body.Length)
        }
        $stream.Flush()
    } catch {
    } finally {
        $client.Close()
    }
}
