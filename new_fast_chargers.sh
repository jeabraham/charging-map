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

# Fetch data
echo "📡 Fetching chargers within $MAX_DISTANCE km of home ($HOME_LAT,$HOME_LON)..."
DATA=$(curl -s "${API_URL}?key=${API_KEY}&latitude=${HOME_LAT}&longitude=${HOME_LON}&distance=${MAX_DISTANCE}&distanceunit=KM&maxresults=5000")

# Report total entries
TOTAL=$(echo "$DATA" | jq 'length')
echo "✅ API returned $TOTAL total stations"

# --- Manual sqrt approximation for old jq ---
# (Newton-Raphson iteration with 3 steps)
SQRT_FUNC='
def mysqrt($x):
  if $x <= 0 then 0
  else
    reduce range(0;3) as $i ( ($x/2); . - ((. * . - $x) / (2 * .)) )
  end;
'

# --- Distance calculation without trig ---
# Using rough scaling: 111 km per degree lat, 85 km per degree lon
DIST_FUNC='
def calc_distance($lat1; $lon1; $lat2; $lon2):
  if ($lat2 == null or $lon2 == null) then null
  else
    ((($lat2 - $lat1) * 111) as $dy |
     (($lon2 - $lon1) * 85) as $dx |
     mysqrt(($dx * $dx) + ($dy * $dy)))
  end;
'

# Inject calculated distance
DATA=$(echo "$DATA" | jq --argjson lat $HOME_LAT --argjson lon $HOME_LON \
  "$SQRT_FUNC $DIST_FUNC map(. + {CalcDistance: calc_distance(\$lat; \$lon; .AddressInfo.Latitude; .AddressInfo.Longitude)})")

# --- Statistics ---
echo "📊 Calculating statistics on raw dataset..."
echo "⚡ Charger LevelID counts:"
echo "$DATA" | jq '[.[].Connections[].LevelID] | group_by(.) | map({LevelID: .[0], count: length})'

echo "📏 Distance stats (min, max, avg) based on CalcDistance:"
echo "$DATA" | jq '
  [.[].CalcDistance | select(. != null)] |
  if length == 0 then {min: null, max: null, avg: null}
  else {min: (min), max: (max), avg: (add/length)}
  end
'

echo "🗓 DateCreated range:"
echo "$DATA" | jq '[.[].DateCreated | select(.) | fromdateiso8601] | {earliest:(min|todate), latest:(max|todate)}'

# --- Filter ---
CUTOFF=$(date -u -v-"${DAYS_AGO}"d +"%Y-%m-%dT%H:%M:%SZ")
echo "🔍 Filtering for fast chargers (Level 3) added since $CUTOFF, between $MIN_DISTANCE–$MAX_DISTANCE km..."

echo "$DATA" | jq --arg cutoff "$CUTOFF" \
  --argjson min "$MIN_DISTANCE" \
  --argjson max "$MAX_DISTANCE" '
  map(
    select(.CalcDistance != null and .CalcDistance >= $min and .CalcDistance <= $max) |
    select(any(.Connections[]?; .LevelID == 3)) |
    select(.DateCreated >= $cutoff) |
    {
      ID,
      Title: .AddressInfo.Title,
      Town: .AddressInfo.Town,
      Province: .AddressInfo.StateOrProvince,
      DateCreated,
      Distance_km: (.CalcDistance | round),
      MaxPower_kW: ([.Connections[]?.PowerKW | select(.)] | max // "unknown"),
      ProviderURL: (.AddressInfo.RelatedURL // "n/a"),
      OCM_URL: ("https://openchargemap.org/site/poi/details/\(.ID)")
    }
  )
'
