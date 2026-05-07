# Restore your git identity after the cafe defreezer wipes ~/.gitconfig
# overnight. Without this, every `git commit` fails with "Author identity
# unknown" and you have to either re-set git config manually or pass
# `-c user.name=... -c user.email=...` on every commit.
#
# Usage (from anywhere):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # if needed
#   .\scripts\restore-git-identity.ps1
#
# Idempotent — safe to run on every cafe-PC reboot, or any time `git commit`
# starts complaining about an unknown author. Pairs with restore-notebooklm.ps1.

$ErrorActionPreference = "Stop"

$gitName  = "Neil Maglaya"
$gitEmail = "neilmaglaya.business22@gmail.com"

git config --global user.name  "$gitName"
git config --global user.email "$gitEmail"

Write-Host ""
Write-Host "OK: git identity restored:" -ForegroundColor Green
Write-Host "  user.name  = $(git config --global user.name)"
Write-Host "  user.email = $(git config --global user.email)"
Write-Host ""
Write-Host "Commits should now work without inline -c overrides." -ForegroundColor Cyan
Write-Host ""
