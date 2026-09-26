# Lab 01 — Viewport i transformacions

Primer lab de la col·lecció i, alhora, el que construeix el motor compartit. Després de fer
aquest lab, l'alumne ha de saber moure's pel viewport, canviar de vista, seleccionar
objectes i moure'ls, rotar-los i escalar-los amb precisió, tal com ho faria a Blender.

Llegeix `CLAUDE.md` abans de res. Tot el que diu aquí s'aplica a aquest lab.

---

## 1. Interfície replicada

Una sola pantalla que imita el workspace Layout de Blender, simplificat:

- **Top bar:** menús visibles però inactius (File, Edit, Render, Window, Help) i les
  pestanyes de workspace amb només "Layout" activa. Són decoració, però amb el text
  correcte.
- **Capçalera del viewport:** selector de mode amb "Object Mode" (és l'únic mode
  disponible en aquest lab) i els menús View / Select / Add / Object com a decoració.
- **Viewport 3D (zona principal):**
  - Fons, graella i colors del tema per defecte de Blender. Línia de l'eix X vermella,
    de l'eix Y verda, graella al pla XY (Z amunt).
  - Text a la part superior esquerra: el nom de la vista ("User Perspective",
    "Front Orthographic", etc.) i a sota "(1) Collection | <objecte actiu>".
  - Gizmo de navegació a la part superior dreta: esferes d'eixos X/Y/Z clicables per
    alinear la vista, arrossegables per orbitar, i sota els botons de zoom, pan, càmera i
    perspectiva/ortogràfica.
  - Shading: Solid, amb una il·luminació d'estudi que s'assembli a la de Blender. Els
    objectes són grisos per defecte.
  - Contorn de selecció: objecte actiu en taronja clar, seleccionats en taronja fosc,
    com al tema per defecte. `// FIDELITY?` amb els valors exactes.
- **Outliner (dalt a la dreta):** Scene Collection > Collection > objectes, amb la icona
  de tipus. Clic per seleccionar, Ctrl+clic per afegir a la selecció. `// FIDELITY?` amb el
  comportament exacte de clic i de Ctrl+clic.
- **Panell N (lateral del viewport, es mostra i s'amaga amb N):** pestanya Item >
  Transform, amb Location, Rotation (XYZ Euler, en graus), Scale i Dimensions. Els camps
  s'editen amb clic i teclat i també arrossegant horitzontalment. Qualsevol canvi fet des
  d'aquí passa per un operador amb undo.
- **Barra d'estat (a baix):** en repòs, les accions del ratolí. Durant un operador
  modal, les tecles disponibles (Confirm, Cancel, X/Y/Z axis...), tal com fa Blender.
- **Capçalera durant un operador modal:** el text de l'operació en curs, per exemple el
  desplaçament i l'eix a Grab. `// FIDELITY?` amb el format exacte per a G, R i S.

Fora de la rèplica de Blender, i amb un estil visual clarament diferent perquè no es
confongui amb el programa:

- **Panell del lab** (columna lateral o calaix plegable): títol de l'etapa, consigna,
  botó "Pista", estat de la comprovació, botó "Reinicia l'etapa" i navegació entre etapes.
- **Overlay de tecles** (a baix a l'esquerra, activable i desactivable): mostra les
  tecles i els clics que prem l'alumne, a l'estil de Screencast Keys.
- **Preferències del lab:** dos interruptors que reprodueixen les opcions de Blender
  *Emulate 3 Button Mouse* i *Emulate Numpad*, amb una frase que expliqui on es troben a
  Blender (Preferences > Input). Desactivats per defecte, com a Blender. Si es detecta que
  l'alumne intenta orbitar sense botó del mig, suggereix activar l'emulació.

## 2. Escena inicial

Configurable per etapa. Hi ha d'haver un conjunt base semblant a l'escena per defecte de
Blender (Cube, Camera, Light) més els objectes que necessiti cada etapa: primitives
senzilles (cube, UV sphere, cylinder, cone, torus, plane) amb noms en anglès com els que
posaria Blender (Cube.001, Sphere...).

- Camera i Light es dibuixen com a Blender (piràmide de la càmera, icona de la llum) i es
  poden seleccionar i transformar.
- Les siluetes "fantasma" que marquen on ha d'anar un objecte són elements del lab, no
  objectes de l'escena: no surten a l'Outliner ni es poden seleccionar.

## 3. Navegació

| Acció | Entrada | Amb emulació 3 botons |
|---|---|---|
| Orbitar | Arrossegar amb botó del mig | Alt + botó esquerre |
| Desplaçar | Shift + botó del mig | Shift + Alt + botó esquerre |
| Zoom | Roda / Ctrl + botó del mig | Ctrl + Alt + botó esquerre |
| Vistes | Numpad 1 / 3 / 7 (Ctrl per a la vista oposada) | fila de números si Emulate Numpad està activat |
| Perspectiva/orto | Numpad 5 | |
| Enquadrar la selecció | Numpad . | |
| Enquadrar-ho tot | Home | |
| Vista de càmera | Numpad 0 | |
| Girar la vista 15° | Numpad 4 / 6 / 8 / 2 | |

- Orbitació tipus turntable al voltant del centre de la vista, com fa Blender per defecte.
- Auto Perspective activat (és el valor per defecte): en anar a una vista d'eix, la vista
  passa a ortogràfica i, en tornar a orbitar, recupera la perspectiva.
- Les transicions de vista són suaus (Smooth View) i instantànies amb
  `prefers-reduced-motion`.
- `// FIDELITY?` amb la velocitat d'orbitació, la sensibilitat del zoom i la durada de
  Smooth View.

## 4. Selecció

- Clic esquerre: selecciona l'objecte i el fa actiu; deselecciona la resta.
- Shift+clic: si l'objecte no està seleccionat, l'afegeix i el fa actiu. Si està
  seleccionat però no és l'actiu, el fa actiu. Si ja és l'actiu, el deselecciona.
- Clic al buit: ho deselecciona tot.
- Arrossegar al buit amb el botó esquerre: selecció per caixa (eina Select Box per
  defecte). B: selecció per caixa.
- A: selecciona-ho tot. Alt+A: deselecciona-ho tot. Ctrl+I: inverteix la selecció.
- `// FIDELITY?` amb qualsevol cas límit que no quedi clar.

## 5. Transformacions (operadors modals)

G (Grab), R (Rotate) i S (Scale), aplicats a tots els objectes seleccionats. El pivot és
Median Point (l'únic en aquest lab).

- **Moviment del ratolí:**
  - G: l'objecte segueix el ratolí en el pla de la vista.
  - R: angle al voltant de la posició del pivot en pantalla. Sense restricció, gira al
    voltant de l'eix de visió.
  - S: proporció de distàncies en pantalla entre el pivot i el ratolí.
- **Restricció d'eix:** X/Y/Z una vegada és l'eix global; una segona vegada, l'eix
  local; una tercera, sense restricció. Shift+X/Y/Z exclou l'eix i restringeix al pla.
  Clic amb el botó del mig durant l'operació: restricció a l'eix més proper.
  `// FIDELITY?`
- **Guies visuals:** línia de l'eix actiu amb el color de l'eix, i la línia discontínua
  entre el pivot i el cursor a R i S, com a Blender.
- **Entrada numèrica:** en escriure números, el valor passa a ser exacte (metres, graus
  o factor). Accepta signe menys, decimals i Backspace. Amb restricció d'eix, s'aplica a
  aquell eix.
- **Modificadors:** Ctrl ajusta per increments. Shift dona precisió.
- **Confirmar:** Enter o clic esquerre. **Cancel·lar:** Esc o clic dret, i l'objecte
  torna a l'estat inicial exacte.
- **Esborrar transformacions:** Alt+G, Alt+R i Alt+S.
- **Undo i redo:** Ctrl+Z i Ctrl+Shift+Z. Cada operació confirmada és un pas d'undo.
- Fora d'abast en aquest lab: R R (trackball), orientacions de transformació
  diferents de Global/Local, altres pivots, snapping a elements i el 3D cursor. Si
  l'alumne prem aquestes tecles, no ha de passar res estrany.

Aquesta és la part on més s'ha de vigilar la fidelitat. Fes tests unitaris de la màquina
d'estats: seqüències de tecles i valors resultants.

## 6. Etapes

Cada etapa és un objecte de dades a `stages.ts`: id, títol, consigna, escena inicial,
tecles destacades, pistes progressives (la primera es mostra amb el botó "Pista" i la
segona si l'alumne porta estona encallat), funció de comprovació sobre l'estat i missatge
d'èxit. Tots els textos van a `ca.json`.

1. **Orbitar.** Un objecte gran té tres cares marcades amb un símbol, en llocs que
   només es veuen orbitant (una és a sota). La comprovació passa quan la vista ha
   apuntat a cada cara, dins d'un con d'angle raonable. Les cares ja vistes es marquen.
2. **Desplaçar i fer zoom.** Un objecte petit i llunyà s'ha d'enquadrar al centre de la
   vista i ha d'ocupar almenys una mida mínima a la pantalla.
3. **Enquadrar amb precisió.** Seleccionar un objecte concret i fer servir Numpad . (la
   consigna explica que és la manera ràpida de fer el que han fet a l'etapa 2).
4. **Vistes.** Anar en ordre a Front, Right, Top i Back. La comprovació llegeix el nom
   de la vista actual. La consigna explica per què la vista passa a ortogràfica.
5. **Selecció.** Seleccionar exactament un conjunt d'objectes (per exemple, totes les
   esferes) amb un objecte concret com a actiu. Si no és correcte, el missatge ha de dir
   què falla: "sobra un objecte", "l'objecte actiu no és el correcte"...
6. **Moure.** Portar un cub fins a la seva silueta fantasma. Primer amb tolerància
   (0,1 m). Després, un altre cub que només es pot encaixar bé fent servir la restricció
   d'eix: la comprovació exigeix que els altres dos eixos no hagin canviat.
7. **Valors exactes.** Aconseguir location, rotation i scale exactes (per exemple, pujar
   2 m en Z, girar 45° en Z i escalar ×1,5) amb entrada numèrica. Tolerància de 1e-4. Si
   el valor és gairebé correcte però no exacte, la pista ha de suggerir escriure el número.
8. **Cancel·lar i desfer.** Començar a moure un objecte i cancel·lar amb clic dret;
   després fer un canvi i desfer-lo amb Ctrl+Z. Es comprova amb el registre d'operacions i
   amb l'estat final, que ha de ser igual a l'inicial.
9. **Repte final.** Una escena desendreçada que s'ha d'ordenar fins que coincideixi amb
   les siluetes fantasma, fent servir tot l'anterior. No hi ha pistes automàtiques.
   Al final es mostren el temps i el nombre d'operacions, com a dada informativa, sense
   rànquing.

En acabar, un **mode lliure** amb la mateixa escena i totes les eines, sense comprovacions.

## 7. Pàgines del web

- **Pàgina del lab:** una introducció curta en català (què aprendràs, controls clau), el
  lab i, a sota, un bloc "Al Blender real" que connecti cada concepte amb on es troba al
  programa.
- **Pàgina índex de la col·lecció:** llistat de labs amb estat (disponible / aviat) i
  el progrés de l'alumne. De moment només hi haurà el Lab 01; la resta de l'índex el
  definirem més endavant.
- Estil propi, sobri i fosc, que no s'assembli a cap altre projecte existent.

## 8. Fases

Atura't al final de cadascuna, tal com diu `CLAUDE.md`.

1. **Base i navegació.** Estructura del projecte, `coords.ts`, viewport amb graella,
   eixos, objectes i il·luminació tipus Solid, navegació completa, gizmo, vistes,
   Auto Perspective i emulacions. Tests de les matemàtiques de càmera. Desplegament
   automàtic a GitHub Pages amb una GitHub Action a cada push a `main`.
2. **Escena i selecció.** Model de dades, selecció al viewport i a l'Outliner, contorns
   de selecció, text de la capçalera del viewport.
3. **Operadors modals.** G/R/S complets, entrada numèrica, restriccions, cancel·lació,
   undo i redo, capçalera i barra d'estat contextuals. És la fase amb més tests.
4. **Panells.** Panell N editable, overlay de tecles i preferències del lab.
5. **Etapes i web.** Executor d'etapes, les 9 etapes, progrés, mode lliure, pàgina del
   lab i pàgina índex.
6. **Poliment.** Rendiment en ordinadors modestos, avís per a mòbil i
   `BLENDER-FIDELITY.md` complet perquè el pugui validar.
