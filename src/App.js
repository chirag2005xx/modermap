import React, { useState } from 'react';
import MapView from './MapView';
import CesiumMap from './CesiumMap';


function App() {
  const [showCesium, setShowCesium] = useState(false);

  return (
    <div>
      <button
        onClick={() => setShowCesium(!showCesium)}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 2000,
          padding: '10px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {showCesium ? "Show 2D Map" : "Show 3D Terrain"}
      </button>

      {showCesium ? <CesiumMap /> : <MapView />}
    </div>
  );
}

export default App;
