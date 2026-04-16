param(
    [string]$RepoRoot = $(Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$Path) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Sync-Provider([string]$Provider) {
    $providerRoot = Join-Path $RepoRoot "skills\$Provider\excalidraw-diagram"
    $sharedRoot = Join-Path $RepoRoot "shared"

    $referencesTarget = Join-Path $providerRoot "references"
    $scriptsTarget = Join-Path $providerRoot "scripts"
    $docsTarget = Join-Path $providerRoot "docs"

    Ensure-Dir $referencesTarget
    Ensure-Dir $scriptsTarget
    Ensure-Dir $docsTarget

    Copy-Item (Join-Path $sharedRoot "references\*") $referencesTarget -Recurse -Force
    Copy-Item (Join-Path $sharedRoot "backends\mermaid-browser\*") $scriptsTarget -Recurse -Force
    Copy-Item (Join-Path $sharedRoot "docs\*") $docsTarget -Recurse -Force
    Copy-Item (Join-Path $sharedRoot "backends\handcrafted\*") $docsTarget -Recurse -Force
}

Sync-Provider "codex"
Sync-Provider "claude"

Write-Host "Synchronized shared assets into skills/codex and skills/claude."
