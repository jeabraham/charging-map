#!/bin/bash

API_KEY="50b0888c-3b14-40c2-9979-5595f17aa137"
BASE_URL="https://api.openchargemap.io/v3/poi/"

ID1=234663
ID2=384705

# Detect terminal width for diff
WIDTH=${COLUMNS:-$(tput cols)}

# Fetch and pretty-print JSON (sorted keys to reduce noise)
echo "Fetching data for ID $ID1 and ID $ID2..."
curl -s "${BASE_URL}?key=${API_KEY}&output=json&id=${ID1}" | jq -S . > station_${ID1}.json
curl -s "${BASE_URL}?key=${API_KEY}&output=json&id=${ID2}" | jq -S . > station_${ID2}.json

# Optional: Add column headers
echo -e "\n=== Comparing station_${ID1}.json (LEFT) vs station_${ID2}.json (RIGHT) ===\n"

# Use colordiff if available, otherwise fallback
if command -v colordiff >/dev/null 2>&1; then
    diff -y --width=$WIDTH station_${ID1}.json station_${ID2}.json | colordiff | less -R
else
    diff -y --width=$WIDTH station_${ID1}.json station_${ID2}.json | less
fi
