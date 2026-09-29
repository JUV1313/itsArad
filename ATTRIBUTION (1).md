# Data attribution and provenance

## OpenStreetMap

© OpenStreetMap contributors.

`arad-map.json` is an adapted OpenStreetMap database and is made available under the **Open Data Commons Open Database License (ODbL) 1.0**:
https://opendatacommons.org/licenses/odbl/1-0/

Attribution and copyright information: https://www.openstreetmap.org/copyright

Retrieved 2026-09-26 with a single map API request:
https://www.openstreetmap.org/api/0.6/map?bbox=35.175,31.230,35.252,31.285

Changes: selected ways and tagged nodes, projected WGS84 coordinates into an approximate local metre grid, removed unused tags, inferred missing building heights, retained source IDs and height provenance, and added five editorial destinations. The complete adapted database is included in this distribution. No OpenStreetMap rendered tile images were downloaded.

Projection origin: latitude 31.2588, longitude 35.213. Y/latitude scale 111320 metres/degree; longitude scale multiplied by cosine of the origin latitude. The world Z axis points south. Polygon holes and complex relation assemblies are not reconstructed.

## Elevation

Terrain Tiles was accessed on 2026-09-26 from https://registry.opendata.aws/terrain-tiles/ .

Mapzen terrain tiles. Global SRTM and GMTED2010 terrain data courtesy of the U.S. Geological Survey; global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration.

Full source attribution: https://github.com/tilezen/joerd/blob/master/docs/attribution.md
Format documentation: https://github.com/tilezen/joerd/blob/master/docs/formats.md

Source: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/{x}/{y}.png`
Tiles: x = 2447, 2448, 2449; y = 1672, 1673, 1674 (nine tiles).

Changes: Terrarium RGB decoded to metres; sampled to a 385 x 385 local grid over latitude 31.180–31.335 and longitude 35.130–35.330; rounded to 0.1 metres; triangulated for display. Approximately 45–50 metre grid spacing. A 500 metre reference offset is subtracted for rendering and restored for elevation labels. No vertical exaggeration. Changes are not endorsed by the source providers.

Download date does not represent the terrain survey acquisition date or a promise of survey accuracy. The source tiles are a composite DEM rather than a current cadastral or LiDAR survey.

## Rendering library

Three.js 0.170.0, MIT license. See `vendor/THREE-LICENSE.txt`.

Facilities: OpenStreetMap amenity=parking (38 ways, 4 nodes), amenity=fuel (6 nodes merged to 5 nearby POIs), leisure=swimming_pool (ways 178884131, 576473402, 576473417), and Country Club way 1557830347. Raw source retained in the development workspace; game stores projected geometry in arad-map.json. © OpenStreetMap contributors, ODbL. No satellite imagery is bundled. Parking stall layouts and street furniture are original illustrative geometry.
