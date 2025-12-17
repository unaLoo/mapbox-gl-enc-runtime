# mapbox-gl-enc-runtime

Mapbox-gl Electronic Navigational Chart Runtime

## Framework

```
+---------------------+
|       MapboxGL      |      ← Camera、Interaction、gl
+---------+-----------+
          |
     Custom Layer
          |
+---------v--------------+
|      ENC Runtime       |   ← Core
|  - Tile Manager        |
|  - S52 LUP & CSP       |
|  - Feature Interpreter |
|  - Context Manager     |
+---------+--------------+
          |
     MBTiles Source
```
