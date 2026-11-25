# 打包一个扩展到 dist/<id>-<version>.zip
#
#   ./build.ps1 -Id com.kralisxc.media-converter
#   ./build.ps1 -Id com.kralisxc.media-converter -NoBin    # 只打源码（体积小，但要自己放二进制）
#
# zip 里的结构是 <id>/plugin.toml + <id>/main.js + <id>/...，ADL 的安装器认这种
# "根目录或第一层子目录带 plugin.toml" 的形状，GitHub 打的包也长这样。
#
# 本机环境：只有 PowerShell 5.1，没有 pwsh；这个脚本必须保持纯 ASCII（PS5.1 按 GBK
# 读 .ps1，中文会变语法错误）。中文说明请写进 README。
param(
    [Parameter(Mandatory = $true)][string]$Id,
    [switch]$NoBin
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $root "plugins\$Id"
if (-not (Test-Path $src)) { throw "not found: $src" }
$ver = (Select-String -Path (Join-Path $src 'plugin.toml') -Pattern '^version\s*=\s*"([^"]+)"').Matches[0].Groups[1].Value
if (-not $ver) { throw "version not found in plugin.toml" }

$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$stage = Join-Path $dist '_stage'
Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path (Join-Path $stage $Id) | Out-Null

Get-ChildItem -Path $src -Force | Where-Object {
    $_.Name -ne '.git' -and -not ($NoBin -and $_.Name -eq 'bin')
} | ForEach-Object {
    Copy-Item -Recurse -Force $_.FullName (Join-Path $stage $Id)
}

$zip = Join-Path $dist "$Id-$ver.zip"
Remove-Item -Force $zip -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $stage $Id) -DestinationPath $zip -CompressionLevel Optimal
Remove-Item -Recurse -Force $stage

$hash = (Get-FileHash -Path $zip -Algorithm SHA256).Hash.ToLower()
$size = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host "zip    : $zip"
Write-Host "size   : $size MB"
Write-Host "sha256 : $hash"
Write-Host ""
Write-Host "index.json entry:"
Write-Host ("  {{ `"id`": `"{0}`", `"version`": `"{1}`", `"zip`": `"{2}-{1}.zip`", `"sha256`": `"{3}`" }}" -f $Id, $ver, $Id, $hash)
