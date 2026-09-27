# Malles de referència exportades de Blender 5.2

Els tests de `src/apps/blender/modifiers/fixtures.test.ts` comparen els modificadors del lab
amb aquestes malles. Si un fitxer no hi és, el seu test se salta.

## Com s'exporten

1. Escena nova (File > New > General). L'objecte ha de quedar a l'origen, sense rotació ni escala.
2. Afegeix el modificador i deixa-hi els valors per defecte, llevat del que diu la taula.
   Els nivells de Subdivision es posen a **Levels Viewport**.
3. File > Export > Wavefront (.obj), amb:
   - **Forward Axis: Y**, **Up Axis: Z**
   - Geometry: **Apply Modifiers** activat, **Triangulated Mesh** desactivat
   - Limit to: Selected Only (només l'objecte)
   - Normals, UV i materials: indiferent
4. Desa'l aquí amb el nom exacte de la taula.

## Fitxers

| Fitxer | Objecte | Modificador |
|---|---|---|
| `cube_subsurf_cc_1.obj` | Cube | Subdivision Surface, Levels Viewport 1 |
| `cube_subsurf_cc_2.obj` | Cube | Subdivision Surface, Levels Viewport 2 |
| `cube_subsurf_cc_3.obj` | Cube | Subdivision Surface, Levels Viewport 3 |
| `cube_subsurf_simple_2.obj` | Cube | Subdivision Surface, Simple, Levels Viewport 2 |
| `plane_subsurf_cc_2.obj` | Plane | Subdivision Surface, Levels Viewport 2 |
| `cylinder6_subsurf_cc_1.obj` | Cylinder amb Vertices 6 (Cap Fill Type: N-Gon) | Subdivision Surface, Levels Viewport 1 |
| `cube_bevel_default.obj` | Cube | Bevel |
| `cube_bevel_2seg.obj` | Cube | Bevel, Segments 2 |
| `cube_bevel_3seg.obj` | Cube | Bevel, Segments 3 |
