#!/usr/bin/env bash
# Test the Alexa /api/alexa webhook.
# Signature verification is bypassed in dev (NODE_ENV != production).
# In production the x-alexa-test-secret header is used as bypass.
#
# Usage:
#   ./scripts/test-alexa.sh [BASE_URL] [--block Breakfast|Lunch|Dinner]
#
# Examples:
#   ./scripts/test-alexa.sh                                        # localhost, auto IST block
#   ./scripts/test-alexa.sh --block Breakfast                      # localhost, force Breakfast
#   ./scripts/test-alexa.sh https://aaram-smart-homes.vercel.app   # production, auto block
#   ./scripts/test-alexa.sh https://aaram-smart-homes.vercel.app --block Dinner

set -euo pipefail

# ── Parse arguments ───────────────────────────────────────────────────────────
FORCE_BLOCK=""
POSITIONAL_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --block)
      FORCE_BLOCK="${2:-}"
      shift 2 ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift ;;
  esac
done

BASE="${POSITIONAL_ARGS[0]:-http://localhost:3000}"
ENDPOINT="$BASE/api/alexa"
NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Validate --block value
if [ -n "$FORCE_BLOCK" ] && [[ ! "$FORCE_BLOCK" =~ ^(Breakfast|Lunch|Dinner)$ ]]; then
  echo "Error: --block must be Breakfast, Lunch, or Dinner (got: $FORCE_BLOCK)"
  exit 1
fi

# Load ALEXA_SKILL_ID from .env.local if not already in environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"
if [ -z "${ALEXA_SKILL_ID:-}" ] && [ -f "$ENV_FILE" ]; then
  ALEXA_SKILL_ID=$(grep -E "^ALEXA_SKILL_ID=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
fi
SKILL_ID="${ALEXA_SKILL_ID:-amzn1.ask.skill.local-test}"

# Load ALEXA_TEST_SECRET for production signature bypass
if [ -z "${ALEXA_TEST_SECRET:-}" ] && [ -f "$ENV_FILE" ]; then
  ALEXA_TEST_SECRET=$(grep -E "^ALEXA_TEST_SECRET=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
fi
TEST_SECRET="${ALEXA_TEST_SECRET:-}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

header() { echo -e "\n${CYAN}━━━  $1  ━━━${NC}"; }
ok()     { echo -e "${GREEN}✔ $1${NC}"; }
info()   { echo -e "${YELLOW}→ $1${NC}"; }
fail()   { echo -e "${RED}✘ $1${NC}"; }

# ── JSON builders via Python (avoids all heredoc/quoting edge-cases) ──────────

make_launch() {
  python3 - "$SKILL_ID" "$NOW" <<'PY'
import sys, json, time
skill_id, now = sys.argv[1], sys.argv[2]
print(json.dumps({
  "version": "1.0",
  "session": {
    "new": True,
    "sessionId": f"amzn1.echo-api.session.test-{int(time.time())}",
    "application": {"applicationId": skill_id},
    "attributes": {},
    "user": {"userId": "amzn1.ask.account.test-user"}
  },
  "request": {
    "type": "LaunchRequest",
    "requestId": f"amzn1.echo-api.request.test-{int(time.time())}",
    "timestamp": now,
    "locale": "en-IN"
  }
}))
PY
}

make_intent() {
  # $1=intent_name  $2=attrs_json (optional, default {})  $3=slots_json (optional)
  local intent_name="$1"
  local attrs_arg="${2:-}"
  local slots_arg="${3:-}"
  [ -z "$attrs_arg" ] && attrs_arg='{}'
  [ -z "$slots_arg" ] && slots_arg='null'
  python3 - "$SKILL_ID" "$NOW" "$intent_name" "$attrs_arg" "$slots_arg" <<'PY'
import sys, json, time
skill_id, now, intent_name, attrs_raw, slots_raw = sys.argv[1:]
attrs = json.loads(attrs_raw)
intent = {"name": intent_name, "confirmationStatus": "NONE"}
if slots_raw != "null":
    intent["slots"] = json.loads(slots_raw)
print(json.dumps({
  "version": "1.0",
  "session": {
    "new": False,
    "sessionId": f"amzn1.echo-api.session.test-{int(time.time())}",
    "application": {"applicationId": skill_id},
    "attributes": attrs,
    "user": {"userId": "amzn1.ask.account.test-user"}
  },
  "request": {
    "type": "IntentRequest",
    "requestId": f"amzn1.echo-api.request.test-{int(time.time())}",
    "timestamp": now,
    "locale": "en-IN",
    "intent": intent
  }
}))
PY
}

make_session_ended() {
  python3 - "$SKILL_ID" "$NOW" <<'PY'
import sys, json, time
skill_id, now = sys.argv[1], sys.argv[2]
print(json.dumps({
  "version": "1.0",
  "session": {
    "new": False,
    "sessionId": f"amzn1.echo-api.session.test-{int(time.time())}",
    "application": {"applicationId": skill_id},
    "attributes": {},
    "user": {"userId": "amzn1.ask.account.test-user"}
  },
  "request": {
    "type": "SessionEndedRequest",
    "requestId": f"amzn1.echo-api.request.test-{int(time.time())}",
    "timestamp": now,
    "locale": "en-IN",
    "reason": "USER_INITIATED"
  }
}))
PY
}

# ── POST helper ───────────────────────────────────────────────────────────────

alexa_post() {
  local extra_headers=()
  if [ -n "$TEST_SECRET" ]; then
    extra_headers+=(-H "x-alexa-test-secret: $TEST_SECRET")
  fi
  if [ -n "$FORCE_BLOCK" ]; then
    extra_headers+=(-H "x-alexa-force-block: $FORCE_BLOCK")
  fi
  curl -s -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    "${extra_headers[@]}" \
    --data-raw "$1"
}

# ── Response parser ───────────────────────────────────────────────────────────
# Use python3 -c so the script is on the CLI (not on stdin), which keeps
# stdin free for the piped JSON.  printf '%s' avoids shell backslash
# interpretation of \n / \" sequences inside the JSON body.

SHOW_PY='
import sys, json, re
raw = sys.stdin.read()
try:
    d = json.loads(raw)
except Exception as e:
    print(f"  PARSE ERR : {e}")
    print(f"  RAW       : {raw[:300]}")
    sys.exit(0)
resp = d.get("response", {})
ssml = resp.get("outputSpeech", {}).get("ssml", "")
text = re.sub(r"<[^>]+>", " ", ssml).strip()
text = re.sub(r"\s+", " ", text)
end  = resp.get("shouldEndSession", "?")
attrs = list(d.get("sessionAttributes", {}).keys())
reprompt = resp.get("reprompt", {}).get("outputSpeech", {}).get("ssml", "")
reprompt_text = re.sub(r"<[^>]+>", " ", reprompt).strip() if reprompt else ""
if "error" in d:
    err = d.get("error", "unknown")
    print(f"  ERROR     : {err}")
else:
    print(f"  SAYS      : {text}")
    if reprompt_text:
        print(f"  REPROMPT  : {reprompt_text}")
    print(f"  END-SESS  : {end}")
    if attrs:
        print(f"  SESSION   : {attrs}")
'

show_response() {
  printf '%s' "$1" | python3 -c "$SHOW_PY"
}

# ── Connectivity ──────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Aaram Kitchen — Alexa Webhook Local Test Suite    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
info "Endpoint    : $ENDPOINT"
info "Skill ID    : $SKILL_ID"
info "IST time    : $(TZ=Asia/Kolkata date '+%H:%M %Z')"
if [ -n "$FORCE_BLOCK" ]; then
  info "Force block : $FORCE_BLOCK  (--block override active — bypasses IST detection)"
else
  info "Force block : none  (auto-detected from IST time)"
fi

header "0 / Connectivity"
RETRIES=0
until curl -s -o /dev/null "$BASE" || [ $RETRIES -ge 15 ]; do
  info "Waiting for server at $BASE …"
  sleep 2
  RETRIES=$((RETRIES + 1))
done
if curl -s -o /dev/null "$BASE"; then
  ok "Server is up at $BASE"
else
  fail "Server not reachable — start it with: npm run dev"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# TEST 1: LaunchRequest ("Alexa, open Aaram Kitchen")
# ─────────────────────────────────────────────────────────────────────────────
header "1 / LaunchRequest  →  ArrivalIntent handler"
RESP=$(alexa_post "$(make_launch)")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 2: ArrivalIntent (explicit)
# ─────────────────────────────────────────────────────────────────────────────
header "2 / ArrivalIntent"
RESP=$(alexa_post "$(make_intent "ArrivalIntent")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 3: DepartureIntent — passes current block in session so the handler
#         can compute the correct *next* meal
# ─────────────────────────────────────────────────────────────────────────────
header "3 / DepartureIntent  (session: currentBlock=Breakfast)"
ATTRS='{"currentBlock":"Breakfast","currentMenuId":"00000000-0000-0000-0000-000000000000"}'
RESP=$(alexa_post "$(make_intent "DepartureIntent" "$ATTRS")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 4: AMAZON.YesIntent — cook confirms all ingredients are available
# ─────────────────────────────────────────────────────────────────────────────
header "4 / AMAZON.YesIntent  (session: awaitingInventoryCheck=true)"
ATTRS='{"awaitingInventoryCheck":true,"nextBlock":"Lunch","nextMenuId":"00000000-0000-0000-0000-000000000001"}'
RESP=$(alexa_post "$(make_intent "AMAZON.YesIntent" "$ATTRS")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 5: AMAZON.NoIntent — cook says something is missing
# ─────────────────────────────────────────────────────────────────────────────
header "5 / AMAZON.NoIntent  (session: awaitingInventoryCheck=true)"
RESP=$(alexa_post "$(make_intent "AMAZON.NoIntent" "$ATTRS")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 6: MissingItemsIntent — Gemini extracts items → grocery_alerts insert
# ─────────────────────────────────────────────────────────────────────────────
header "6 / MissingItemsIntent  →  Gemini extract  →  grocery_alerts.insert"
SLOTS='{"MissingItems":{"name":"MissingItems","value":"we are missing onions, tomatoes, and chicken breast","confirmationStatus":"NONE"}}'
ATTRS='{"awaitingInventoryCheck":true,"nextBlock":"Lunch","nextMenuId":null}'
RESP=$(alexa_post "$(make_intent "MissingItemsIntent" "$ATTRS" "$SLOTS")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 7: MissingItemsIntent — empty slot (error-path)
# ─────────────────────────────────────────────────────────────────────────────
header "7 / MissingItemsIntent  — empty slot  (error-handling path)"
SLOTS='{"MissingItems":{"name":"MissingItems","confirmationStatus":"NONE"}}'
RESP=$(alexa_post "$(make_intent "MissingItemsIntent" "{}" "$SLOTS")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 8: AMAZON.HelpIntent
# ─────────────────────────────────────────────────────────────────────────────
header "8 / AMAZON.HelpIntent"
RESP=$(alexa_post "$(make_intent "AMAZON.HelpIntent")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 9: AMAZON.StopIntent
# ─────────────────────────────────────────────────────────────────────────────
header "9 / AMAZON.StopIntent"
RESP=$(alexa_post "$(make_intent "AMAZON.StopIntent")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
# TEST 10b: QueryMenuIntent — tenant asks what's on the menu (no block)
# ─────────────────────────────────────────────────────────────────────────────
header "10b / QueryMenuIntent  (no block slot — auto IST or forceBlock)"
RESP=$(alexa_post "$(make_intent "QueryMenuIntent")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 10c: QueryMenuIntent — tenant explicitly asks for Lunch
# ─────────────────────────────────────────────────────────────────────────────
header "10c / QueryMenuIntent  (slot: RequestedBlock=Lunch)"
SLOTS='{"RequestedBlock":{"name":"RequestedBlock","value":"Lunch","confirmationStatus":"NONE"}}'
RESP=$(alexa_post "$(make_intent "QueryMenuIntent" "{}" "$SLOTS")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 10d: FoodSuggestionIntent — tenant suggests a dish
# ─────────────────────────────────────────────────────────────────────────────
header "10d / FoodSuggestionIntent  →  food_suggestions.insert"
SLOTS='{"SuggestionText":{"name":"SuggestionText","value":"can we have biryani next week","confirmationStatus":"NONE"}}'
RESP=$(alexa_post "$(make_intent "FoodSuggestionIntent" "{}" "$SLOTS")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 10e: FoodSuggestionIntent — empty slot (error path)
# ─────────────────────────────────────────────────────────────────────────────
header "10e / FoodSuggestionIntent  — empty slot  (error-handling path)"
SLOTS='{"SuggestionText":{"name":"SuggestionText","confirmationStatus":"NONE"}}'
RESP=$(alexa_post "$(make_intent "FoodSuggestionIntent" "{}" "$SLOTS")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 10f: GetMenuIntent — explicit intent test
# ─────────────────────────────────────────────────────────────────────────────
header "10f / GetMenuIntent  (slot: MealType=breakfast)"
SLOTS='{"MealType":{"name":"MealType","value":"breakfast","confirmationStatus":"NONE"}}'
RESP=$(alexa_post "$(make_intent "GetMenuIntent" "{}" "$SLOTS")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 10g: ReportShortageIntent — explicit intent test
# ─────────────────────────────────────────────────────────────────────────────
header "10g / ReportShortageIntent  (slot: GroceryItem=onions)"
SLOTS='{"GroceryItem":{"name":"GroceryItem","value":"onions","confirmationStatus":"NONE"}}'
RESP=$(alexa_post "$(make_intent "ReportShortageIntent" "{}" "$SLOTS")")
show_response "$RESP"

# TEST 10: Unknown intent (fallback path)
# ─────────────────────────────────────────────────────────────────────────────
header "10 / Unknown intent  (fallback path)"
RESP=$(alexa_post "$(make_intent "SomeRandomIntent")")
show_response "$RESP"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 11: SessionEndedRequest — must return {"version":"1.0","response":{}}
# ─────────────────────────────────────────────────────────────────────────────
header "11 / SessionEndedRequest  (must return empty response body)"
RESP=$(alexa_post "$(make_session_ended)")
echo "  RAW: $RESP"
echo "$RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d == {'version': '1.0', 'response': {}}, f'Unexpected: {d}'
print('  OK: empty response body as required')
" 2>/dev/null && ok "Correct" || fail "Unexpected response body"

# ─────────────────────────────────────────────────────────────────────────────
# TEST 12: Expired timestamp guard (replay-attack protection)
# ─────────────────────────────────────────────────────────────────────────────
header "12 / Expired timestamp  (replay-attack guard — must reject with 400)"
OLD_PAYLOAD=$(python3 - "$SKILL_ID" <<'PY'
import sys, json
skill_id = sys.argv[1]
print(json.dumps({
  "version": "1.0",
  "session": {
    "new": True,
    "sessionId": "expired-session",
    "application": {"applicationId": skill_id},
    "attributes": {},
    "user": {"userId": "test-user"}
  },
  "request": {
    "type": "LaunchRequest",
    "requestId": "expired-req",
    "timestamp": "2020-01-01T00:00:00Z",
    "locale": "en-IN"
  }
}))
PY
)
# Include test-secret so signature check passes and timestamp guard is reached
t12_extra_headers=()
if [ -n "$TEST_SECRET" ]; then t12_extra_headers=(-H "x-alexa-test-secret: $TEST_SECRET"); fi
RESP=$(curl -s -o - -w "\nHTTP_STATUS:%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  "${t12_extra_headers[@]}" \
  --data-raw "$OLD_PAYLOAD")
HTTP_CODE=$(echo "$RESP" | grep -oE "HTTP_STATUS:[0-9]+" | cut -d: -f2)
BODY=$(echo "$RESP" | grep -v "HTTP_STATUS")
echo "  HTTP $HTTP_CODE — $BODY"
[ "$HTTP_CODE" = "400" ] && ok "Correctly rejected (400)" || fail "Expected 400, got $HTTP_CODE"

# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
ok "All tests complete."
echo ""
echo -e "${YELLOW}Notes:${NC}"
echo -e "  • Tests 1–3 query Supabase → 'No X menu set' is expected until menus are seeded."
echo -e "  • Test 6 calls Gemini and inserts into grocery_alerts — verify in Supabase."
echo -e "  • In production, ${CYAN}x-alexa-test-secret${NC} header bypasses Alexa signature verification."
echo -e "    Real Alexa device requests are always fully verified."
echo -e ""
echo -e "  ${YELLOW}Production URL (already deployed):${NC}"
echo -e "    Alexa endpoint → ${CYAN}https://aaram-smart-homes.vercel.app/api/alexa${NC}"
echo -e "    Test against it → ${CYAN}./scripts/test-alexa.sh https://aaram-smart-homes.vercel.app${NC}"
echo -e ""
echo -e "  ${YELLOW}Alexa Developer Console setup:${NC}"
echo -e "    Build → Endpoint → HTTPS → Default Region:"
echo -e "    ${CYAN}https://aaram-smart-homes.vercel.app/api/alexa${NC}"
echo -e "    SSL cert: 'My development endpoint has a certificate from a trusted CA'"
echo ""
