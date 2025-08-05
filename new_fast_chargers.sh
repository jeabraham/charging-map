#!/usr/bin/env bash

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

for var in VITE_OPENCHARGEMAP_KEY HOME_LAT HOME_LON MIN_DISTANCE MAX_DISTANCE DAYS_AGO; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing environment variable: $var"
    exit 1
  fi
done

API_KEY="$VITE_OPENCHARGEMAP_KEY"
API_URL="https://api.openchargemap.io/v3/poi/"

echo "📡 Fetching chargers within $MAX_DISTANCE km of home ($HOME_LAT,$HOME_LON)..."
DATA=$(curl -s "${API_URL}?key=${API_KEY}&latitude=${HOME_LAT}&longitude=${HOME_LON}&distance=${MAX_DISTANCE}&distanceunit=KM&maxresults=5000")

TOTAL=$(echo "$DATA" | jq 'length')
echo "✅ API returned $TOTAL total stations"

# --- Manual sqrt and distance formula ---
HAVERSINE='
def rad($d): $d * (3.141592653589793 / 180);
def sqrt($x):
  if $x <= 0 then 0
  else
    reduce range(0;10) as $i ( $x/2 ; . - ((. * .) - $x) / (2 * .) )
  end;
def dist($lat1; $lon1; $lat2; $lon2):
  if ($lat2 == null or $lon2 == null) then null else
    sqrt(
      (6371 * 6371) *
      (
        ((rad($lat2 - $lat1))) * ((rad($lat2 - $lat1))) +
        ((cos(rad((($lat1 + $lat2)/2))) *
          (rad($lon2 - $lon1)))) *
        ((cos(rad((($lat1 + $lat2)/2))) *
          (rad($lon2 - $lon1))))
      )
    )
  end;
'

DATA=$(echo "$DATA" | jq --argjson lat $HOME_LAT --argjson lon $HOME_LON \
  "$HAVERSINE map(. + {CalcDistance: dist(\$lat; \$lon; .AddressInfo.Latitude; .AddressInfo.Longitude)})")

echo "📊 Calculating statistics on the raw dataset..."
echo "⚡ Charger LevelID counts:"
echo "$DATA" | jq '[.[].Connections[].LevelID] | group_by(.) | map({LevelID: .[0], count: length})'

echo "📏 Distance stats (min, max, avg) based on calculated distance:"
echo "$DATA" | jq '
  [.[].CalcDistance | select(. != null)] |
  if length == 0 then
    {min: null, max: null, avg: null}
  else
    {min: (min), max: (max), avg: (add/length)}
  end
'

echo "🗓 DateCreated range:"
echo "$DATA" | jq '[.[].DateCreated | select(.) | fromdateiso8601] | {earliest:(min | todate), latest:(max | todate)}'

CUTOFF=$(date -u -v-"${DAYS_AGO}"d +"%Y-%m-%dT%H:%M:%SZ")
echo "🔍 Filtering for fast chargers added since $CUTOFF..."

echo "$DATA" | jq --arg cutoff "$CUTOFF" \
  --argjson min "$MIN_DISTANCE" \
  --argjson max "$MAX_DISTANCE" '
  map(
    select(.CalcDistance != null and .CalcDistance >= $min and .CalcDistance <= $max) |
    select(.Connections[]?.LevelID == 3) |
    select(.DateCreated >= $cutoff) |
    {
      ID,
      Title: .AddressInfo.Title,
      Town: .AddressInfo.Town,
      Province: .AddressInfo.StateOrProvince,
      Distance_km: (.CalcDistance | round),
      MaxPower_kW: ([.Connections[]?.PowerKW] | max),
      DateCreated,
      ProviderURL: .AddressInfo.RelatedURL,
      OpenChargeMapURL: ("https://openchargemap.org/site/poi/details/" + (.ID|tostring))
    }
  )
'
