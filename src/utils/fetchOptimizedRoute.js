
import axios from 'axios';

const fetchOptimizedRoute = async (waypoints, apiKey) => {
  if (waypoints.length < 2) throw new Error("At least two waypoints required");

  const locations = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(':');

  const url = `https://api.tomtom.com/routing/1/waypoint-optimization/${locations}/json`;

  const response = await axios.get(url, {
    params: {
      key: apiKey,
      travelMode: 'car',
      optimize: 'time:1'
    }
  });

  return response.data; // 🔁 Return entire response, not response.data.routes[0]
};

export default fetchOptimizedRoute;
