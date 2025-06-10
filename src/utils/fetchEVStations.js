import axios from "axios";
export default async function fetchEVStations(bounds, apiKey) {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const bboxString = `${minLng},${minLat},${maxLng},${maxLat}`;

  try {
    const response = await axios.get(
      "https://api.tomtom.com/search/2/poiSearch/chargingStation.json",
      {
        params: {
          key: apiKey,
          bbox: bboxString,
          limit: 100,
          categorySet: 7309,
          lat: (minLat + maxLat) / 2,
          lon: (minLng + maxLng) / 2,
          radius: 50000, // Optional: limit search radius
        },
      }
    );

    return response.data.results.map((res) => ({
      lat: res.position.lat,
      lng: res.position.lon,
      name: res.poi?.name || "EV Charging Station",
    }));
  } catch (error) {
    console.warn("⚠️ Failed to fetch EV stations:", error.message);
    return [];
  }
}
