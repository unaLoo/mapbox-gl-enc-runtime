# mapbox-gl-enc-runtime

Mapbox-gl Electronic Navigational Chart Runtime，在 mapbox-gl 之上实现的兼容矢量瓦片标准的涉海用图符号渲染引擎。

## Framework

```
+---------------------+
|       MapboxGL      |     ← Camera、Interaction、Projection
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
