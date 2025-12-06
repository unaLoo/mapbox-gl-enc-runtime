# mapbox-gl-enc-runtime

Mapbox-gl Electronic Navigational Chart Runtime

## Framework

```
+---------------------+
|       MapboxGL      |     ← Camera、Interaction
+---------+-----------+
          |
     Custom Layer
          |
+---------v-------------+
|     S-52 Runtime      |   ← Core
|  - Map Tile Manager   |
|  - Conditional Rules  |
|  - Feature Interpreter|
|  - Symbol Renderer    |
|  - Context Manager    |
+---------+-------------+
          |
     MBTiles Source
```
