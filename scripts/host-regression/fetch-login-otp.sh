#!/usr/bin/env bash
# Reads latest 6-digit login OTP from CMS dev-mail log (audit env only).
set -euo pipefail
LOG="${1:-${IAM_HOST_REGRESSION_OTP_LOG:-${IAM_E2E_OTP_LOG:-}}}"
if [[ -z "${LOG}" ]]; then
  echo "Set IAM_HOST_REGRESSION_OTP_LOG or pass log path" >&2
  exit 1
fi
for _ in $(seq 1 30); do
  otp=$(grep -oE 'otp=[0-9]{6}' "$LOG" 2>/dev/null | tail -1 | cut -d= -f2)
  if [[ -n "${otp:-}" ]]; then
    echo "$otp"
    exit 0
  fi
  sleep 0.5
done
echo "OTP not found in $LOG" >&2
exit 1
