#!/usr/bin/env bash

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Verify required env vars
for var in VITE_OPENCHARGEMAP_KEY HOME_LAT HOME_LON MIN_DISTANCE MAX_DISTANCE DAYS_AGO; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing environment variable: $var"
    exit 1
  fi
done

API_KEY="$VITE_OPENCHARGEMAP_KEY"
API_URL="https://api.openchargemap.io/v3/poi/"

# --- Fetch data ---
echo "📡 Fetching chargers within $MAX_DISTANCE km of home ($HOME_LAT,$HOME_LON)..."
RAW_JSON=$(curl -s "${API_URL}?key=${API_KEY}&latitude=${HOME_LAT}&longitude=${HOME_LON}&distance=${MAX_DISTANCE}&distanceunit=KM&maxresults=5000")

TOTAL=$(echo "$RAW_JSON" | jq 'length')
echo "✅ API returned $TOTAL total stations"

# --- Extract ID + coordinates for distance calculation ---
TMP_COORDS=$(mktemp)
echo "$RAW_JSON" | jq -r '.[] | [.ID, .AddressInfo.Latitude, .AddressInfo.Longitude] | @tsv' > "$TMP_COORDS"

# --- Compute haversine distances using gawk ---
TMP_DIST=$(mktemp)
gawk -v lat1="$HOME_LAT" -v lon1="$HOME_LON" '
  function rad(x){ return x*3.141592653589793/180 }
  function haversine(lat2, lon2){
    R=6371
    dLat=rad(lat2-lat1)
    dLon=rad(lon2-lon1)
    a=sin(dLat/2)^2 + cos(rad(lat1))*cos(rad(lat2))*sin(dLon/2)^2
    return 2*R*atan2(sqrt(a), sqrt(1-a))
  }
  { if ($2 != "" && $3 != "") print $1, haversine($2, $3) }
' "$TMP_COORDS" > "$TMP_DIST"

# --- Convert distance data to JSON ---
DIST_JSON=$(jq -Rn '[inputs | split(" ") | {key: .[0], value: .[1]|tonumber}]' < "$TMP_DIST")

# --- Merge calculated distances into original JSON ---
MERGED_JSON=$(jq --argjson dist "$DIST_JSON" '
  ($dist | from_entries) as $lookup |
  map(. + {CalcDistance: ($lookup[.ID|tostring])})
' <<< "$RAW_JSON")

# --- STATISTICS ---
echo "📊 Calculating statistics on the raw dataset..."

echo "⚡ Charger LevelID counts:"
echo "$MERGED_JSON" | jq '[.[].Connections[].LevelID] | group_by(.) | map({LevelID: .[0], count: length})'

echo "📏 Distance stats (min, max, avg):"
echo "$MERGED_JSON" | jq '
  [.[].CalcDistance | select(. != null)] |
  if length == 0 then {min:null, max:null, avg:null}
  else {min:(min), max:(max), avg:(add/length)}
  end
'

echo "🗓 DateCreated range:"
echo "$MERGED_JSON" | jq '
  {earliest: (min_by(.DateCreated) | .DateCreated),
   latest:   (max_by(.DateCreated) | .DateCreated)}
'

# --- Filter for new fast chargers ---
CUTOFF=$(date -u -v-"${DAYS_AGO}"d +"%Y-%m-%dT%H:%M:%SZ")
echo "🔍 Filtering for fast chargers added since $CUTOFF..."

echo "$MERGED_JSON" | jq --arg cutoff "$CUTOFF" \
  --argjson min "$MIN_DISTANCE" \
  --argjson max "$MAX_DISTANCE" '
  map(
    select(.CalcDistance != null and .CalcDistance >= $min and .CalcDistance <= $max) |
    select(.Connections[]?.LevelID == 3) |
    select((.DateCreated | fromdateiso8601) >= ($cutoff | fromdateiso8601)) |
    {
      ID,
      Title: .AddressInfo.Title,
      Town: .AddressInfo.Town,
      Province: .AddressInfo.StateOrProvince,
      Distance_km: (.CalcDistance | round),
      MaxPower_kW: ([.Connections[]?.PowerKW] | max),
      ProviderURL: .AddressInfo.RelatedURL,
      OpenChargeMapURL: ("https://openchargemap.org/site/poi/details/" + (.ID|tostring)),
      DateCreated
    }
  )
'
