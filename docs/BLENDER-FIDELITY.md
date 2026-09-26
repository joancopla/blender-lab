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

## Fase 2 — Escena i selecció

### Selecció al viewport

- [ ] Clic: selecciona l'objecte, el fa actiu i deselecciona la resta
- [ ] Shift+clic: si no està seleccionat, l'afegeix i el fa actiu; si està seleccionat però no és l'actiu, el fa actiu; si és l'actiu, el deselecciona
- [ ] ❓ En deseleccionar l'actiu amb Shift+clic, continua sent l'objecte actiu (la capçalera el continua mostrant)
- [ ] ❓ Clic al buit: ho deselecciona tot i l'objecte actiu es manté
- [ ] ❓ Shift+clic al buit: no fa res
- [ ] ❓ Ctrl+clic: no fa res
- [ ] ❓ Clic repetit al mateix lloc: si l'objecte actiu és sota el cursor, selecciona el següent del darrere (cicle). Amb Shift no hi ha cicle.
- [ ] ❓ Distància de clic a les línies de la càmera: 5 px; a la llum: el cercle exterior de 9 px + 2 px
- [ ] ❓ Llindar d'arrossegament: 3 px (Preferences > Input > Drag Threshold)

### Selecció per caixa

- [ ] Arrossegar amb el botó esquerre (eina Select Box), també començant sobre un objecte: sense modificador substitueix la selecció, Shift afegeix, Ctrl treu
- [ ] ❓ Només selecciona els objectes visibles dins la caixa (no els tapats per altres)
- [ ] ❓ La selecció per caixa no canvia l'objecte actiu
- [ ] B: LMB arrossegant afegeix; Shift+LMB o MMB arrossegant treu; Esc o clic dret cancel·la
- [ ] ❓ Amb B, el cursor passa a creu i es dibuixa una creu discontínua a tota la vista
- [ ] ❓ Aspecte del rectangle (discontinu blanc i negre)
- [ ] ❓ Barra d'estat durant B: "Select", "Deselect", "Cancel"
- [ ] ❓ Durant un modal, les altres tecles s'ignoren

### A, Alt+A, Ctrl+I

- [ ] A: ho selecciona tot (si ja estava tot seleccionat, no passa res)
- [ ] Alt+A: ho deselecciona tot
- [ ] Ctrl+I: inverteix la selecció
- [ ] ❓ Cap d'aquestes canvia l'objecte actiu

### Undo

- [ ] Cada canvi de selecció és un pas d'undo; Ctrl+Z i Ctrl+Shift+Z funcionen des de qualsevol lloc de la finestra
- [ ] ❓ Una selecció que no canvia res no crea cap pas d'undo
- [ ] ❓ Màxim de 32 passos (Preferences > System > Undo Steps)
- [ ] ❓ Noms dels passos: "Select", "Box Select", "(De)select All", "Activate Item" (encara no es veuen enlloc)

### Contorns i colors

- [ ] ❓ Contorn de l'objecte actiu `#ffaa40`, dels seleccionats `#f15800`, d'1 px
- [ ] ❓ El contorn no es dibuixa on l'objecte està tapat per un altre
- [ ] ❓ Càmera i llum seleccionades: les línies canvien de color (la càmera activa, triangle inclòs)

### Outliner

- [ ] Scene Collection > Collection > objectes, en ordre alfabètic (Cube abans de Cube.001)
- [ ] Clic: selecciona, fa actiu i deselecciona la resta
- [ ] ❓ Ctrl+clic alterna: si no està seleccionat, l'afegeix i el fa actiu; si ho està, el treu
- [ ] ❓ Clic a l'espai buit de l'Outliner: ho deselecciona tot
- [ ] ❓ Clic a les files de col·lecció: no fa res
- [ ] ❓ Colors de les files seleccionades i activa, icones, casella de la col·lecció i icones d'ull i càmera (decoració)

## Fase 3 — Operadors modals (G, R, S)

### General

- [ ] G, R i S s'apliquen a tots els objectes seleccionats; el pivot és el Median Point (mitjana dels orígens)
- [ ] Sense selecció, G/R/S no fan res
- [ ] Confirmar: Enter, Enter del teclat numèric o clic esquerre (en prémer, no en deixar anar)
- [ ] Cancel·lar: Esc o clic dret; l'escena torna exactament a l'estat inicial
- [ ] ❓ Una operació confirmada és un pas d'undo encara que no s'hagi mogut res
- [ ] ❓ Noms dels passos d'undo: "Move", "Rotate", "Resize"
- [ ] ❓ Durant l'operador, el ratolí funciona a tota la finestra i no es pot navegar (ni amb la roda ni amb el botó del mig)
- [ ] ❓ Prémer G, R o S durant un altre operador no fa res. Blender canvia d'operador; R R (trackball) queda fora d'abast
- [ ] ❓ El cursor no fa la volta per les vores (Blender sí)

### Restriccions

- [ ] X/Y/Z: el primer cop és l'eix global, el segon el local, el tercer sense restricció. Canviar d'eix torna a global
- [ ] Shift+X/Y/Z: restricció a pla (exclou l'eix)
- [ ] ❓ Amb diversos objectes i eix local, cada objecte fa servir el seu eix local
- [ ] ❓ Clic del mig: restringeix a l'eix global més alineat amb el moviment del ratolí des de l'inici (Blender el va triant mentre es manté premut)
- [ ] ❓ A R, Shift+X es comporta com X: gira al voltant de la normal del pla
- [ ] ❓ Guies: línia de l'eix amb el seu color (dues línies per a un pla); amb eix local, una línia per objecte
- [ ] ❓ Línia discontínua blanca i negra del pivot al cursor a R i S

### Moviment del ratolí

- [ ] G: l'objecte segueix el ratolí en el pla de la vista; amb eix, només el component al llarg de l'eix a la pantalla
- [ ] ❓ G amb pla: el moviment de la vista es projecta sobre el pla en la direcció de visió
- [ ] ❓ G amb un eix que apunta cap a l'observador: es mou amb el moviment vertical del ratolí
- [ ] R: angle al voltant del pivot a la pantalla; sense restricció, gira al voltant de l'eix de visió
- [ ] ❓ R amb eix: el sentit s'inverteix si l'eix s'allunya de l'observador, perquè l'objecte segueixi el ratolí
- [ ] S: proporció entre la distància del pivot al cursor ara i al principi
- [ ] ❓ S: si el cursor passa a l'altra banda del pivot, l'escala es torna negativa
- [ ] ❓ S amb eix global en un objecte girat: escala l'eix local corresponent (sense cisallament)

### Modificadors

- [ ] ❓ Ctrl: increments d'1 m (G), 5° (R) i 0,1 (S). Ctrl+Shift: 0,1 m, 1° i 0,01. A Blender, l'increment de G depèn de l'escala de la graella
- [ ] ❓ Shift: mode precisió, el ratolí es mou a una desena part de la velocitat

### Entrada numèrica

- [ ] Dígits, punt decimal, signe menys (commuta el signe) i Backspace
- [ ] Amb eix, el valor s'aplica a aquell eix. G sense restricció: el valor va a X, i Tab passa a Y i Z
- [ ] ❓ G amb pla: el primer valor va al primer eix lliure i Tab passa al segon
- [ ] ❓ R sense restricció: el valor gira al voltant de l'eix de visió
- [ ] ❓ Amb un valor escrit, l'angle de R és positiu segons la regla de la mà dreta respecte de l'eix (R Z 45 → Rotation Z = 45°)
- [ ] ❓ Esborrar-ho tot amb Backspace torna el control al ratolí
- [ ] ❓ La coma també fa de separador decimal. Blender accepta expressions i unitats ("2cm"); aquí no

### Text de la capçalera i barra d'estat

- [ ] ❓ G: `Dx: 0.0000 m  Dy: 0.0000 m  Dz: 0.0000 m (0.0000 m)`; amb eix `D: 2.0000 m (2.0000 m) along global X`; amb pla `... locking global Z`
- [ ] ❓ R: `Rot: 45.00° along global Z`
- [ ] ❓ S: `Scale X: 1.0000  Y: 1.0000  Z: 1.0000`; amb eix `Scale: 2.0000 along global Z`
- [ ] ❓ Amb entrada numèrica, el valor es mostra com `[2|]`
- [ ] ❓ Barra d'estat: Confirm, Cancel, X/Y/Z Axis, X/Y/Z Plane, Automatic Constraint, Snap Invert, Precision Mode

### Esborrar transformacions

- [ ] Alt+G: Location a 0; Alt+R: Rotation a 0; Alt+S: Scale a 1 (només els objectes seleccionats)
- [ ] ❓ Noms dels passos d'undo: "Clear Location", "Clear Rotation", "Clear Scale"

### Rotació interna

- [ ] ❓ La rotació es guarda com a XYZ Euler en graus i es converteix de manera compatible amb el valor anterior: girar 15° vint vegades dona 300°, no −60°

## Fase 4 — Panells

### Panell N (Sidebar)

- [ ] N mostra i amaga el panell (amb el ratolí sobre el viewport)
- [ ] ❓ El panell se superposa a la dreta del viewport (Region Overlap) i el gizmo de navegació es desplaça a la seva esquerra
- [ ] ❓ Pestanyes verticals Item / Tool / View; només Item funciona
- [ ] ❓ Item > Transform: "Location:", "Rotation:", el desplegable "XYZ Euler", "Scale:" i "Dimensions:"; cada camp mostra "X/Y/Z" a l'esquerra i el valor a la dreta; cadenats a la dreta (decoració)
- [ ] ❓ Format: `0 m`, `7.3589 m`; `63.6°`; `1.000`
- [ ] Mostra l'objecte actiu i s'actualitza en directe durant G/R/S
- [ ] ❓ Sense objecte actiu, el panell queda buit
- [ ] Clic en un camp: editar amb el teclat. Enter o clic fora confirma, Esc cancel·la, Tab passa al camp següent
- [ ] ❓ Mentre s'edita, el text és el valor complet sense unitat; s'accepten + − * / ( ), coma decimal i la unitat al final. Blender avalua Python i converteix unitats
- [ ] ❓ Arrossegar horitzontalment canvia el valor: 0,01 m, 1° o 0,01 per píxel. Ctrl: increments de 0,1 m, 5° o 0,1. Shift: precisió. Esc o clic dret cancel·la
- [ ] ❓ Canviar Dimensions canvia l'escala; en càmeres i llums no fa res
- [ ] ❓ Cada canvi és un pas d'undo amb el nom de la propietat ("Location", "Rotation", "Scale", "Dimensions")
- [ ] ❓ Només s'edita l'objecte actiu (Blender edita tots els seleccionats amb Alt)
- [ ] ❓ No hi ha les fletxes laterals dels camps ni l'arrossegament vertical per editar X/Y/Z alhora

### Preferències del lab (no són part de Blender)

- [ ] Emulate 3 Button Mouse i Emulate Numpad, desactivats per defecte, amb una frase que diu on es troben a Blender
- [ ] ❓ Blender les té a Edit > Preferences > Input; comprova-ho a la 5.2
- [ ] Si l'alumne arrossega amb Alt + clic esquerre o amb el botó dret sense l'emulació, apareix un avís que proposa activar-la (una vegada per visita)
- [ ] Les preferències es desen a `localStorage`
- [ ] Overlay de tecles a baix a l'esquerra, activable: noms de tecla de Blender ("Ctrl + Numpad 1") i accions del ratolí en català
