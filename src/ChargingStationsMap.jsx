import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API_URL = "https://api.openchargemap.io/v3/poi/";
const API_KEY = import.meta.env.VITE_OPENCHARGEMAP_KEY;
const DUPLICATE_DISTANCE_METERS = 100;
const STRICT_DISTANCE_METERS = 10;

export default function ChargingStationsMap() {
  const [stations, setStations] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duplicateMode, setDuplicateMode] = useState("include"); // include | earliest | latest

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    const params = new URLSearchParams({
      key: API_KEY,
      countrycode: "CA",
      latitude: 53.9333,
      longitude: -116.5765,
      distance: 2000,
      distanceunit: "KM",
      maxresults: 4000,
    });
    const res = await fetch(`${API_URL}?${params.toString()}`);
    const data = await res.json();
    console.log("Fetched stations:", data.length);
    setStations(data);
  };

  // Normalize title for duplicate comparison
  const normalizeTitle = (title) =>
    title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

  // Haversine formula for distance in meters
  const haversine = (lat1, lon1, lat2, lon2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Group duplicates: within 10m → always duplicates; within 100m → only if titles match
  const groupDuplicates = (stations) => {
    const groups = [];
    const visited = new Set();

    for (let i = 0; i < stations.length; i++) {
      if (visited.has(stations[i].ID)) continue;
      const group = [stations[i]];
      visited.add(stations[i].ID);

      for (let j = i + 1; j < stations.length; j++) {
        if (visited.has(stations[j].ID)) continue;

        const d = haversine(
          stations[i].AddressInfo.Latitude,
          stations[i].AddressInfo.Longitude,
          stations[j].AddressInfo.Latitude,
          stations[j].AddressInfo.Longitude
        );

        const titlesMatch =
          normalizeTitle(stations[i].AddressInfo.Title) ===
          normalizeTitle(stations[j].AddressInfo.Title);

        if (d <= STRICT_DISTANCE_METERS || (d <= DUPLICATE_DISTANCE_METERS && titlesMatch)) {
          group.push(stations[j]);
          visited.add(stations[j].ID);
        }
      }
      groups.push(group);
    }

    return groups;
  };

  // Duplicate handling based on dropdown
  const selectDuplicateRepresentative = (group) => {
    if (duplicateMode === "include") return group;
    if (duplicateMode === "earliest") {
      return [
        group.reduce((earliest, s) =>
          new Date(s.DateCreated) < new Date(earliest.DateCreated) ? s : earliest
        ),
      ];
    }
    if (duplicateMode === "latest") {
      return [
        group.reduce((latest, s) =>
          new Date(s.DateCreated) > new Date(latest.DateCreated) ? s : latest
        ),
      ];
    }
    return group;
  };

  // Date filter
  const dateFilter = (station) => {
    if (!startDate && !endDate) return true;
    const d = new Date(station.DateCreated || station.DateLastStatusUpdate);
    return (
      (!startDate || d >= new Date(startDate)) &&
      (!endDate || d <= new Date(endDate))
    );
  };

  // Apply grouping & filtering
  const groups = groupDuplicates(stations);
  const filteredGroups = groups
    .map((g) => selectDuplicateRepresentative(g))
    .map((g) => g.filter(dateFilter))
    .filter((g) => g.length > 0);

  // Open API JSON in popup window
  const openStationJSON = (id) => {
    const url = `${API_URL}?key=${API_KEY}&chargepointid=${id}`;
    window.open(url, "_blank", "width=800,height=600,scrollbars=yes,resizable=yes");
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {/* Filters */}
      <div style={{ padding: "10px", background: "#f8f8f8" }}>
        <label>Start Date:</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <label style={{ marginLeft: "10px" }}>End Date:</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

        <label style={{ marginLeft: "10px" }}>Duplicates:</label>
        <select value={duplicateMode} onChange={(e) => setDuplicateMode(e.target.value)}>
          <option value="include">Include duplicates</option>
          <option value="earliest">Earliest duplicate</option>
          <option value="latest">Latest duplicate</option>
        </select>
      </div>

      {/* Map */}
      <MapContainer center={[53.9333, -116.5765]} zoom={5} style={{ width: "100%", height: "90%" }}>
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {filteredGroups.map((group, idx) => {
          const main = group[0];
          return (
            <Marker key={idx} position={[main.AddressInfo.Latitude, main.AddressInfo.Longitude]}>
              <Popup>
                <strong>{main.AddressInfo.Title}</strong>
                <br />
                {main.AddressInfo.AddressLine1}, {main.AddressInfo.Town}, {main.AddressInfo.StateOrProvince}
                <br />
                <strong>DateCreated:</strong> {main.DateCreated}
                {group.length > 1 && (
                  <div style={{ marginTop: "5px" }}>
                    <em>{group.length} entries found:</em>
                    <ul>
                      {group.map((s) => (
                        <li key={s.ID}>
                          ID#{s.ID} – Created: {s.DateCreated}{" "}
                          <button onClick={() => openStationJSON(s.ID)}>View JSON</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {group.length === 1 && (
                  <div style={{ marginTop: "5px" }}>
                    <button onClick={() => openStationJSON(main.ID)}>View JSON</button>
                  </div>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
