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
|      ENC Runtime      |   ← Core
|  - Map Tile Manager   |
|  - CSP & LUP          |
|  - Feature Interpreter|
|  - Symbol Renderer    |
|  - Context Manager    |
+---------+-------------+
          |
     MBTiles Source
```
