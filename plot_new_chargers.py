#!/usr/bin/env python3
import json
import pandas as pd
import matplotlib.pyplot as plt
import contextily as ctx
import geopandas as gpd
from shapely.geometry import Point

# Load chargers
with open("new_chargers.json", "r") as f:
    chargers = json.load(f)

df = pd.DataFrame(chargers)

# Convert to GeoDataFrame
gdf = gpd.GeoDataFrame(
    df,
    geometry=[Point(xy) for xy in zip(df.Longitude, df.Latitude)],
    crs="EPSG:4326"
)
gdf = gdf.to_crs(epsg=3857)  # Web Mercator projection

# Plot
fig, ax = plt.subplots(figsize=(10, 8))
gdf.plot(ax=ax, color="red", markersize=40)

# Set bounds to the data extent
ax.set_xlim(gdf.total_bounds[0] - 50000, gdf.total_bounds[2] + 50000)
ax.set_ylim(gdf.total_bounds[1] - 50000, gdf.total_bounds[3] + 50000)

# ✅ Add OSM basemap
ctx.add_basemap(ax, source=ctx.providers.OpenStreetMap.Mapnik)

ax.set_axis_off()
plt.title("New Fast Chargers (OpenChargeMap)")
plt.tight_layout()
plt.savefig("new_chargers_map.png", dpi=200)
plt.show()
