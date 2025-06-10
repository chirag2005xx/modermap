import axios from "axios";

/**
 * Fetches a basic route between two coordinates using TomTom API
 * @param {{ lat: number, lng: number }} start - Starting coordinate
 * @param {{ lat: number, lng: number }} end - Ending coordinate
 * @param {string} apiKey - TomTom API key
 * @returns {Promise<Object>} Route data with points and summary
 */
const fetchRoute = async (start, end, apiKey) => {
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${start.lat},${start.lng}:${end.lat},${end.lng}/json`;

  const params = {
    key: apiKey,
    travelMode: "car",
    traffic: false,
    computeBestOrder: false,
    instructionsType: "text",
    routeType: "fastest",
    sectionType: "traffic",
  };

  try {
    const res = await axios.get(url, { params });
    const route = res.data.routes[0];

    return {
      points: route.legs.flatMap(leg =>
        leg.points.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
        }))
      ),
      summary: route.summary,
    };
  } catch (error) {
    console.error("Failed to fetch route:", error);
    throw error;
  }
};

export default fetchRoute;
