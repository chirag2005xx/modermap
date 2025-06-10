import axios from "axios";

export const fetchMatrixRoute = async (origins, destinations, apiKey) => {
  // origins and destinations are arrays of { lat, lng }
  const originsParam = origins.map(o => `${o.lat},${o.lng}`).join(":");
  const destinationsParam = destinations.map(d => `${d.lat},${d.lng}`).join(":");

  const url = `https://api.tomtom.com/routing/1/matrix/sync/json`;

  const body = {
    origins: origins.map(o => ({ lat: o.lat, lon: o.lng })),
    destinations: destinations.map(d => ({ lat: d.lat, lon: d.lng })),
    metrics: ["travelTimes", "distances"],
    computeTravelTimeFor: ["allRoutes"]
  };

  try {
    const response = await axios.post(`${url}?key=${apiKey}`, body);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
};
