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

## Fase 5 — Etapes i web

### Menús de la capçalera (afegits perquè sense teclat numèric es pugui fer Frame Selected, com a Blender)

- [ ] ❓ View: Sidebar (N), Perspective/Orthographic (Numpad 5), Frame Selected (Numpad .), Frame All (Home), Viewpoint ▸ Camera / Top / Bottom / Front / Back / Right / Left. Blender en té molts més; comprova l'ordre i el text de les dreceres ("Ctrl Numpad 1")
- [ ] ❓ Select: All (A), None (Alt A), Invert (Ctrl I), Box Select (B)
- [ ] ❓ Add i Object continuen sent decoració
- [ ] ❓ Passar el ratolí per un altre menú de la capçalera amb un menú obert canvia de menú

### Continguts que depenen de Blender (textos del lab)

- [ ] ❓ Rutes de menú citades al bloc "Al Blender real" i a les pistes: Edit > Preferences > Navigation / Input, View > Viewpoint, View > Frame Selected / Frame All, Select > All / None / Invert / Box Select, Object > Transform, Object > Clear > Location / Rotation / Scale, Edit > Undo History
- [ ] ❓ Pista de l'etapa 1: "per veure la cara de sota, arrossega cap amunt", que depèn del sentit de l'òrbita
- [ ] ❓ A l'etapa 4, Auto Perspective explicat com a opció de Blender (Preferences > Navigation)

### Decisions de disseny de les etapes (no són de Blender, però revisa-les)

- Etapa 1: una cara compta com a vista si la direcció de la vista és a menys de 35° de la normal de la cara
- Etapa 2: l'esfera ha d'estar a menys d'un 12 % del costat curt de la vista respecte del centre i ocupar almenys un 25 %
- Etapa 3: només el Cone seleccionat i el centre de la vista sobre el Cone (s'hi pot arribar amb Numpad . o amb View > Frame Selected)
- Etapa 5: els missatges diuen quins objectes sobren, quins falten i quin és l'actiu
- Etapa 6: Cube amb tolerància de 10 cm; Cube.001 amb X i Y sense canvis (1e-4) i Z a menys de 10 cm
- Etapa 7: tolerància 1e-4; si falta poc (10 cm, 3° o 0,1), el missatge suggereix desfer i escriure el número
- Etapa 8: cal cancel·lar amb clic dret (amb Esc surt un avís), fer un canvi, desfer-lo, i acabar amb totes les transformacions iguals que al principi
- Etapa 9: la comparació amb la silueta té en compte la simetria (un cub girat 90° encaixa, un con capgirat no); tolerància de 10 cm en els punts característics
- La segona pista apareix sola al cap de 90 s sense superar l'etapa
- Les siluetes i els símbols no són objectes: no surten a l'Outliner i no es poden seleccionar
- Els símbols de l'etapa 1 estan fixos a l'espai: si l'alumne mou el cub, no el segueixen

## Fase 6 — Poliment

- Rendiment: render sota demanda (només es dibuixa quan canvia alguna cosa) i *pixel ratio* limitat a 1,5. Passades per frame: escena, graella i, si hi ha una malla seleccionada, contorns. Cal mesurar-ho en un ordinador d'aula: jo no he pogut fer-ho, perquè la pestanya de proves quedava en segon pla.
- Avís en pantalles tàctils o de menys de 900 px d'amplada; es pot tancar i continuar.
- `prefers-reduced-motion`: Smooth View instantani i sense animacions a la interfície del lab.
- Textos revisats (normativa 2017, pronoms, castellanismes). «Lab» es fa servir com a nom del producte; si prefereixes «laboratori» a tot arreu, és un canvi a `ca.json`.

---

# Lab 02 — Mode Edició

## Fase 1 — Estructura de malla (sense interfície)

- [ ] ❓ Recomptes de les primitives amb els paràmetres per defecte de l'Add (comprova'ls amb l'overlay Statistics):
  - Cube: 8 vèrtexs, 12 arestes, 6 cares, 12 triangles
  - UV Sphere (32 × 16): 482 / 992 / 512 / 960
  - Cylinder (32, tapes n-gon): 64 / 96 / 34 / 124
  - Cone (32, base n-gon): 33 / 64 / 33 / 62
  - Torus (48 × 12): 576 / 1152 / 576 / 1152
  - Plane: 4 / 4 / 1 / 2
- [ ] ❓ Els cercles (Cylinder, Cone, UV Sphere) comencen amb el primer vèrtex a +Y i giren en sentit antihorari vist des de dalt. Afecta la posició exacta dels vèrtexs, no els recomptes
- [ ] ❓ Edge loop (Alt+clic): continua pels vèrtexs de 4 arestes per l'aresta que no comparteix cap cara amb l'actual; en una vora, segueix la vora mentre cada vèrtex en tingui dues. El caminador de Blender té més casos especials
- [ ] ❓ Edge ring (Ctrl+Alt+clic): travessa quads cap a l'aresta oposada i s'atura a les cares que no són quads
- [ ] ❓ "Non-manifold" com Select > Select All by Trait > Non Manifold: arestes amb 0, 1 o 3+ cares, i vèrtexs on les cares no formen un sol ventall

## Fase 2 — Edit Mode i selecció

### Entrar i sortir

- [ ] Tab entra en Edit Mode amb tots els objectes de malla seleccionats (més l'actiu); Tab en torna a sortir. El selector de mode de la capçalera també
- [ ] ❓ Cal que l'objecte actiu sigui una malla; si és la càmera o la llum, Tab no fa res
- [ ] ❓ Una primitiva nova entra en Edit Mode amb tot seleccionat; la selecció de components es conserva en sortir i tornar a entrar
- [ ] ❓ A l'Outliner, en Edit Mode els clics no fan res (Blender permet canviar d'objecte)
- [ ] ❓ La capçalera en Edit Mode: "Edit Mode", botons Vertex / Edge / Face, i menús View, Select, Add, Mesh, Vertex, Edge, Face, UV (els quatre darrers encara són decoració)
- [ ] ❓ G/R/S no fan res en Edit Mode fins a la fase 3; el panell N continua mostrant l'objecte (Blender mostra la mediana dels vèrtexs)

### Modes de selecció

- [ ] 1 / 2 / 3: vèrtex, aresta, cara. Shift + 1/2/3 o Shift+clic als botons els combina; almenys un queda actiu
- [ ] Amb Emulate Numpad, la fila de números canvia de vista i 1/2/3 no canvien el mode
- [ ] ❓ En canviar de mode: de vèrtex a cara només queden les cares amb tots els vèrtexs seleccionats; de cara a vèrtex queden els vèrtexs de les cares
- [ ] ❓ Amb diversos modes actius, el més baix mana en la propagació (vèrtex > aresta > cara)

### Selecció

- [ ] Clic, Shift+clic (afegeix / fa actiu / treu), clic al buit, caixa, B, A, Alt+A, Ctrl+I, igual que al Lab 01 però amb components; el clic en un altre objecte en edició el fa actiu
- [ ] ❓ Radi de clic: 20 px per als vèrtexs, 12 px per a les arestes; amb vèrtexs i cares actius, un vèrtex proper guanya
- [ ] ❓ Sense X-ray, un element compta si cap cara dels objectes en edició el tapa (els altres objectes no tapen)
- [ ] ❓ Caixa: vèrtexs dins; arestes amb els dos extrems dins; cares amb el centre dins
- [ ] Alt+clic: edge loop; Shift+Alt+clic l'afegeix; Ctrl+Alt+clic: edge ring
- [ ] ❓ En mode cara, Alt+clic selecciona el loop de cares travessat pel ring de l'aresta
- [ ] ❓ Amb Emulate 3 Button Mouse, Alt+clic sense moure el ratolí fa loop select, i si s'arrossega orbita
- [ ] ❓ Ctrl+clic (Pick Shortest Path a Blender) no fa res
- [ ] L selecciona el que està connectat a l'element sota el cursor; Ctrl+L, a la selecció
- [ ] ❓ Ctrl+Numpad + / −: Select More / Less amb Face Step (creix a través de les cares, diagonals incloses); a les vores obertes, Select Less no encongeix
- [ ] ❓ Numpad . enquadra els vèrtexs seleccionats
- [ ] ❓ Noms dels passos d'undo: "Toggle Edit Mode", "Select Mode", "Select", "Box Select", "(De)select All", "Loop Select", "Edge Ring Select", "Select Linked Pick", "Select Linked All", "Select More", "Select Less"

### Dibuix

- [ ] ❓ Colors: arestes #000000, arestes seleccionades #ffa000, vèrtexs #000000, seleccionats #ff8500, element actiu #ffffff, tint de cares #ffa500 al 20 %; vèrtexs de 6 px
- [ ] ❓ Els vèrtexs només es dibuixen en mode vèrtex; els punts de cara, en mode cara i amb X-ray
- [ ] ❓ Els objectes en Edit Mode no tenen contorn taronja
- [ ] Alt+Z: X-ray (objectes semitransparents al 50 %), en tots dos modes; no és un pas d'undo
- [ ] ❓ Botó Toggle X-Ray a la dreta de la capçalera del viewport, en tots dos modes; activat, es veu ressaltat. Text d'ajuda: "Toggle X-Ray (Alt Z)". La icona és pròpia del lab, no la de Blender. Afegit perquè a molts ordinadors amb NVIDIA Alt+Z obre la superposició de la targeta gràfica i el navegador no rep la tecla
- [ ] ❓ En Object Mode amb X-ray, la caixa encara només agafa els objectes visibles

### Statistics (activat en aquest lab)

- [ ] ❓ Object Mode: Objects seleccionats / total, i Vertices, Edges, Faces i Triangles de tota l'escena
- [ ] ❓ Edit Mode: seleccionats / total dels objectes en edició; Triangles, total

## Fase 3 — Transformar components

- [ ] G/R/S en Edit Mode sobre els vèrtexs seleccionats, amb restriccions, entrada numèrica, Ctrl, Shift i cancel·lació igual que en Object Mode; pivot: Median Point dels vèrtexs
- [ ] ❓ "Local" en Edit Mode és l'orientació de l'objecte (l'orientació Normal no es replica)
- [ ] ❓ Amb diversos objectes en edició, la mediana és de tots els vèrtexs seleccionats
- [ ] ❓ El panell N en Edit Mode continua mostrant l'objecte (Blender mostra "Median" dels vèrtexs)

## Fase 4 — Eines, primera part

- [ ] Extrude (E): amb cares seleccionades, extrusió de regió al llarg de la normal ("along normal Z"); amb arestes o vèrtexs, moviment lliure. Cancel·lar el moviment deixa la geometria extrudida al lloc
- [ ] ❓ Noms: "Extrude Region and Move" / "Extrude and Move"; al panell Adjust, un sol valor "Move" al llarg de la normal
- [ ] Inset (I): regió; I durant l'operació alterna Individual
- [ ] ❓ Inset: acostar el ratolí al centre de la selecció fa la vora més gruixuda; capçalera "Thickness / Depth / Individual (I)" (Blender en mostra més)
- [ ] Delete (X o Supr): Vertices, Edges, Faces, Only Faces, Dissolve Vertices / Edges / Faces; Limited Dissolve, Edge Collapse i Edge Loops desactivats
- [ ] ❓ Després d'esborrar o dissoldre, no queda res seleccionat
- [ ] ❓ Dissolve Edges també dissol els vèrtexs que queden entre dues arestes (opció "Dissolve Vertices" de Blender, activada per defecte)
- [ ] ❓ Dissolve Vertices en un vèrtex d'una vora oberta amb més de dues arestes no fa res
- [ ] Merge (M): At Center, Collapse, By Distance (0,0001 m); At Cursor desactivat; By Distance mostra "Removed N vertices" a la barra d'estat
- [ ] Fill (F): dos vèrtexs → aresta; un loop tancat d'arestes → cara (orientada com les veïnes); tres o més vèrtexs solts → cara
- [ ] ❓ Adjust Last Operation: a baix a l'esquerra, obert per defecte; canviar-hi un valor torna a fer l'operació i en substitueix el pas d'undo

## Fase 5 — Eines, segona part

- [ ] Loop Cut and Slide (Ctrl+R): previsualització groga en passar per sobre d'una aresta, roda per canviar el nombre de talls, clic per tallar i després lliscar; clic dret o Esc en lliscar deixa el tall centrat
- [ ] ❓ Amb diversos talls, lliscar els mou junts mantenint l'espai entre ells
- [ ] ❓ Capçalera: "Number of Cuts: N" i després "Factor: 0.000"
- [ ] ❓ Els loops nous queden seleccionats
- [ ] Bevel (Ctrl+B): la roda canvia els segments; perfil 0,5 (quart de cercle en angles rectes); amplada en mode Offset; Clamp Overlap
- [ ] ❓ Només es fa bevel d'arestes que no comparteixen vèrtex amb una altra aresta amb bevel i els vèrtexs de les quals tenen tres arestes (el cas de les etapes). En altres casos surt un avís en català a la barra d'estat
- [ ] ❓ Bevel de vèrtexs (Ctrl+Shift+B): només un segment
- [ ] ❓ Acostar el ratolí al centre fa el bevel més ample; capçalera "Width / Segments / Profile"
- [ ] ❓ Les cares noves del bevel queden seleccionades

## Fase 6 — Analitzador i comprovació de formes

- L'analitzador és una eina del lab (colors propis): n-gons grocs, triangles blaus, cares girades en magenta, arestes no manifold i vèrtexs duplicats en vermell, amb una frase en català de per què importa i com s'arregla a Blender
- La comprovació de formes compara les siluetes a Front, Right i Top (64 × 64 píxels) amb IoU; la retroalimentació diu la vista i la zona (per exemple, "sobra forma a dalt a l'esquerra")
- Les formes de referència es construeixen amb les mateixes operacions del lab (Extrude, Inset, Loop Cut, Bevel)

## Fase 7 — Etapes del Lab 02

- [ ] ❓ Rutes de menú del bloc "Al Blender real" (Mesh > Extrude, Face > Inset Faces, Edge > Loop Cut and Slide, Edge > Bevel Edges, Vertex > Bevel Vertices, Mesh > Delete, Mesh > Merge, Vertex > New Edge/Face from Vertices, Select > Select All by Trait, Mesh > Normals > Recalculate Outside)
- Decisions de disseny: etapes 1 i 3 per passos, amb els elements a seleccionar marcats en blau; etapes 4 a 8 i 10 amb silueta de referència (llindar del 90 %, 88 % a l'etapa 7 i 85 % al repte); l'etapa 9 activa l'analitzador; el repte final no té pistes i mostra temps i operacions

---

# Lab 03 — Modificadors

## Fase 1 — Pila de modificadors, Mirror i Array (sense interfície)

### Pila

- [ ] La pila s'avalua de dalt a baix; només es dibuixa la malla avaluada. La malla base (la que s'edita) no canvia mai
- [ ] ❓ Realtime desactivat: el modificador no s'aplica al viewport. Render desactivat: no s'aplica al render. En Edit Mode només s'apliquen els que tenen "Edit Mode" activat
- [ ] ❓ En Object Mode, l'overlay Statistics compta la malla avaluada (després dels modificadors)
- [ ] ❓ Clicar un objecte per seleccionar-lo funciona sobre la malla avaluada (es pot clicar la meitat que fa el Mirror)
- [ ] ❓ Noms: "Mirror", "Array"; si ja n'hi ha un amb el mateix nom a l'objecte, "Mirror.001", "Mirror.002"...
- [ ] ❓ Un modificador nou s'afegeix al final de la pila
- [x] Noms a Edit > Undo History: "Add Modifier", "Remove Modifier", "Move to Index" i, per als paràmetres, l'etiqueta del camp ("Count", "Axis"...)
- [ ] ❓ Dimensions al panell N, Frame Selected (Numpad .) i Frame All (Home) mesuren el resultat dels modificadors (un Array de 3 cubs fa 6 m d'amplada). En Edit Mode, Numpad . enquadra els vèrtexs seleccionats de la malla base
- [ ] ❓ Canviar Dimensions amb modificadors canvia l'escala en proporció a la mida del resultat

### Mirror

- [x] Valors per defecte: Axis X; Bisect i Flip desactivats; Mirror Object buit; Clipping desactivat; Merge activat a 0,001 m; Bisect Distance 0,001 m
- [x] Amb diversos eixos, s'aplica X, després Y i després Z, cadascun sobre el resultat de l'anterior (X+Y fa quatre còpies)
- [x] Merge: cada vèrtex només es fusiona amb el seu propi reflex, si la distància entre tots dos és menor que la de Merge (és a dir, si és a menys de la meitat d'aquesta distància del pla). Els dos van al punt mitjà, damunt del pla
- [x] Bisect sense Flip conserva el costat positiu de l'eix; amb Flip, el negatiu
- [ ] ❓ Mirror Object: el pla de simetria és el de l'origen i els eixos de l'altre objecte (inclosos la seva rotació i escala)
- [ ] ❓ Les cares de la còpia tenen l'ordre invertit (normals cap enfora) i mantenen el primer vèrtex
- Limitació coneguda: si el pla talla un n-gon còncau més de dues vegades, el lab en fa una sola cara (Blender en fa diverses). No passa en cap etapa
- Clipping: l'efecte en Edit Mode és a la Fase 4 ("Edit Mode amb modificadors")

### Array

- [x] Valors per defecte: Fit Type Fixed Count, Count 2, Relative Offset activat (1, 0, 0), Constant Offset desactivat (1, 0, 0 m), Merge desactivat a 0,01 m, First Last desactivat
- [ ] ❓ Relative Offset es mesura sobre la caixa contenidora de la malla que arriba al modificador (no la malla base si hi ha modificadors abans)
- [ ] ❓ Relative i Constant Offset se sumen
- [x] Merge: els vèrtexs de cada còpia es fusionen amb els de la còpia anterior i conserven la posició de l'anterior; amb First Last, també l'última amb la primera
- [x] Amb Merge, les cares on es toquen dues còpies (per exemple, dos cubs) es conserven una vegada: 3 cubs → 16 vèrtexs i 16 cares

## Fase 2 — Subdivision Surface i Bevel (sense interfície)

Les malles de referència de Blender es desen a `tests/fixtures/blender/` (vegeu-ne el README). Mentre no hi siguin, els tests que les comparen se salten.

### Subdivision Surface

- [ ] ❓ Valors per defecte: Catmull-Clark, Levels Viewport 1, Render 2, Use Limit Surface activat
- [ ] ❓ Nom: "Subdivision" (no "Subdivision Surface")
- [ ] Catmull-Clark: cada nivell divideix cada n-gon en n quadrilàters; les vores obertes es mantenen com a corbes (Boundary Smooth: All)
- [ ] Simple: divideix igual però no mou res
- [ ] Use Limit Surface: al final, els vèrtexs es col·loquen damunt de la superfície límit
- [ ] ❓ Un vèrtex amb una sola aresta oberta (*dart*) només es dona en malles no *manifold*; el lab el tracta com un vèrtex normal
- [ ] Comparar amb les malles de referència: `cube_subsurf_cc_1/2/3`, `cube_subsurf_simple_2`, `plane_subsurf_cc_2`, `cylinder6_subsurf_cc_1`
- Decisió del lab (no és de Blender): Levels Viewport arriba com a màxim a 3. Si l'alumne hi posa més, es queda a 3 i surt un avís a la barra d'estat. Levels Render no té límit

### Subdivision Set (Ctrl+0…5, Object Mode)

- [ ] ❓ A cada malla seleccionada, el primer Subdivision Surface de la pila passa a tenir Levels Viewport = la xifra; Levels Render no canvia
- [ ] ❓ Si una malla no en té cap, se n'hi afegeix un al final de la pila amb aquest nivell (també amb Ctrl+0)
- [ ] ❓ Nom a Edit > Undo History: "Subdivision Set"; és un sol pas de desfer encara que hi hagi diversos objectes seleccionats
- [ ] ❓ Amb Emulate Numpad, Ctrl+1, Ctrl+3 i Ctrl+7 canvien la vista (Back, Left, Bottom) i no fan Subdivision Set
- [ ] ❓ A Blender 5.2 Ctrl+0…5 també funciona en Edit Mode. El lab només ho fa en Object Mode
- Decisió del lab: Ctrl+4 i Ctrl+5 posen el nivell 3 i mostren l'avís del límit

### Bevel (modificador)

- [ ] ❓ Valors per defecte: Amount 0,1 m, Segments 1, Limit Method Angle (30°), Clamp Overlap activat
- [ ] Width Type Offset, Profile 0,5, Loop Slide activat (fixos al lab)
- [ ] Només es fa bevel de les arestes que toquen dues cares i que passen el Limit Method
- [ ] ❓ Clamp Overlap: l'amplada es limita perquè els vèrtexs nous no es creuin al llarg d'una aresta. Blender calcula el límit segons cada cas; el lab fa servir una regla única
- [ ] ❓ Cantonada d'un cub (tres arestes amb bevel): un tros d'esfera. Coincideix amb Blender amb 1 i 2 segments; amb 3 o més cal comparar-ho
- [ ] ❓ Loop Slide: quan un vèrtex nou llisca per una aresta sense bevel i les dues arestes amb bevel del costat demanen distàncies diferents, el lab fa servir la mitjana de totes dues
- [ ] Comparar amb les malles de referència: `cube_bevel_default`, `cube_bevel_2seg`, `cube_bevel_3seg`
- Limitació coneguda: el lab només sap fer vèrtexs amb una aresta amb bevel i tres arestes, dues arestes amb bevel (un *loop*) o tres arestes amb bevel en una cantonada. En altres casos el modificador no fa res i el lab ho avisa. Blender els fa tots
- [ ] Quan el Bevel del lab no sap fer la malla, el panell del modificador mostra l'avís del lab (en groc, sota la capçalera) i el modificador no fa res

## Fase 3 — Solidify i Shade Smooth/Flat/Auto Smooth (sense interfície)

### Suavitzat per cara (atribut de la malla)

Cada cara guarda si és suau o plana, com l'atribut `sharp_face` de Blender. Aquí es comprova com passa d'una operació a l'altra.

- [ ] ❓ Les primitives noves (Cube, UV Sphere, Cylinder...) són planes
- [ ] ❓ Extrude Region: les cares laterals noves tenen el suavitzat de la cara de la regió que toquen
- [ ] ❓ Extrude d'arestes: la cara nova té el suavitzat de la cara de l'aresta
- [ ] ❓ Inset (regió i individual): l'anella de cares noves té el suavitzat de la cara on es fa l'Inset
- [ ] Loop Cut: les dues parts d'una cara tallada conserven el seu suavitzat
- [x] Fill (F): la cara nova és suau si ho són la majoria de les cares que toquen les seves arestes; si hi ha empat, plana (decisió del lab, acceptada per Joan)
- [x] Dissolve Faces / Edges / Vertices: la cara que en resulta té el suavitzat de la primera cara del grup, la de menor índex (decisió del lab, acceptada per Joan)
- [x] Bevel (Ctrl+B): la tira nova té el suavitzat d'una de les dues cares de l'aresta; amb Ctrl+Maj+B, la tapa té el d'una cara del vèrtex (decisió del lab, acceptada per Joan)
- [ ] Mirror i Array: les còpies tenen el mateix suavitzat que l'original
- [ ] Subdivision Surface: les cares filles tenen el suavitzat de la cara de la qual surten
- [ ] ❓ Modificador Bevel: les tires i les cantonades tenen el suavitzat d'una cara veïna

### Normals de dibuix (Shade Smooth)

- [ ] Una cara plana es dibuixa amb la seva normal
- [ ] ❓ Una cara suau fa, a cada vèrtex, la mitjana de les normals de les cares suaus del voltant, ponderada per l'angle de cada cantonada
- [ ] ❓ La mitjana es talla en les arestes que toquen una cara plana, en les arestes *sharp*, en les que no tenen exactament dues cares i en les que tenen les dues cares amb sentit contrari (normals girades)
- [ ] ❓ Una sola aresta *sharp* no talla res si el ventall de cares del vèrtex continua unit per l'altre costat
- [ ] En Edit Mode, les cares suaus també es dibuixen suaus
- [x] Auto Smooth no és un modificador ni va a la pila: és la casella Auto Smooth de la pestanya Object Data > Normals, amb un angle de 30° per defecte (confirmat per Joan, 28/09/2026)
- [ ] Amb Auto Smooth, les arestes on l'angle entre les dues cares és més gran que l'angle es veuen marcades (*sharp*); s'aplica a la malla després dels modificadors
- [ ] Un cilindre de 32 costats amb Auto Smooth a 30°: els costats es veuen llisos i les tapes, planes, amb la vora marcada

### Shade Smooth, Shade Auto Smooth i Shade Flat (Object Mode)

- [x] Clic amb el botó dret al viewport: Object Context Menu amb Shade Smooth, Shade Auto Smooth i Shade Flat (confirmat per Joan). El lab només mostra aquestes tres entrades
- [x] El menú s'obre en deixar anar el botó (confirmat per Joan)
- [ ] ❓ Les mateixes tres entrades també són al menú Object de la capçalera
- [ ] Shade Smooth: totes les cares dels objectes de malla seleccionats passen a ser suaus. Shade Flat: totes planes. Shade Auto Smooth: totes suaus i activa Auto Smooth
- [x] Shade Smooth i Shade Flat no toquen la casella Auto Smooth (confirmat per Joan)
- [ ] ❓ Noms a Edit > Undo History: "Shade Smooth", "Shade Auto Smooth", "Shade Flat"
- [ ] Si no hi ha cap malla seleccionada, o ja estan totes així, no fa res i no afegeix cap pas de desfer
- [ ] Un cub amb Subdivision i Shade Smooth es veu arrodonit i llis; amb Shade Flat, amb facetes
- [ ] ❓ "Keep Sharp Edges" (activat per defecte a Shade Smooth) no fa res al lab perquè no hi ha arestes marcades com a *sharp*
- El panell Normals de la pestanya Object Data (casella Auto Smooth i angle) arriba a la Fase 4: vegeu "Pestanya Object Data"

### Solidify

- [x] Valors per defecte: Mode Simple, Thickness 0,01 m, Offset −1, Even Thickness desactivat, Fill Rim activat (confirmat per Joan). Nom: "Solidify"
- [ ] ❓ Offset −1: el gruix creix darrere de les normals (la superfície original queda a fora); 1: davant; 0: centrat
- [ ] Un pla amb Solidify fa una làmina tancada: 8 vèrtexs, 12 arestes, 6 cares, amb les normals cap enfora
- [ ] Sense Fill Rim, les dues superfícies queden obertes, sense les cares de la vora
- [ ] Un objecte tancat (el cub) fa un segon cub a dins, amb les normals cap endins, sense cares de vora
- [ ] ❓ Even Thickness: a les cantonades, les parets conserven el gruix complet (sense l'opció, un cub fa parets de gruix/√3 a les cantonades)
- [ ] Thickness negatiu: el gruix va cap a l'altre costat i les normals continuen cap enfora
- [ ] ❓ Les cares de la vora tenen el suavitzat de la cara de la seva aresta
- [ ] Comparar amb les malles de referència: `plane_solidify_default`, `cube_solidify_02`, `cube_solidify_02_even`
- Fora d'abast: Mode Complex, Only Rim, Flip, High Quality Normals, Clamp, Vertex Group, materials de la vora
- El panell és a la Fase 4 ("Paràmetres dels modificadors")

## Fase 4 — Interfície

### Properties Editor (component compartit, `ui/properties/`)

- [ ] ❓ Al workspace Layout, la columna de la dreta té l'Outliner a dalt (un terç de l'alçada, aprox.) i el Properties Editor a sota
- [ ] ❓ Ordre de les pestanyes: Tool | Render, Output, View Layer, Scene, World, Collection | Object, Modifiers, Particles, Physics, Object Constraints, Data, Material | Texture
- [ ] ❓ Pestanyes segons l'objecte actiu: una malla les mostra totes; una llum o una càmera no tenen Modifiers, Particles ni Material; sense objecte actiu, només les de l'escena i Texture
- [ ] ❓ Text d'ajuda de cada pestanya (el nom de la taula de dalt)
- Decisió del lab: les icones són pròpies (no les de Blender), amb els colors de Blender per grups. Cada lab activa només les pestanyes que fa servir; les altres es veuen apagades i no es poden clicar
- Decisió del lab: als labs 01 i 02 no hi ha cap pestanya activa i el cos mostra una nota en català

### Pestanya Modifiers

- [ ] ❓ Botó Add Modifier a dalt de la pestanya; obre un menú amb les categories Edit, Generate, Deform, Normals i Physics, cadascuna amb un submenú. Els modificadors que no són del lab surten desactivats
- [ ] ❓ Llista de cada categoria (vegeu `ui/properties/add-modifier.ts`), en ordre alfabètic
- [ ] ❓ Amb el menú obert, escriure filtra: surten resultats com "Generate ▸ Mirror"
- [ ] ❓ Capçalera de cada modificador: fletxa per plegar, icona, nom editable, botons Edit Mode, Realtime i Render, menú ▾, × per esborrar i agafador per arrossegar
- [ ] ❓ Menú ▾: Apply (Ctrl A), Duplicate (Shift D), Copy to Selected, Move to First, Move to Last. Copy to Selected desactivat (fora del lab)
- [ ] ❓ Amb el ratolí sobre un modificador: X o Supr l'esborra, Shift+D el duplica (la còpia queda just a sota, amb el nom "Subdivision.001")
- [ ] ❓ Noms a Undo History: "Add Modifier", "Remove Modifier", "Duplicate Modifier", "Move to Index" (també per arrossegar i per Move to First/Last), "Name", "Edit Mode", "Realtime", "Render"
- [ ] Arrossegar un modificador per l'agafador el canvia de lloc a la pila
- [ ] Si un submenú no hi cap a la dreta, s'obre a l'esquerra; en passar en diagonal per sobre d'altres entrades, el submenú obert espera una mica abans de canviar
- Decisió del lab: plegar o desplegar un panell no és un pas de desfer i no es desa a l'escena
- Icones pròpies, no les de Blender
- Limitació del navegador: Ctrl+1…8 canvien de pestanya del navegador i Ctrl+0 restableix el zoom; la pàgina no pot evitar-ho. Subdivision Set (Ctrl+0…5) està implementat, però amb un teclat real no arriba al lab. El Lab 03 ensenya Add Modifier

### Paràmetres dels modificadors (panells)

Etiqueta a l'esquerra i control a la dreta, com a Blender. Només hi ha els paràmetres del lab; els subpanells que el lab no fa servir no hi són. Cada canvi és un pas de desfer amb el nom de l'etiqueta.

- [ ] ❓ Subdivision Surface: Catmull-Clark | Simple, Levels Viewport, Render; subpanell Advanced (tancat) amb Use Limit Surface. Falta Optimal Display
- [ ] ❓ Mirror: Axis, Bisect i Flip (X Y Z), Mirror Object (qualsevol altre objecte, amb × per treure'l), Clipping, Merge, Merge Distance, Bisect Distance
- [ ] ❓ Array: Fit Type (només Fixed Count), Count; subpanells Relative Offset (obert) amb Factor X Y Z, Constant Offset amb Distance X Y Z i Merge amb Distance i First Last, cadascun amb la casella a la capçalera. Falten Object Offset, UVs i Caps
- [ ] ❓ Bevel: Vertices | Edges (només Edges), Width Type (només Offset), Amount, Segments, Limit Method (None, Angle; Weight i Vertex Group desactivats), Angle (només amb Angle); subpanell Geometry amb Clamp Overlap. Falten Profile i Shading
- [ ] ❓ Solidify: Mode (només Simple), Thickness, Offset, Even Thickness; subpanell Rim amb Fill Rim. Falten High Quality Normals i els altres subpanells
- [ ] ❓ Formats: distàncies "0.1 m", angles "30°", enters sense decimals, factors amb tres decimals ("1.000", "-1.000")
- [ ] ❓ Límits: Levels 0–6 (el lab talla a 3 i avisa), Count 1–1000, Segments 1–100, Angle 0–180°, Offset −1…1
- [ ] Arrossegar un camp mostra el resultat en directe; Esc o el botó dret ho cancel·len; clicar-hi permet escriure el valor
- Decisió del lab: amb Limit Method, l'etiqueta va a sobre dels botons perquè hi càpiguen
- Decisió del lab: obrir o tancar un subpanell no és un pas de desfer

### Apply

- [ ] ❓ Apply (menú ▾ del modificador, o Ctrl+A amb el ratolí sobre el panell): el resultat passa a ser la malla base i el modificador desapareix; els altres es queden. Nom a Undo History: "Apply Modifier"
- [ ] ❓ Si no és el primer de la pila, s'aplica igualment tot sol sobre la malla base (sense els modificadors d'abans) i la barra d'estat diu "Applied modifier was not first, result may not be as expected"
- [ ] ❓ Amb Realtime desactivat, no s'aplica: "Modifier is disabled, skipping apply"
- [ ] ❓ En Edit Mode, no s'aplica: "Modifiers cannot be applied in edit mode"
- [ ] ❓ Subdivision s'aplica amb Levels Viewport (no amb Render)
- [ ] ❓ Després d'aplicar, en entrar a Edit Mode tota la malla està seleccionada
- [ ] La malla aplicada conserva el suavitzat de les cares (Shade Smooth)
- Decisió del lab: si el Bevel del lab no sap fer aquella malla, no s'aplica i surt l'avís del lab

### Pestanya Object Data (malla)

- [ ] ❓ A dalt, "Cube › Cube" (objecte › dades de malla)
- [ ] ❓ Panells i ordre: Vertex Groups, Shape Keys, UV Maps, Color Attributes, Attributes, Normals, Texture Space, Remesh, Geometry Data, Custom Properties. Només Normals funciona; els altres es veuen apagats
- [ ] ❓ Normals comença plegat
- [x] Normals: casella Auto Smooth i l'angle al costat (30° per defecte), tal com va descriure Joan
- [ ] ❓ Amb la casella desactivada, l'angle es veu apagat però es pot canviar
- [ ] ❓ Noms a Undo History: "Auto Smooth" i "Angle"; l'angle va de 0° a 180°
- [ ] Canviar la casella o l'angle es veu al moment al viewport (amb les cares suaus)

### Edit Mode amb modificadors

- [ ] ❓ En Edit Mode es veu el resultat dels modificadors que tenen el botó Edit Mode activat; els que el tenen desactivat no s'apliquen
- [ ] ❓ A sobre del resultat es veu la gàbia de la malla base (arestes, vèrtexs i cares seleccionades), que és el que s'edita. Equival a "On Cage" desactivat
- [ ] ❓ La gàbia queda tapada on el resultat hi passa per davant (per exemple, les arestes de darrere); amb X-ray es veu tota
- [ ] ❓ Seleccionar vèrtexs, arestes i cares es fa sobre la gàbia (la malla base), no sobre el resultat
- [ ] ❓ Mirror > Clipping: en moure vèrtexs (G, R, S, i també Extrude), els que són sobre el pla del mirall (a menys de la distància de Merge) s'hi queden, i cap vèrtex no el pot travessar: s'atura al pla
- [ ] ❓ Clipping només funciona amb Realtime activat i sense Mirror Object
- Fora d'abast: el botó "On Cage" de la capçalera dels modificadors

## Fase 5 — Etapes i web del Lab 03

### Decisions de disseny de les etapes (no són de Blender, però revisa-les)

- Totes les etapes obren la pestanya Modifiers, excepte la 8 (Suau o pla), que obre Data. Les comprovacions miren la pila i el resultat dels modificadors
- 1. Suavitzar: Subdivision Surface (Catmull-Clark) amb Levels Viewport 2, afegit amb Add Modifier. Ctrl+2 només s'explica, perquè al navegador canvia de pestanya
- 2. Loops de suport: el cub ja té Subdivision 2. Silueta del resultat contra un cub amb loops a ±0,8, amb un llindar del 99 %: passen els loops de 0,6 cap a fora; no passen els que queden al terç (on els deixa Ctrl+R) ni a 0,5. La pista proposa 2 talls i S eix 2.4
- 3. Mirror: mitja caixa oberta a X = 0. Cal un Mirror en X, amb Merge (costura tancada) i Clipping
- 4. Array: un esglaó de 0,5 × 2 × 0,25 m. Cal Count 6 i Relative Offset X = 1, Z = 1 (es comprova per l'alçada i la profunditat del resultat)
- 5. Bevel no destructiu: una llosa de 2 × 2 × 0,5 m. Cal un Bevel amb Limit Method Angle i 3 segments, i la malla base no pot haver canviat (si l'apliques, no val)
- 6. L'ordre importa: mitja caixa amb [Subdivision, Mirror]. Cal que el Mirror vagi primer; després es compara la silueta amb el resultat correcte
- 7. Gruix: un pla amb Solidify de 0,1 m (en valor absolut) i Fill Rim
- 8. Suau o pla: un cilindre; per ordre, Shade Smooth, Shade Flat i Shade Auto Smooth
- 9. Aplicar: mitja caixa amb [Mirror, Subdivision]. Cal aplicar el Mirror i conservar el Subdivision; si s'esborra el Mirror, l'etapa ho detecta
- 10. Repte final: el tamboret del Lab 02 (silueta, 85 %), amb un Mirror a la pila, com a molt 24 cares a la malla base i el resultat net (sense costures obertes, duplicats ni n-gons). Sense pistes; temps i operacions en acabar
- Al Lab 03 no hi ha analitzador de topologia: analitzaria la malla base, i al repte final una part oberta per fer Mirror semblaria plena d'errors
- El plànol del tamboret de l'índex no canvia: el Lab 03 no hi afegeix línies

## Fase 6 — Poliment

- Rendiment (mesurat a l'ordinador de desenvolupament, sense GPU): un cub amb Mirror, Array de 3 i Subdivision de nivell 3 (2.304 cares) costa uns 4 ms per avaluar la pila i uns 6 ms per calcular normals i geometria a cada fotograma d'arrossegament. Abans de la fase 6 eren uns 5 i 14 ms
- Les comprovacions de les etapes s'executen a cada canvi, també quan només gires la vista; al Lab 03 es guarden fins que canvia la malla
- [ ] Cal mesurar-ho en un ordinador d'aula: arrossegar Levels Viewport i Count d'un Array amb el cub subdividit ha d'anar fluid, i girar la vista també
- Estat de les caselles del Lab 03 en tancar-lo: 17 validades, 72 preguntes obertes (❓) i 29 comprovacions per fer amb Blender obert al costat
- Pendent fora del codi: exportar de Blender les malles de referència de `tests/fixtures/blender/README.md` (Subdivision, Bevel i Solidify) perquè els tests les comparin vèrtex a vèrtex

# Lab 04 — Llum

Parteix del Lighting Lab de cifog-lab (xavikai), amb permís del seu autor. Tot el que se n'ha portat es valida igual que la resta.

## Fase 1 — Dades de les llums, física i Shift+A

### Llums i World

- [ ] ❓ Tipus de llum: Point, Sun, Spot i Area. Paràmetres: Color, Power (W) o Strength al Sun (W/m²), Radius (Point i Spot), Angle (Sun), Spot Size i Blend, Shape (Square, Rectangle, Disk, Ellipse) i Size / Size Y (Area), Cast Shadow
- [ ] ❓ Valors per defecte d'una llum nova: Power 1000 W (Point, Spot i Area), Strength 1 (Sun), Radius 0,1 m, Angle 0,526°, Spot Size 45°, Blend 0,15, Area Square de 1 m, color blanc, Cast Shadow activat
- [ ] ❓ La llum de l'escena inicial és una Point de 1000 W
- [ ] ❓ World: color gris (0,0509 lineal) i Strength 1
- [ ] ❓ Temperatura de color (Blackbody): el lab la pot calcular, però no sabem si el panell de la llum de Blender 5.2 té l'opció de triar-la en kelvins. De moment no surt a la interfície

### Física (render/light-physics.ts)

- [ ] ❓ Point i Spot: E = P / (4π (d² + R²)) · cos θ ("Soft Falloff", activat per defecte des de la 4.0)
- [ ] Sun: E = Strength · cos θ, a qualsevol distància
- [ ] ❓ Area: panell difús d'intensitat (P / π) · cos θ, integrat amb 5 × 5 punts
- [ ] Al doble de distància, una Point il·lumina una quarta part
- [ ] ❓ La vora del con de l'Spot: Blend és la fracció del mig angle on la llum s'apaga, amb una corba suau
- [ ] ❓ El color de la llum multiplica la potència (una llum vermella de 1000 W il·lumina menys que una de blanca)

### Add (Shift+A)

- [ ] ❓ Shift+A al viewport en Object Mode i el menú Add de la capçalera: Mesh ▸, Curve, Surface, Metaball, Text, Volume, Grease Pencil | Armature, Lattice | Empty, Image | Light ▸, Light Probe | Camera, Speaker | Force Field | Collection Instance. Al lab només funcionen Mesh (Plane, Cube, UV Sphere, Cylinder, Cone, Torus) i Light (Point, Sun, Spot, Area)
- [ ] ❓ L'objecte nou apareix al 3D Cursor (al lab, sempre a l'origen), sense rotació, seleccionat i actiu; els altres es deseleccionen
- [ ] ❓ Noms: "Point", "Sun", "Spot", "Area", "Plane", "Cube", "Sphere" (la UV Sphere), "Cylinder", "Cone", "Torus", amb .001 si ja existeix
- [ ] ❓ Noms a Undo History: "Add Light", "Add Cube", "Add UV Sphere"...
- Decisió del lab: Shift+A i el menú Add només funcionen als labs que ho ensenyen (a partir del 04). En Edit Mode el menú Add no hi és: a Blender hi afegeix primitives dins de la malla
- Fora d'abast per ara: el panell Adjust Last Operation d'Add
