#!/usr/bin/env bash
set -euo pipefail

# 更新時は公式リリースのバージョンとSHA-256を両方更新する。
gitleaks_version='8.30.1'
gitleaks_sha256='551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb'
gitleaks_archive="gitleaks_${gitleaks_version}_linux_x64.tar.gz"
gitleaks_temp=$(mktemp -d)
trap 'rm -rf "$gitleaks_temp"' EXIT

curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  "https://github.com/gitleaks/gitleaks/releases/download/v${gitleaks_version}/${gitleaks_archive}" \
  --output "$gitleaks_temp/$gitleaks_archive"
printf '%s  %s\n' "$gitleaks_sha256" "$gitleaks_temp/$gitleaks_archive" | sha256sum --check --strict
tar -xzf "$gitleaks_temp/$gitleaks_archive" -C "$gitleaks_temp" gitleaks
"$gitleaks_temp/gitleaks" git --no-banner --redact --log-opts=--all .
"$gitleaks_temp/gitleaks" dir --no-banner --redact .
