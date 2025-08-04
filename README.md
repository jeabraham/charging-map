# 📌 Charging Stations Map

This project is a **React + Vite** application that displays electric vehicle charging stations in **Alberta, British Columbia, and Saskatchewan** using the [OpenChargeMap API](https://openchargemap.org/site/develop/api).  

It features an **interactive Leaflet map** with markers and supports **filtering stations by date**.

---

## 🚀 Features
- ✅ Interactive map using **React Leaflet**
- ✅ Fetches live data from **OpenChargeMap API**
- ✅ Filters stations by **start/end date**
- ✅ Focuses on **Alberta (AB)**, **British Columbia (BC)**, and **Saskatchewan (SK)**

---

## 📦 Requirements
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/)

---

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/charging-map.git
   cd charging-map
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Add your OpenChargeMap API key:**
   - Open `src/ChargingStationsMap.jsx`
   - Replace `YOUR_API_KEY_HERE` with your key  
   *(or use an `.env` file, see below)*

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app** in your browser at:
   ```
   http://localhost:5173
   ```

---

## 🔑 Optional: Use an `.env` file for your API key

Instead of hardcoding your API key, create a `.env` file in the project root:

```env
VITE_OPENCHARGEMAP_KEY=your_api_key_here
```

Then, in `ChargingStationsMap.jsx` use:

```javascript
const API_KEY = import.meta.env.VITE_OPENCHARGEMAP_KEY;
```

---

## 📚 Dependencies
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [React Leaflet](https://react-leaflet.js.org/)
- [Leaflet](https://leafletjs.com/)

---

## ✅ Future Improvements
- 🔒 Secure API key via backend proxy
- 🗺️ Add clustering for better map performance
- 📅 Multiple date field filtering (created, updated, last checked)

---

## 📄 License
This project is open-source and available under the **MIT License**.
