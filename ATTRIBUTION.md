# Ferrari asset provenance

- Model: Ferrari 458 Italia by vicent091036, as credited in the Three.js car materials example supplied by the user.
- Original creator: https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6
- Bundled model source: https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/ferrari.glb
- Example: https://threejs.org/examples/webgl_materials_car.html
- Three.js loaders, utilities and RoomEnvironment: r170, MIT (see vendor/THREE-LICENSE.txt). Relative import paths adapted for this project.
- Draco decoder: from the r170 example dependencies; Apache 2.0, included in vendor/draco/LICENSE.

The model is a third-party asset and is not original game artwork. The creator attribution appears in the in-game car customization panel. The original Sketchfab page was unavailable during integration; a separate model license could not be verified. The Three.js software license should not be interpreted as a new license grant for the model.

Integration changes: +Z driving orientation, front-wheel steering pivots, signed wheel animation, physical paint/glass materials, generated local reflection environment, seated avatar placement and headlights. No network connection is needed at runtime.
