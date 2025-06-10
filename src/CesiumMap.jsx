import React from 'react';
import { Cartesian3, Color, CesiumTerrainProvider, IonResource, Ion, UrlTemplateImageryProvider } from 'cesium';
import { Viewer, Entity, CameraFlyTo } from 'resium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// Set your Cesium Ion token here
Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYWE4YzkwMi1iYzk4LTQwMTItOTA4ZC1jNDM3MGUyNGMzOTYiLCJpZCI6MzEwMzI1LCJpYXQiOjE3NDk0MTMwNjF9.yC7b9cIf0WzEpEufXPFsXRrcQ2evs0IDckn5Zxjt57A';

// Comment out the terrain provider for now - it might be causing issues
// const terrainProvider = new CesiumTerrainProvider({
//   url: IonResource.fromAssetId(1)
// });

// Try a different imagery provider that's more reliable
const imageryProvider = new UrlTemplateImageryProvider({
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  credit: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  maximumLevel: 19
});

const CesiumMap = () => {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Viewer
        full
        // terrainProvider={terrainProvider} // Commented out for now
        imageryProvider={imageryProvider}
        geocoder={true} // This adds back the search bar!
        baseLayerPicker={true}
        timeline={false}
        animation={false}
        homeButton={true}
        navigationHelpButton={false}
        sceneModePicker={false}
        vrButton={false}
        infoBox={false}
        selectionIndicator={false}
        shouldAnimate
        scene3DOnly={false} // Changed to false so you can switch to 2D if needed
      >
        <CameraFlyTo
          duration={3}
          destination={Cartesian3.fromDegrees(-74.006, 40.7128, 1500)} // NYC, 1500m height
        />
        <Entity
          name="New York"
          position={Cartesian3.fromDegrees(-74.006, 40.7128)}
          point={{ pixelSize: 10, color: Color.RED }}
        />
      </Viewer>
    </div>
  );
};

export default CesiumMap;