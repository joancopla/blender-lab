# Lab 02 — Mode Edició i modelat bàsic

Segon lab de la col·lecció. L'alumne passa de moure objectes sencers a modificar-ne la
forma: vèrtexs, arestes i cares. En acabar, ha de ser capaç de modelar un objecte senzill a
partir d'un cub, tal com ho faria a Blender.

Llegeix `CLAUDE.md` abans de res. Aquest lab reutilitza tot el nucli comú i la part de Blender construïda al Lab 01: viewport,
navegació, selecció, operadors G/R/S, undo, panells i executor d'etapes. No en dupliquis
res. Si cal ampliar el nucli o la part de Blender, fes-ho de manera que el Lab 01 continuï funcionant igual, i
comprova-ho amb els seus tests.

Aquest és el lab tècnicament més difícil de la col·lecció. La dificultat no és la
interfície, sinó la geometria.

---

## 1. Estructura de malla (la base de tot el lab)

Abans de tocar cap interfície, cal una estructura de malla pròpia i ben testejada a
`src/apps/blender/mesh/`:

- Vèrtexs, arestes i cares, amb suport per a **n-gons** (cares de més de 4 costats), com
  a Blender.
- Una estructura d'adjacència (half-edge o equivalent) que permeti trobar de manera
  eficient els veïns, els edge loops i els edge rings, i saber si la malla és manifold.
- Normals coherents i recàlcul després de cada operació.
- Triangulació només per dibuixar amb three.js. El model de dades mai es triangula.
- Tests de consistència després de cada operació: fórmula d'Euler en malles tancades,
  absència d'arestes òrfenes i de cares degenerades, i orientació coherent.
- L'undo en Mode Edició es pot fer amb instantànies de la malla abans de cada operador.
  Les malles del lab són petites.

Fes aquesta estructura com a primera fase, amb tests, i atura't abans de continuar.

## 2. Entrar i sortir del Mode Edició

- Tab alterna entre Object Mode i Edit Mode. El selector de mode de la capçalera també
  funciona.
- Si hi ha diversos objectes seleccionats, tots entren en Edit Mode (multi-object
  editing). `// FIDELITY?`
- La capçalera del viewport i la barra d'estat canvien segons el mode, com a Blender.

## 3. Modes de selecció i visualització

- Vertex / Edge / Face select amb les tecles 1 / 2 / 3 i amb els botons de la capçalera.
  Shift+clic al botó combina modes.
- **Conflicte amb Emulate Numpad:** si l'emulació està activa, la fila de números canvia
  de vista. Replica el comportament real de Blender en aquest cas. `// FIDELITY?`
- Colors del tema per defecte: vèrtexs i arestes no seleccionats foscos, seleccionats en
  taronja, element actiu destacat; cares seleccionades amb tint taronja semitransparent.
  `// FIDELITY?` amb tots els valors i amb quan es mostren els punts de centre de cara.
- **X-ray** amb Alt+Z. Sense X-ray, la selecció per caixa només agafa els elements
  visibles; amb X-ray, també els que queden darrere. És un concepte clau del lab.
- Overlay **Statistics** activat en aquest lab (a Blender no ho està per defecte, i la
  consigna ho ha de dir). Mostra el recompte de vèrtexs, arestes, cares i triangles.

## 4. Selecció en Mode Edició

- Clic, Shift+clic, clic al buit, selecció per caixa, A, Alt+A i Ctrl+I, amb el mateix
  comportament que al Lab 01, però aplicat a components.
- Alt+clic: selecciona un edge loop. Shift+Alt+clic: l'afegeix a la selecció.
- Ctrl+Alt+clic: selecciona un edge ring. `// FIDELITY?`
- L: selecciona els elements connectats sota el cursor. Ctrl+L: tots els connectats a la
  selecció.
- Ctrl+Numpad + / −: fer créixer o reduir la selecció.

## 5. Transformar components

- G/R/S amb tots els comportaments del Lab 01: restriccions, entrada numèrica, Ctrl,
  Shift i cancel·lació. S'apliquen a la selecció de components, amb pivot Median Point.
- Local, en Mode Edició, fa referència a l'orientació de l'objecte. `// FIDELITY?` amb
  l'orientació Normal, que no s'implementa en aquest lab.
- Fora d'abast: proportional editing (O), edge slide (G G) i snapping.

## 6. Eines de modelat

Implementa-les una per una, cadascuna amb tests de topologia (recompte de vèrtexs,
arestes i cares esperat) i comparació visual amb Blender feta per mi.

| Eina | Drecera | Comportament que cal replicar |
|---|---|---|
| Extrude | E | Cares: extrude de regió al llarg de la normal. Vèrtexs i arestes: moviment lliure. Entra directament en moviment; cancel·lar el moviment deixa la geometria extrudida al lloc (com a Blender). |
| Inset | I | Inset de regió. Prémer I una altra vegada durant l'operació alterna a Individual. |
| Loop Cut and Slide | Ctrl+R | Previsualització groga del loop en passar pel damunt, roda del ratolí per canviar el nombre de talls, clic per confirmar i després lliscar. Clic dret en lliscar deixa el tall centrat. |
| Bevel | Ctrl+B | Bevel d'arestes amb la roda per canviar el nombre de segments. Ctrl+Shift+B per a vèrtexs. |
| Fill | F | Crea una aresta entre dos vèrtexs o una cara entre la selecció. |
| Delete | X / Supr | Menú amb Vertices, Edges, Faces, Only Faces, Dissolve Vertices, Dissolve Edges i Dissolve Faces. |
| Merge | M | Menú amb At Center, At Cursor (desactivat en aquest lab), Collapse i By Distance. |

- Cada eina mostra el panell **Adjust Last Operation** (a baix a l'esquerra), com a
  Blender, amb els paràmetres editables després de confirmar.
- **Bevel és la més complexa.** Ha de coincidir exactament amb Blender en els casos del
  lab: arestes d'un cub, amb diversos segments i profile per defecte. En casos límit que
  el lab no fa servir, es pot simplificar. Documenta aquests límits a
  `docs/fidelity/blender.md`.
- Fora d'abast: knife (K), spin, bridge edge loops, subdivide, i qualsevol eina
  que no sigui a la taula. Les tecles no han de fer res estrany.

## 7. Analitzador de topologia (element didàctic del lab)

Un panell del lab, no de Blender, que es pot activar i que marca al viewport:

- n-gons en groc i triangles en blau, amb un recompte;
- vèrtexs duplicats (a distància menor que un llindar);
- arestes no manifold;
- normals invertides.

Cada avís porta una frase curta en català sobre per què importa, i com es detectaria o
arreglaria al Blender real (Select > Select All by Trait, Merge by Distance, Recalculate
Normals). Aquest panell és el que fa que el lab ensenyi més que un tutorial.

## 8. Comprovació de formes

Per a les etapes on l'alumne ha de modelar una forma, cal comparar-la amb una de
referència sense exigir una topologia idèntica:

- Renderitza fora de pantalla les siluetes de la malla de l'alumne i de la de
  referència en les vistes Front, Right i Top, a baixa resolució.
- Calcula la coincidència de cada parella de siluetes (IoU). L'etapa passa si totes
  superen un llindar configurable per etapa.
- Afegeix comprovacions de topologia quan l'etapa ho requereixi: "sense n-gons", "entre
  X i Y cares", "sense vèrtexs duplicats".
- La retroalimentació ha de dir en quina vista falla i, si pot ser, en quina zona.
  Mostra una superposició de la silueta de referència en la vista que falla.

## 9. Etapes

Mateix format de dades que el Lab 01. Tots els textos van a `ca.json`.

1. **Tab i modes de selecció.** Entrar en Edit Mode i seleccionar exactament un conjunt
   de vèrtexs, després d'arestes i després de cares, indicats al model.
2. **Veure a través.** Seleccionar amb caixa tots els vèrtexs d'un costat del model,
   inclosos els de darrere. Sense X-ray no és possible, i la pista ho ha de fer descobrir.
3. **Edge loops.** Seleccionar un loop concret amb Alt+clic, i després dos loops alhora.
4. **Deformar.** Convertir un cub en una piràmide truncada movent i escalant la cara
   superior. Es comprova per siluetes.
5. **Extrude.** Fer una forma en L extrudint una cara. Es comprova per siluetes i pel
   recompte de cares.
6. **Inset i extrude cap endins.** Buidar una caixa per convertir-la en un recipient
   obert. Es comprova per siluetes i perquè la malla continuï sent manifold.
7. **Loop cuts.** Afegir el nombre exacte de talls indicat, a la posició demanada, i fer-los
   servir per donar forma.
8. **Bevel.** Arrodonir les arestes verticals d'una caixa amb un nombre concret de
   segments.
9. **Netejar una malla.** Una malla amb vèrtexs duplicats, una cara que sobra i un
   n-gon. L'alumne l'ha d'arreglar fent servir Merge by Distance, Delete i
   Dissolve. L'analitzador de topologia fa de guia.
10. **Repte final.** Modelar un objecte senzill a partir d'un cub (per exemple, una tassa
    o un tamboret), comparant-lo amb siluetes de referència i amb requisits de topologia
    neta. No hi ha pistes automàtiques.

En acabar, un **mode lliure** amb totes les eines i l'analitzador de topologia.

## 10. Pàgina del lab

Com al Lab 01: introducció en català, el lab i un bloc "Al Blender real" que connecti
cada eina amb el menú on es troba a Blender i expliqui què queda fora del lab.

## 11. Fases

Atura't al final de cadascuna.

1. **Estructura de malla.** `src/apps/blender/mesh/` complet, conversió a three.js i tests de
   consistència. Sense interfície.
2. **Edit Mode i selecció.** Tab, modes de selecció, visualització de components,
   X-ray, selecció (loops, rings, connectats), Statistics.
3. **Transformar components.** G/R/S en Edit Mode, undo per instantànies.
4. **Eines, primera part.** Extrude, Inset, Delete/Dissolve, Merge, Fill, i el panell
   Adjust Last Operation.
5. **Eines, segona part.** Loop Cut and Slide i Bevel. És la fase amb més risc.
6. **Analitzador i comprovació de formes.** Topologia, siluetes i IoU.
7. **Etapes i web.** Les 10 etapes, mode lliure i pàgina del lab.
8. **Poliment.** Rendiment, `docs/fidelity/blender.md` actualitzat i desplegament.
