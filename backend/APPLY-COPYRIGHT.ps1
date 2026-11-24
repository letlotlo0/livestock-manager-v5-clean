$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root 'frontend'
if (-not (Test-Path -LiteralPath $frontend -PathType Container)) {
  Write-Host 'ERROR: Place the patch beside your existing frontend folder and rerun.' -ForegroundColor Red
  exit 1
}
$css = Join-Path $frontend 'lm-legal-footer.css'
if (-not (Test-Path -LiteralPath $css)) {
  Write-Host 'ERROR: First copy the supplied frontend files into your project.' -ForegroundColor Red
  exit 1
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
$link = '<link rel="stylesheet" href="lm-legal-footer.css?v=5.4.1" data-lm-legal-styles>'
$footer = '<div class="lm-legal-footer" role="contentinfo">© <span class="lm-legal-year">2026</span> Livestock Manager. All Rights Reserved. <span class="lm-legal-founder">Developed &amp; Founded by Letlotlo Lesege.</span></div>'
$script = '<script data-lm-legal-year>document.querySelectorAll(".lm-legal-year").forEach(function(e){e.textContent=new Date().getFullYear()});</script>'
$updated=0; $skipped=0
Get-ChildItem -LiteralPath $frontend -Filter '*.html' -File | ForEach-Object {
  $path=$_.FullName
  $h=[System.IO.File]::ReadAllText($path)
  if ($h -match 'class="lm-legal-footer"') { $skipped++; return }
  if ($h -notmatch '(?i)</head\s*>' -or $h -notmatch '(?i)</body\s*>') { $skipped++; return }
  # Remove old script-based footer loader when present, preventing duplicate text.
  $h=[regex]::Replace($h,'(?i)<link\b[^>]*data-lm-copyright-loader[^>]*>','')
  $h=[regex]::Replace($h,'(?is)<script\b[^>]*data-lm-copyright-loader[^>]*>\s*</script>','')
  $h=[regex]::Replace($h,'(?i)</head\s*>',($link+[Environment]::NewLine+'</head>'),1)
  $h=[regex]::Replace($h,'(?i)</body\s*>',($footer+[Environment]::NewLine+$script+[Environment]::NewLine+'</body>'),1)
  [System.IO.File]::WriteAllText($path,$h,$utf8)
  $updated++
}
Write-Host "Copyright footer added to $updated pages. Already applied or skipped: $skipped."
Write-Host 'Only existing frontend HTML files were modified. Dashboard and Profile content and style were preserved.'
