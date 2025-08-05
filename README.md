# 📌 Charging Stations Map

This project is a **React + Vite** application that displays electric vehicle charging stations in **Alberta, British Columbia, and Saskatchewan** using the [OpenChargeMap API](https://openchargemap.org/site/develop/api).  

It also includes **bash scripts** and **Python utilities** for analyzing new fast chargers and generating static maps.

---

## 🚀 Features
- ✅ Interactive map using **React Leaflet**
- ✅ Duplicate detection and handling (earliest/latest selection)
- ✅ Filters stations by **start/end date**
- ✅ Dynamic bounding box re-query when panning/zooming
- ✅ Right-click to open detailed JSON for any station
- ✅ Bash script to report new fast chargers within a configurable distance
- ✅ Python script to generate a static map image of new chargers with an OpenStreetMap basemap

---

## 🍎 macOS Installation Guide

The project requires a **frontend environment** (Node.js, npm), **command-line utilities** (`jq`, `gawk`), and **Python packages** for generating static maps.

### 1. Install Homebrew (if not installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install CLI Dependencies

```bash
brew install jq gawk node python
```

- `jq` – lightweight JSON processor
- `gawk` – for Haversine distance calculations
- `node` – required for running the React app
- `python` – used for static map generation

### 3. Set Up Node.js and React App

```bash
git clone git@github.com:jeabraham/charging-map.git
cd charging-map
npm install
```

### 4. Set Up Environment Variables

Create a `.env` file in the project root:

```env
VITE_OPENCHARGEMAP_KEY=your_api_key_here
HOME_LAT=51.062561
HOME_LON=-114.078868
MIN_DISTANCE=150
MAX_DISTANCE=600
DAYS_AGO=7
```

### 5. Install Python Virtual Environment & Packages (for map generation)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

`requirements.txt` should include:

```
pandas
geopandas
matplotlib
contextily
shapely
```

### 6. Verify Installation

```bash
node -v       # should print Node.js version
jq --version  # should print jq version
gawk --version # should print GNU Awk version
python3 --version # should print Python 3 version
```

---

## 🛠️ Usage

### Run the Interactive Map
```bash
npm run dev
```
Open in your browser at: [http://localhost:5173](http://localhost:5173)

### Generate Weekly Report of New Fast Chargers
```bash
./new_fast_chargers.sh
```
Outputs a filtered JSON list to `new_chargers.json`.

### Generate Static Map from New Chargers JSON
```bash
source venv/bin/activate
python plot_new_chargers.py
```
Creates `new_chargers_map.png` with OpenStreetMap basemap and charger markers.

---

## 📚 Dependencies
- **Frontend:** React, Vite, React Leaflet, Leaflet
- **CLI:** jq, gawk
- **Python:** pandas, geopandas, matplotlib, contextily, shapely

---

## ✅ Future Improvements
- 🔒 Secure API key via backend proxy
- 🗺️ Marker clustering for improved performance
- 📅 Multiple date field filtering (created, updated, last checked)
- 🖼️ Advanced map styling with legends and interactive HTML export

---

## 📄 License
This project is open-source and available under the **MIT License**.
