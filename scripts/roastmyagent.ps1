# RoastMyAgent CLI: prepare backend/.env (Fernet), then docker compose up --build
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

$Yes = $false
$i = 0
while ($i -lt $args.Count) {
    switch ($args[$i]) {
        "up" { $i++; continue }
        "-y" { $Yes = $true; $i++; continue }
        "--yes" { $Yes = $true; $i++; continue }
        "-h" {
            @"
Usage: roastmyagent up [options]

  Prepares backend/.env (from .env.example if missing), optionally generates
  FERNET_KEY, then runs: docker compose up --build

Options:
  -y, --yes    Generate and write FERNET_KEY without prompting (non-interactive)
  -h, --help   Show this help

Environment:
  CI=true      Same as --yes for key generation when FERNET_KEY is empty
"@
            exit 0
        }
        "--help" {
            @"
Usage: roastmyagent up [options]

  Prepares backend/.env (from .env.example if missing), optionally generates
  FERNET_KEY, then runs: docker compose up --build

Options:
  -y, --yes    Generate and write FERNET_KEY without prompting (non-interactive)
  -h, --help   Show this help

Environment:
  CI=true      Same as --yes for key generation when FERNET_KEY is empty
"@
            exit 0
        }
        "help" {
            @"
Usage: roastmyagent up [options]

  Prepares backend/.env (from .env.example if missing), optionally generates
  FERNET_KEY, then runs: docker compose up --build

Options:
  -y, --yes    Generate and write FERNET_KEY without prompting (non-interactive)
  -h, --help   Show this help

Environment:
  CI=true      Same as --yes for key generation when FERNET_KEY is empty
"@
            exit 0
        }
        default {
            Write-Error "Unknown argument: $($args[$i]). Try: roastmyagent --help"
            exit 1
        }
    }
}

$EnvFile = Join-Path $Root "backend\.env"
$Example = Join-Path $Root "backend\.env.example"

if (-not (Test-Path $Example)) {
    Write-Error "Missing $Example"
    exit 1
}

if (-not (Test-Path $EnvFile)) {
    Copy-Item $Example $EnvFile
    Write-Host "Created backend/.env from backend/.env.example"
}

function Test-FernetKeyEmpty {
    $content = Get-Content $EnvFile -Raw -ErrorAction SilentlyContinue
    if (-not $content) { return $true }
    if ($content -notmatch "(?m)^FERNET_KEY=") { return $true }
    $m = [regex]::Match($content, "(?m)^FERNET_KEY=(.*)$")
    if (-not $m.Success) { return $true }
    $val = $m.Groups[1].Value.Trim()
    return [string]::IsNullOrWhiteSpace($val)
}

function Get-FernetKeyGenerated {
    $tryPython = {
        param([string]$Exe)
        & $Exe -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>$null
        if ($LASTEXITCODE -eq 0) { return $true }
        return $false
    }
    foreach ($exe in @("python", "python3")) {
        $cmd = Get-Command $exe -ErrorAction SilentlyContinue
        if (-not $cmd) { continue }
        $null = & $exe -c "import cryptography.fernet" 2>$null
        if ($LASTEXITCODE -ne 0) { continue }
        $out = & $exe -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
        if ($LASTEXITCODE -eq 0 -and $out) { return $out.Trim() }
    }
    $dk = Get-Command docker -ErrorAction SilentlyContinue
    if ($dk) {
        Write-Host "Generating Fernet key with Docker (python:3.12-slim)…"
        $out = docker run --rm python:3.12-slim sh -c "pip install -q cryptography && python -c `"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())`""
        if ($LASTEXITCODE -ne 0) { throw "Docker failed to generate Fernet key." }
        return $out.Trim()
    }
    throw "Cannot generate a Fernet key: install Python with cryptography, or install Docker and retry."
}

function Set-FernetKeyInEnvFile {
    param([string]$Key)
    $lines = @(Get-Content $EnvFile)
    $found = $false
    $newLines = foreach ($line in $lines) {
        if ($line -match "^\s*FERNET_KEY=") {
            $found = $true
            "FERNET_KEY=$Key"
        } else {
            $line
        }
    }
    if (-not $found) {
        $newLines = @($newLines) + "FERNET_KEY=$Key"
    }
    $enc = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($EnvFile, (($newLines -join "`r`n") + "`r`n"), $enc)
}

if (Test-FernetKeyEmpty) {
    $auto = $Yes
    if ($env:CI -eq "true") { $auto = $true }
    if (-not $auto -and [Console]::IsInputRedirected -eq $false) {
        $ans = Read-Host "FERNET_KEY is empty. Generate one and write it to backend/.env? [Y/n]"
        if ($ans -match "^[Nn]") {
            Write-Host "Set FERNET_KEY in backend/.env, then run: roastmyagent up"
            exit 1
        }
    } elseif (-not $auto) {
        Write-Error "FERNET_KEY is empty. Re-run with -Yes or set FERNET_KEY in backend/.env"
        exit 1
    }
    $key = Get-FernetKeyGenerated
    Set-FernetKeyInEnvFile -Key $key
    Write-Host "FERNET_KEY written to backend/.env"
    Write-Host "Keep a backup of this key if you need to decrypt existing data after restore."
}

docker compose up --build
