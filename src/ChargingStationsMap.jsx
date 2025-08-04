import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons for Leaflet in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API_URL = "https://api.openchargemap.io/v3/poi/";
const API_KEY = import.meta.env.VITE_OPENCHARGEMAP_KEY;

export default function ChargingStationsMap() {
  const [stations, setStations] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    const params = new URLSearchParams({
      key: API_KEY,
      countrycode: "CA",
      latitude: 53.9333,
      longitude: -116.5765,
      distance: 1000,
      distanceunit: "KM",
      maxresults: 2000,
    });
    const res = await fetch(`${API_URL}?${params.toString()}`);
    const data = await res.json();
    setStations(data);
  };

  const filterByDate = (station) => {
    if (!startDate && !endDate) return true;
    const dateField = station.DateLastStatusUpdate || station.DateCreated;
    if (!dateField) return false;
    const d = new Date(dateField);
    return (
      (!startDate || d >= new Date(startDate)) &&
      (!endDate || d <= new Date(endDate))
    );
  };

  const provinces = ["AB", "BC", "SK"];
  const filteredStations = stations.filter(
    (s) => provinces.includes(s.AddressInfo?.StateOrProvince) && filterByDate(s)
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {/* Date Filters */}
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
      </div>

      {/* Map */}
      <MapContainer
        center={[53.9333, -116.5765]}
        zoom={5}
        style={{ width: "100%", height: "90%" }}
      >
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
          >
            <Popup>
              <strong>{station.AddressInfo.Title}</strong>
              <br />
              {station.AddressInfo.AddressLine1}
              <br />
              {station.AddressInfo.Town},{" "}
              {station.AddressInfo.StateOrProvince}
              <br />
              Updated: {station.DateLastStatusUpdate}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
