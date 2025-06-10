import React, { useState, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  Polyline,
  Marker,
  Popup,
  useMapEvent,
} from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import fetchRoute from "./utils/fetchRoute";
import fetchOptimizedRoute from "./utils/fetchOptimizedRoute";
import fetchEVStations from "./utils/fetchEVStations";
import fetchTrafficHeat from "./utils/fetchTrafficHeat";
import "leaflet.heat";

// Fix default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Custom marker icons
const startIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const endIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const waypointIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const evStationIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MapController = ({ coords }) => {
  const map = useMap();
  map.setView(coords, 14);
  return null;
};

const ClickHandler = ({ setStart, setEnd, setWaypoints, start, end }) => {
  useMapEvent("click", ({ latlng }) => {
    const point = [latlng.lat, latlng.lng];
    if (!start) setStart(point);
    else if (!end) setEnd(point);
    else setWaypoints((prev) => [...prev, point]);
  });
  return null;
};

const getBoundsFromCoords = (coords, padding = 0.05) => {
  const lats = coords.map(c => c[0]);
  const lngs = coords.map(c => c[1]);
  return {
    minLat: Math.min(...lats) - padding,
    maxLat: Math.max(...lats) + padding,
    minLng: Math.min(...lngs) - padding,
    maxLng: Math.max(...lngs) + padding,
  };
};

const MapHeatLayer = ({ data, heatLayerRef }) => {
  const map = useMap();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const heatData = data.map(seg => {
      const lat = seg.flowSegmentData.coordinate.latitude;
      const lng = seg.flowSegmentData.coordinate.longitude;
      const speed = seg.flowSegmentData.currentSpeed;
      const freeFlow = seg.flowSegmentData.freeFlowSpeed;
      const intensity = Math.max(0.2, Math.min(1, speed / freeFlow));
      return [lat, lng, intensity];
    });

    if (heatLayerRef.current) {
      heatLayerRef.current.setLatLngs(heatData);
    } else {
      const layer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: { 0.4: "blue", 0.65: "lime", 1: "red" },
      }).addTo(map);
      heatLayerRef.current = layer;
    }

    return () => {
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }
    };
  }, [data, map, heatLayerRef]);

  return null;
};

const MapView = () => {
  const API_KEY = process.env.REACT_APP_TOMTOM_API_KEY;
  const inputRef = useRef();

  const [center, setCenter] = useState([40.7128, -74.006]); // NYC
  const [query, setQuery] = useState("");
  const [showTraffic, setShowTraffic] = useState(false);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [routeInfo, setRouteInfo] = useState({ dist: null, time: null });
  const [optInfo, setOptInfo] = useState({ dist: null, time: null });
  const [evStations, setEvStations] = useState([]);
  const [trafficHeatData, setTrafficHeatData] = useState(null);
  const heatLayerRef = useRef(null);

  const handleSearch = async () => {
    if (!query) return;
    try {
      const res = await axios.get(
        `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json`,
        { params: { key: API_KEY } }
      );
      const pos = res.data.results[0]?.position;
      if (pos) {
        const latlng = [pos.lat, pos.lon];
        if (!start) setStart(latlng);
        else if (!end) setEnd(latlng);
        else setWaypoints(prev => [...prev, latlng]);
        setCenter(latlng);
        setQuery("");
      } else alert("Location not found");
    } catch (err) {
      console.error("Search failed", err);
      alert("Search error");
    }
  };

  const handleRoute = async () => {
    if (!start || !end) return alert("Set start and end points");
    try {
      const data = await fetchRoute(
        { lat: start[0], lng: start[1] },
        { lat: end[0], lng: end[1] },
        API_KEY
      );
      const points = data.points.map(p => [p.latitude, p.longitude]);
      setRouteCoords(points);
      setRouteInfo({
        dist: data.summary.lengthInMeters,
        time: data.summary.travelTimeInSeconds,
      });
      const bounds = getBoundsFromCoords(points);
      const stations = await fetchEVStations(bounds, API_KEY);
      setEvStations(stations);
      const heatData = await fetchTrafficHeat(bounds, API_KEY);
      setTrafficHeatData(heatData);
    } catch (err) {
      console.error("Route fetch failed", err);
      alert("Route error");
    }
  };

  const handleOptimizeRoute = async () => {
    if (waypoints.length < 2) return alert("Add 2+ waypoints");
    try {
      const route = await fetchOptimizedRoute(waypoints, API_KEY);
      const points = route.legs.flatMap(leg => leg.points.map(p => [p.latitude, p.longitude]));
      setOptimizedRoute(points);
      setOptInfo({
        dist: route.summary.lengthInMeters,
        time: route.summary.travelTimeInSeconds,
      });
    } catch (err) {
      console.error("Optimization failed", err);
      alert("Optimization error");
    }
  };

  const handleHeatMap = async () => {
    if (showHeatMap) {
      setShowHeatMap(false);
      return;
    }
    
    try {
      // Get current map bounds or use a default area
      let bounds;
      
      if (start && end) {
        // If we have start/end points, use those bounds
        bounds = getBoundsFromCoords([start, end]);
      } else {
        // Otherwise use current map center area
        bounds = {
          minLat: center[0] - 0.05,
          maxLat: center[0] + 0.05,
          minLng: center[1] - 0.05,
          maxLng: center[1] + 0.05,
        };
      }
      
      console.log("Fetching heat map data for bounds:", bounds);
      const heatData = await fetchTrafficHeat(bounds, API_KEY);
      console.log("Heat map data received:", heatData);
      setTrafficHeatData(heatData);
      setShowHeatMap(true);
    } catch (err) {
      console.error("Heat map fetch failed", err);
      alert("Heat map error: " + err.message);
    }
  };

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      <div style={{
        position: "absolute", top: 10, left: 10, zIndex: 1000,
        background: "white", padding: 10, borderRadius: 8, boxShadow: "0 0 8px rgba(0,0,0,0.2)"
      }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: "8px", fontSize: "14px", marginRight: "5px" }}
        />
        <button onClick={handleSearch} style={{ padding: "8px", marginRight: "5px" }}>Search</button>
        <button onClick={handleRoute} style={{ padding: "8px", marginRight: "5px" }}>Get Route</button>
        <button onClick={() => setShowTraffic(!showTraffic)} style={{ padding: "8px", marginRight: "5px" }}>
          {showTraffic ? "Hide Traffic" : "Show Traffic"}
        </button>
        <button onClick={handleHeatMap} style={{ padding: "8px", marginRight: "5px" }}>
          {showHeatMap ? "Hide Heat Map" : "Fetch Heat Map"}
        </button>
        <button onClick={handleOptimizeRoute} style={{ padding: "8px" }}>Optimize Route</button>

        {routeInfo.dist && (
          <div style={{ fontSize: "14px", marginTop: "8px" }}>
            <p><strong>Distance:</strong> {(routeInfo.dist / 1000).toFixed(2)} km</p>
            <p><strong>Time:</strong> {(routeInfo.time / 60).toFixed(1)} min</p>
          </div>
        )}
        {optInfo.dist && (
          <div style={{ fontSize: "14px", marginTop: "8px" }}>
            <p><strong>Optimized Distance:</strong> {(optInfo.dist / 1000).toFixed(2)} km</p>
            <p><strong>Optimized Time:</strong> {(optInfo.time / 60).toFixed(1)} min</p>
          </div>
        )}
      </div>

      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${API_KEY}`}
          attribution="© TomTom"
        />
        {showTraffic && (
          <TileLayer
            url={`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${API_KEY}`}
            attribution="Traffic © TomTom"
          />
        )}
        <ClickHandler {...{ setStart, setEnd, setWaypoints, start, end }} />
        {start && (
          <Marker position={start} icon={startIcon}>
            <Popup>Start</Popup>
          </Marker>
        )}
        {end && (
          <Marker position={end} icon={endIcon}>
            <Popup>End</Popup>
          </Marker>
        )}
        {waypoints.map((pos, i) => (
          <Marker key={i} position={pos} icon={waypointIcon}>
            <Popup>Waypoint {i + 1}</Popup>
          </Marker>
        ))}
        {routeCoords.length > 0 && (
          <Polyline positions={routeCoords} color="blue" weight={5} />
        )}
        {optimizedRoute.length > 0 && (
          <Polyline positions={optimizedRoute} color="green" weight={5} />
        )}
        {evStations.map((station, i) => (
          <Marker key={`ev-${i}`} position={[station.lat, station.lng]} icon={evStationIcon}>
            <Popup>{station.name}</Popup>
          </Marker>
        ))}
        <MapController coords={center} />
        {showHeatMap && (
          <MapHeatLayer data={trafficHeatData} heatLayerRef={heatLayerRef} />
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;