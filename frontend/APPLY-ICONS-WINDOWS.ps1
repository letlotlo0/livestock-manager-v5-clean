$ErrorActionPreference='Stop'
$frontend = Join-Path $PSScriptRoot 'frontend'
if (!(Test-Path $frontend)) { throw 'frontend/ folder not found beside this script. Extract into your project root.' }
$icons = Join-Path $frontend 'assets/icons/apple-touch-icon.png'
if (!(Test-Path $icons)) { throw 'The icon files are missing. Extract the full ZIP.' }
$iconTags = @'
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/icons/favicon-16.png">
<link rel="shortcut icon" href="/favicon.ico">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Livestock Manager">
<meta name="theme-color" content="#546B2F">
'@
$changed = 0
Get-ChildItem -Path $frontend -Filter '*.html' -File | ForEach-Object {
  $path = $_.FullName
  $original = [System.IO.File]::ReadAllText($path)
  $headPattern = [regex]'(?is)(<head\b[^>]*>)(.*?)(</head\s*>)'
  $headMatch = $headPattern.Match($original)
  if (!$headMatch.Success) { Write-Warning "Skipping $($_.Name): no <head>"; return }
  $headText = $headMatch.Groups[2].Value
  $linkRE = [regex]'(?is)<link\b[^>]*>'
  $headText = $linkRE.Replace($headText, [System.Text.RegularExpressions.MatchEvaluator]{
    param($m)
    $rel=[regex]::Match($m.Value, '(?is)\brel\s*=\s*["'']([^"'']+)["'']')
    if ($rel.Success -and ($rel.Groups[1].Value -match '(?i)^(?:icon|manifest|apple-touch-icon|shortcut icon)$')) { return '' }
    return $m.Value
  })
  $metaRE = [regex]'(?is)<meta\b[^>]*>'
  $headText = $metaRE.Replace($headText, [System.Text.RegularExpressions.MatchEvaluator]{
    param($m)
    $key=[regex]::Match($m.Value, '(?is)\bname\s*=\s*["'']([^"'']+)["'']')
    if ($key.Success -and ($key.Groups[1].Value -match '(?i)^(?:apple-mobile-web-app-capable|apple-mobile-web-app-title|theme-color)$')) { return '' }
    return $m.Value
  })
  $updated=$original.Substring(0,$headMatch.Index)+$headMatch.Groups[1].Value+"`r`n"+$iconTags+"`r`n"+$headText+$headMatch.Groups[3].Value+$original.Substring($headMatch.Index+$headMatch.Length)
  if ($updated -ne $original) {
    $backupDir = Join-Path $PSScriptRoot 'backups-before-app-icons'
    if (!(Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
    $backupPath = Join-Path $backupDir ($_.Name + '.bak')
    if (!(Test-Path $backupPath)) { [System.IO.File]::WriteAllText($backupPath, $original, (New-Object System.Text.UTF8Encoding($false))) }
    [System.IO.File]::WriteAllText($path, $updated, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host ('Updated: '+$_.Name)
    $script:changed++
  }
}
Write-Host "Complete: updated $changed HTML pages. No backend files touched."
