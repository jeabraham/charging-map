import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { filterByDate } from "./dateFilter";

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API_URL = "https://api.openchargemap.io/v3/poi/";
const API_KEY = import.meta.env.VITE_OPENCHARGEMAP_KEY;

// ---------- MapEvents Component ----------
function MapEvents({ onMoveEnd }) {
  const map = useMap();

  useEffect(() => {
    console.log(
      "✅ Map created (React-Leaflet v5) – attaching moveend listener",
    );
    const handler = () => onMoveEnd(map);
    map.on("moveend", handler);
    return () => map.off("moveend", handler);
  }, [map, onMoveEnd]);

  return null;
}

// ---------- Duplicate Detection ----------
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const normalizeTitle = (t) => t?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";

// Group potential duplicates
function groupDuplicates(stations) {
  const groups = [];
  stations.forEach((s) => {
    const title = normalizeTitle(s.AddressInfo?.Title);
    const lat = s.AddressInfo?.Latitude;
    const lon = s.AddressInfo?.Longitude;

    let foundGroup = groups.find((g) =>
      g.some((x) => {
        const d = haversine(
          lat,
          lon,
          x.AddressInfo.Latitude,
          x.AddressInfo.Longitude,
        );
        return d < 10 || normalizeTitle(x.AddressInfo.Title) === title;
      }),
    );

    if (foundGroup) foundGroup.push(s);
    else groups.push([s]);
  });
  return groups;
}

// Pick earliest or latest based on DateCreated
const pickDuplicate = (group, mode) => {
  if (mode === "earliest") {
    return [...group].sort(
      (a, b) => new Date(a.DateCreated) - new Date(b.DateCreated),
    )[0];
  }
  if (mode === "latest") {
    return [...group].sort(
      (a, b) => new Date(b.DateCreated) - new Date(a.DateCreated),
    )[0];
  }
  return group[0];
};

// ---------- Main Component ----------
export default function ChargingStationsMap() {
  const [stations, setStations] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duplicateMode, setDuplicateMode] = useState("include");
  const fetchTimeout = useRef(null);

  // Initial fetch
  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async (opts) => {
    const params = new URLSearchParams({
      key: API_KEY,
      countrycode: "CA",
      distanceunit: "KM",
      maxresults: 2000,
    });

    if (opts?.center) {
      params.append("latitude", opts.center.lat);
      params.append("longitude", opts.center.lng);
      params.append("distance", Math.min(opts.radius, 500)); // limit to 500km
      console.log(
        `📡 Query with center (${opts.center.lat},${opts.center.lng}) and distance ${opts.radius.toFixed(2)} km`,
      );
    } else {
      params.append("latitude", 53.9333);
      params.append("longitude", -116.5765);
      params.append("distance", 1000);
      console.log("📡 Initial fetch using center point");
    }

    const res = await fetch(`${API_URL}?${params.toString()}`);
    const data = await res.json();
    console.log("✅ Fetched", data.length, "stations");
    setStations(data);
  };

  // Filter by date
  const passesDateFilter = (station) => {
    if (!startDate && !endDate) return true;
    const dateField = station.DateCreated || station.DateLastStatusUpdate;
    if (!dateField) return false;
    const d = new Date(dateField);
    return (
      (!startDate || d >= new Date(startDate)) &&
      (!endDate || d <= new Date(endDate))
    );
  };

  // Process duplicates
  const groups = groupDuplicates(stations);
  const provinces = ["AB", "BC", "SK"];
  let filteredStations = [];

  groups.forEach((group) => {
    const filteredGroup = group.filter(
      (s) =>
        provinces.includes(s.AddressInfo?.StateOrProvince) &&
        passesDateFilter(s),
    );

    if (filteredGroup.length > 0) {
      if (duplicateMode === "include") filteredStations.push(...filteredGroup);
      else filteredStations.push(pickDuplicate(filteredGroup, duplicateMode));
    }
  });

  // Right-click JSON popup
  const handleRightClick = async (station) => {
    try {
      const url = `${API_URL}?key=${API_KEY}&chargepointid=${station.ID}`;
      const res = await fetch(url);
      const data = await res.json();
      const jsonStr = JSON.stringify(data[0], null, 2);
      const win = window.open(
        "",
        "_blank",
        "width=600,height=800,scrollbars=yes",
      );
      win.document.write(`<pre>${jsonStr}</pre>`);
    } catch (err) {
      alert("Failed to fetch station details.");
    }
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {/* Filters */}
      <div style={{ padding: "10px", background: "#f8f8f8" }}>
        <label>Start Date:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <label style={{ marginLeft: "10px" }}>End Date:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <label style={{ marginLeft: "10px" }}>Duplicates:</label>
        <select
          value={duplicateMode}
          onChange={(e) => setDuplicateMode(e.target.value)}
        >
          <option value="include">Include Duplicates</option>
          <option value="earliest">Earliest Duplicate</option>
          <option value="latest">Latest Duplicate</option>
        </select>
      </div>

      {/* Map */}
      <MapContainer
        center={[53.9333, -116.5765]}
        zoom={5}
        style={{ width: "100%", height: "90%" }}
      >
        {/* ✅ MoveEnd Listener for React-Leaflet v5 */}
        <MapEvents
          onMoveEnd={(map) => {
            const bounds = map.getBounds();
            const center = bounds.getCenter();

            // Calculate approximate radius using SW corner
            const sw = bounds.getSouthWest();
            const radius = (() => {
              const R = 6371000;
              const toRad = (deg) => (deg * Math.PI) / 180;
              const dLat = toRad(center.lat - sw.lat);
              const dLon = toRad(center.lng - sw.lng);
              const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(toRad(center.lat)) *
                  Math.cos(toRad(sw.lat)) *
                  Math.sin(dLon / 2) ** 2;
              return (2 * R * Math.asin(Math.sqrt(a))) / 1000; // in km
            })();

            console.log(
              "📌 moveend fired – center:",
              center,
              "radius:",
              radius.toFixed(2),
              "km",
            );

            if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
            fetchTimeout.current = setTimeout(() => {
              console.log("📡 Fetching stations for center + radius");
              fetchStations({ center, radius });
            }, 500);
          }}
        />

        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {filteredStations.map((station) => (
          <Marker
            key={station.ID}
            position={[
              station.AddressInfo.Latitude,
              station.AddressInfo.Longitude,
            ]}
            eventHandlers={{ contextmenu: () => handleRightClick(station) }}
          >
            <Popup>
              <strong>{station.AddressInfo.Title}</strong>
              <br />
              {station.AddressInfo.AddressLine1}
              <br />
              {station.AddressInfo.Town}, {station.AddressInfo.StateOrProvince}
              <br />
              Created: {station.DateCreated}
              <br />
              Updated: {station.DateLastStatusUpdate}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
