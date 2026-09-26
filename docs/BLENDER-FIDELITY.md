# Fidelitat a Blender

Llista de tot el que replica el lab. Versió de referència: **Blender 5.2 LTS**, keymap per
defecte, selecció amb botó esquerre. Marca cada casella quan ho hagis comprovat amb Blender
obert al costat. Els elements marcats amb ❓ són dubtes oberts: al codi porten `// FIDELITY?`.

## Fase 1 — Viewport i navegació

### Aspecte del viewport

- [ ] ❓ Color de fons del viewport `#3d3d3d`, color llis sense degradat (`engine/viewport/theme.ts`)
- [ ] ❓ Color de la graella `#545454`
- [ ] ❓ Colors dels eixos: X `#ff3352`, Y `#8bdc00`, Z `#2890ff`
- [ ] ❓ Overlays per defecte: línies dels eixos X i Y visibles, Z amagada
- [ ] ❓ En perspectiva i en les vistes User, la graella és el terra (pla XY) i els objectes la tapen
- [ ] ❓ En les vistes ortogràfiques d'eix, la graella passa al pla de la vista (XZ a Front/Back, YZ a Right/Left) i es dibuixa darrere de tot
- [ ] ❓ La graella se subdivideix en potències de 10 segons el zoom i s'esvaeix amb la distància (valors aproximats)
- [ ] ❓ Falta la indicació d'escala a les vistes ortogràfiques ("Meters", "10 Centimeters"...), si és que Blender la mostra
- [ ] ❓ Shading Solid: gris 0.8, ombrejat pla, llum d'estudi aproximada que gira amb la vista (World Space Lighting desactivat)
- [ ] ❓ Primitives amb ombrejat pla (flat) per defecte

### Escena per defecte

- [ ] ❓ Cube de 2 m a l'origen, seleccionat i actiu
- [ ] ❓ Camera a (7.3589, -6.9258, 4.9583), rotació (63.559°, 0°, 46.692°), 50 mm, sensor 36 mm
- [ ] ❓ Light (Point) a (4.0762, 1.0055, 5.9039)
- [ ] ❓ Resolució de render 1920×1080
- [ ] ❓ Dibuix de la càmera: piràmide i marc d'1 m d'amplada (Display Size 1 m) i triangle a sobre, ple perquè és la càmera de l'escena
- [ ] ❓ Dibuix de la llum: dos cercles de mida constant a la pantalla i una línia discontínua fins a terra

### Text del viewport

- [ ] Nom de la vista a dalt a l'esquerra: User Perspective / User Orthographic / Front Orthographic / Back / Right / Left / Top / Bottom / Camera Perspective
- [ ] ❓ A sota: "(1) Collection | Cube"
- [ ] ❓ "Front Perspective" si es prem Numpad 5 en una vista d'eix

### Vista inicial

- [ ] ❓ Orientació i distància de la vista en obrir el lab (aproximades a ull: `defaultViewState`)
- [ ] ❓ Camp de visió del viewport: lent de 50 mm amb sensor efectiu de 72 mm (CAMERA_PARAM_ZOOM_INIT_PERSP = 2); clip 0.01–1000 m

### Navegació amb el ratolí

- [ ] Botó del mig: orbitar (turntable, al voltant del centre de la vista)
- [ ] Shift + botó del mig: desplaçar
- [ ] Ctrl + botó del mig: zoom
- [ ] Roda: zoom (roda amunt = apropar)
- [ ] ❓ **Sentit de l'òrbita:** l'escena segueix el ratolí. Arrossegar cap a la dreta mou l'ull cap a −X des de Front; arrossegar amunt mostra la cara de sota. És el primer que cal validar.
- [ ] ❓ Sensibilitat de l'òrbita: 0,4° per píxel
- [ ] ❓ Zoom amb la roda: ×1,2 per pas
- [ ] ❓ Ctrl + botó del mig: arrossegar amunt apropa; 200 px dupliquen o divideixen la distància
- [ ] ❓ Quan la vista està cap per avall, l'òrbita no s'inverteix
- [ ] ❓ El cursor no fa la volta per la vora de la pantalla com a Blender (limitació del navegador)
- [ ] ❓ Ctrl+roda i Shift+roda (desplaçar a Blender) no fan res de moment

### Navegació amb el teclat

- [ ] Numpad 1 / 3 / 7: Front / Right / Top; amb Ctrl, Back / Left / Bottom
- [ ] Numpad 5: perspectiva ↔ ortogràfica (instantani)
- [ ] ❓ Numpad 5 a la vista de càmera no fa res
- [ ] Numpad . : enquadrar la selecció
- [ ] Home: enquadrar-ho tot
- [ ] Numpad 0: vista de càmera; tornar-lo a prémer torna a la vista anterior
- [ ] ❓ Numpad 4 / 6 / 8 / 2: gir de 15°, en el mateix sentit que arrossegar el ratolí a esquerra / dreta / amunt / avall
- [ ] ❓ Després de 6 passos (90°) la vista encaixa en una vista d'eix i passa a ortogràfica
- [ ] ❓ No estan assignats: Numpad 9, Ctrl+Numpad 2/4/6/8, Numpad +/−, Shift+Numpad
- [ ] Les tecles només actuen quan el ratolí és a sobre del viewport

### Auto Perspective

- [ ] Anar a una vista d'eix posa la vista en ortogràfica
- [ ] Orbitar des d'una vista d'eix recupera la perspectiva
- [ ] ❓ Si la vista ja era ortogràfica abans d'anar a la vista d'eix (Numpad 5), en orbitar es manté ortogràfica
- [ ] ❓ La projecció original es recorda encara que s'encadenin diverses vistes d'eix

### Smooth View

- [ ] ❓ Durada de 200 ms amb corba smoothstep; instantani amb `prefers-reduced-motion`
- [ ] ❓ En les transicions cap a una vista d'eix, la projecció canvia al principi
- [ ] ❓ En entrar a la vista de càmera, el marc apareix al final de la transició (Blender també interpola la lent)

### Enquadrar (Numpad . i Home)

- [ ] ❓ Centre de la caixa contenidora; distància = (mida més gran / 2) × 1,4 dins el camp de visió de la dimensió més petita del viewport
- [ ] ❓ La càmera i les llums compten com un punt per a Home
- [ ] ❓ Sense selecció, Numpad . no fa res
- [ ] ❓ Numpad . i Home des de la vista de càmera: Numpad . en surt i enquadra; Home ajusta el marc de la càmera

### Vista de càmera

- [ ] ❓ Amb camzoom 0, el marc ocupa la meitat del viewport
- [ ] ❓ Fora del marc, passepartout negre al 50 %
- [ ] ❓ La roda fa zoom del marc (×1,2) i Shift + botó del mig el desplaça, sense sortir de la vista de càmera
- [ ] ❓ Orbitar surt de la vista de càmera i continua des de la posició de la càmera
- [ ] ❓ Home ajusta el marc (fórmula `view_center_camera`)
- [ ] ❓ La mateixa càmera no es dibuixa mentre es mira a través d'ella

### Gizmo de navegació

- [ ] ❓ Mida de 80 px, esferes de 9 px, etiquetes X/Y/Z a les esferes positives i esferes negatives semitransparents i sense etiqueta
- [ ] Fer clic a una esfera alinea la vista amb aquell eix
- [ ] ❓ Fer clic a l'esfera de l'eix des del qual ja mires porta a la vista oposada
- [ ] Arrossegar el gizmo orbita
- [ ] ❓ Botons de sota, en aquest ordre: zoom (arrossegar), pan (arrossegar), càmera (clic), perspectiva/ortogràfica (clic, la icona canvia)
- [ ] ❓ Textos d'ajuda (tooltips) dels botons

### Emulacions (Preferences > Input)

- [ ] Emulate 3 Button Mouse: Alt + botó esquerre orbita, Shift+Alt desplaça, Ctrl+Alt fa zoom
- [ ] Emulate Numpad: la fila de números 1..0 fa de teclat numèric
- [ ] ❓ Emulate Numpad no emula el punt (Numpad .)
- [ ] ❓ En teclats catalans i espanyols, Alt Gr arriba al navegador com a Ctrl+Alt
- De moment s'activen amb `?emulate3=1` i `?emulateNumpad=1` a l'URL. La UI arriba a la Fase 4.

### Interfície (decoració)

- [ ] ❓ Pestanyes de workspace de la 5.2 (Layout, Modeling, Sculpting, UV Editing, Texture Paint, Shading, Animation, Rendering, Compositing, Geometry Nodes, Scripting)
- [ ] ❓ Barra d'estat en repòs: "Select", "Rotate View", "Object Context Menu"; versió "5.2.0" a la dreta
- [ ] ❓ Colors de la interfície aproximats al tema per defecte

## Fases següents (anotat per no oblidar-ho)

- ❓ Colors exactes del contorn de selecció (actiu i seleccionat)
- ❓ Clic i Ctrl+clic a l'Outliner
- ❓ Format del text de la capçalera durant G, R i S
- ❓ Cicle de restriccions X → X local → sense restricció; clic del mig durant l'operador
