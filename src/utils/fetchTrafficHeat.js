import axios from "axios";

const fetchTrafficHeat = async (bounds, API_KEY) => {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const trafficData = [];

  // Calculate appropriate zoom level based on bounds size
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const zoom = Math.min(15, Math.max(10, Math.floor(Math.log2(1 / Math.max(latSpan, lngSpan)))));

  // Create a grid of tile coordinates
  const tiles = getTileCoordinates(bounds, zoom);
  
  console.log(`Fetching traffic data for ${tiles.length} tiles at zoom level ${zoom}`);

  // Add delay between requests to avoid rate limiting
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (const tile of tiles) {
    try {
      // Use Traffic Flow Tile API instead
      const tileUrl = `https://api.tomtom.com/traffic/map/4/tile/flow/absolute/${zoom}/${tile.x}/${tile.y}.png`;
      
      // For actual traffic data, use the Traffic API v4
      const res = await axios.get(
        "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json",
        {
          params: {
            bbox: `${tile.bounds.minLng},${tile.bounds.minLat},${tile.bounds.maxLng},${tile.bounds.maxLat}`,
            key: API_KEY,
            zoom: zoom,
            unit: "KMPH",
          },
          timeout: 10000,
        }
      );

      if (res.data && res.data.flowSegmentData) {
        trafficData.push({
          tile: tile,
          data: res.data.flowSegmentData,
          tileUrl: tileUrl
        });
      }
    } catch (err) {
      // Handle specific error cases
      if (err.response?.status === 400) {
        console.warn(`No traffic data available for tile ${tile.x},${tile.y}`);
        continue; // Skip this tile and continue
      }
      
      console.error(`Traffic data error for tile ${tile.x},${tile.y}:`, err.message);
      
      if (err.response?.status === 429) {
        console.log('Rate limited, waiting 2 seconds...');
        await delay(2000);
      } else if (err.response?.status === 403) {
        console.error('API key invalid or quota exceeded');
        break; // Stop processing if API key is invalid
      }
    }

    // Add delay between requests
    await delay(200);
  }

  console.log(`Successfully fetched traffic data for ${trafficData.length} tiles`);
  return trafficData;
};

// Alternative approach: Use point-based queries but only for road intersections
const fetchTrafficHeatAlternative = async (bounds, API_KEY) => {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const segments = [];

  // Use larger grid size and add road-detection logic
  const gridSize = 0.005; // Smaller grid for better coverage
  const maxRetries = 3;

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Pre-filter points that are likely to be on roads
  const roadPoints = await getRoadPoints(bounds, gridSize);

  console.log(`Checking ${roadPoints.length} potential road points`);

  for (const point of roadPoints) {
    let retries = 0;
    let success = false;

    while (retries < maxRetries && !success) {
      try {
        const res = await axios.get(
          "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json",
          {
            params: {
              point: `${point.lat},${point.lng}`,
              key: API_KEY,
              unit: "KMPH",
              openLr: false,
            },
            timeout: 8000,
          }
        );

        if (res.data?.flowSegmentData) {
          segments.push({
            ...res.data.flowSegmentData,
            lat: point.lat,
            lng: point.lng,
            coordinates: res.data.flowSegmentData.coordinates || []
          });
          success = true;
        }
      } catch (err) {
        if (err.response?.status === 400) {
          // Point not near road - skip it
          break;
        } else if (err.response?.status === 429) {
          console.log(`Rate limited, waiting ${(retries + 1) * 1000}ms...`);
          await delay((retries + 1) * 1000);
          retries++;
        } else if (err.response?.status === 403) {
          console.error('API authentication failed');
          return segments; // Return what we have so far
        } else {
          console.error(`Error for point ${point.lat},${point.lng}:`, err.message);
          break;
        }
      }

      if (!success) {
        await delay(150); // Base delay between requests
      }
    }
  }

  console.log(`Successfully fetched traffic data for ${segments.length} road segments`);
  return segments;
};

// Helper function to generate tile coordinates
function getTileCoordinates(bounds, zoom) {
  const tiles = [];
  const { minLat, maxLat, minLng, maxLng } = bounds;

  // Convert lat/lng bounds to tile coordinates
  const minTileX = Math.floor(lngToTileX(minLng, zoom));
  const maxTileX = Math.floor(lngToTileX(maxLng, zoom));
  const minTileY = Math.floor(latToTileY(maxLat, zoom)); // Note: Y is flipped
  const maxTileY = Math.floor(latToTileY(minLat, zoom));

  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      tiles.push({
        x,
        y,
        bounds: {
          minLat: tileYToLat(y + 1, zoom),
          maxLat: tileYToLat(y, zoom),
          minLng: tileXToLng(x, zoom),
          maxLng: tileXToLng(x + 1, zoom)
        }
      });
    }
  }

  return tiles;
}

// Helper functions for tile coordinate conversion
function lngToTileX(lng, zoom) {
  return (lng + 180) / 360 * Math.pow(2, zoom);
}

function latToTileY(lat, zoom) {
  return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
}

function tileXToLng(x, zoom) {
  return x / Math.pow(2, zoom) * 360 - 180;
}

function tileYToLat(y, zoom) {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// Helper function to get potential road points (simplified version)
async function getRoadPoints(bounds, gridSize) {
  const points = [];
  const { minLat, maxLat, minLng, maxLng } = bounds;

  // Generate a grid of points, but skip some to reduce API calls
  for (let lat = minLat; lat <= maxLat; lat += gridSize) {
    for (let lng = minLng; lng <= maxLng; lng += gridSize) {
      // Add some randomization to avoid perfect grid patterns
      const jitteredLat = lat + (Math.random() - 0.5) * gridSize * 0.3;
      const jitteredLng = lng + (Math.random() - 0.5) * gridSize * 0.3;
      
      points.push({
        lat: jitteredLat,
        lng: jitteredLng
      });
    }
  }

  // Limit the number of points to avoid overwhelming the API
  const maxPoints = 100;
  if (points.length > maxPoints) {
    // Randomly sample points
    const shuffled = points.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, maxPoints);
  }

  return points;
}

// Export both functions
export { fetchTrafficHeatAlternative };
export default fetchTrafficHeat;