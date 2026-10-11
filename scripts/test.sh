#!/usr/bin/env bash
# Clock Years deploy smoke test — safe (read-only) by default.
#
#   bash test.sh                        # against http://localhost:8080
#   BASE_URL=https://clock.example.com bash test.sh
#   bash test.sh --write                # also creates one random signup + session
#
# Exit 0 when every check passes, 1 otherwise.
set -u -o pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
WRITE=0
for arg in "$@"; do
  case "$arg" in
    --write) WRITE=1 ;;
    -h|--help)
      sed -n '2,9p' "$0"
      exit 0
      ;;
    *) echo "Unknown flag: $arg (try --help)" >&2; exit 2 ;;
  esac
done

PASS=0
FAIL=0
GREEN=$'\033[32m'
RED=$'\033[31m'
RESET=$'\033[0m'

check() { # name, expected-code, actual-code
  if [ "$2" = "$3" ]; then
    PASS=$((PASS + 1))
    echo "${GREEN}PASS${RESET} $1 (HTTP $3)"
  else
    FAIL=$((FAIL + 1))
    echo "${RED}FAIL${RESET} $1 — expected HTTP $2, got $3"
  fi
}

code() { # path  -> prints HTTP status, "000" when unreachable
  curl -s -m 10 -o /dev/null -w '%{http_code}' "$BASE_URL$1" 2>/dev/null || echo "000"
}

echo "Smoke-testing $BASE_URL"

# --- Public pages (SSR 200 even when client-gated) ---
check "home /"                    200 "$(code /)"
check "register"                  200 "$(code /register)"
check "login"                     200 "$(code /login)"
check "dashboard (anon shell)"    200 "$(code /dashboard)"
check "settings (anon shell)"     200 "$(code /settings)"
check "admin (anon shell)"        200 "$(code /admin)"
check "favicon"                   200 "$(code /favicon.svg)"

# --- Auth stack, read-only: bogus sign-in must 401 (proves API + DB read) ---
bogus="nouser-$(date +%s)-$RANDOM@example.com"
signin_code="$(curl -s -m 10 -o /dev/null -w '%{http_code}' \
  -X POST "$BASE_URL/api/auth/sign-in/email" \
  -H 'Content-Type: application/json' -H "Origin: $BASE_URL" \
  -d "{\"email\":\"$bogus\",\"password\":\"WrongPassword123\"}" 2>/dev/null || echo "000")"
check "auth rejects bogus login" 401 "$signin_code"

# --- Write path (opt-in): real signup + session round-trip ---
if [ "$WRITE" = 1 ]; then
  email="smoke-$(date +%s)-$RANDOM@example.com"
  jar="$(mktemp)"
  signup_code="$(curl -s -m 15 -o /dev/null -w '%{http_code}' -c "$jar" \
    -X POST "$BASE_URL/api/auth/sign-up/email" \
    -H 'Content-Type: application/json' -H "Origin: $BASE_URL" \
    -d "{\"name\":\"smoke\",\"email\":\"$email\",\"password\":\"SmokePass123\"}" 2>/dev/null || echo "000")"
  check "auth accepts signup" 200 "$signup_code"
  session_code="$(curl -s -m 10 -o /dev/null -w '%{http_code}' -b "$jar" \
    "$BASE_URL/api/auth/get-session" 2>/dev/null || echo "000")"
  check "session round-trip" 200 "$session_code"
  rm -f "$jar"
  echo "(left behind: member $email — promote or ignore)"
fi

echo "---"
echo "pass=$PASS fail=$FAIL"
[ "$FAIL" = 0 ]
