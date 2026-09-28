# Labs de Blender — índex, dependències i ordre de construcció

## Ordre d'ensenyament

| Lab | Títol | Especificació |
|---|---|---|
| 01 | Viewport i transformacions | `01-viewport.md` |
| 02 | Mode Edició i modelat bàsic | `02-edit-mode.md` |
| 03 | Modificadors | `03-modifiers.md` |
| 04 | Llum | `04-lights.md` |
| 05 | Materials i nodes | `05-materials.md` |
| 06 | Càmera i composició | `06-camera.md` |
| 07 | Render i sortida | `07-render.md` |
| 08 | Animació bàsica | `08-animation.md` |
| 09 | Graph Editor | `09-graph-editor.md` |
| 10 | Projecte final: el tamboret | `10-final-project.md` |

L'objecte que travessa tot el curs és un **tamboret**: es modela al Lab 02, es
perfecciona amb modificadors al 03, s'il·lumina al 04, s'hi posa material al 05, es fotografia,
es renderitza i s'anima al projecte final. És també l'objecte del plànol de la pàgina índex
(`docs/DESIGN.md`). Cada lab superat hi afegeix línies.

## Ordre de construcció

**Canvi de Joan (28/09/2026):** Llum passa a ser el Lab 04 i Materials el Lab 05 (abans era
al revés), i es construeixen en aquest ordre després del 03. El Lab 04 parteix del Lighting
Lab de `xavikai/cifog-lab` (amb permís del seu autor; vegeu "Feina aprofitada" més avall).
Els labs 01, 02 i 03 ja estan fets.

L'ordre recomanat original era aquest (amb els números nous):

No coincideix amb l'ordre d'ensenyament. La idea és tenir aviat labs útils a l'aula i
deixar per al final els que tenen més risc tècnic.

1. **01** Viewport i transformacions (nucli i base de Blender)
2. **04** Llum (introdueix el mòdul de render; el Properties Editor ja es va fer al 03)
3. **06** Càmera
4. **08** Animació bàsica (introdueix les dades d'animació)
5. **09** Graph Editor
6. **02** Mode Edició (introdueix l'edició de malles; és el de més risc)
7. **03** Modificadors
8. **05** Materials i nodes (introdueix l'editor de nodes)
9. **07** Render i sortida
10. **10** Projecte final

Joan pot canviar aquest ordre. El que no es pot saltar són les dependències de la taula
següent.

## Components compartits de `src/apps/blender/`

Cada component es construeix al primer lab que el necessiti **segons l'ordre de
construcció**, i els labs posteriors el reutilitzen. Si un lab en necessita una
ampliació, s'amplia sense trencar els labs anteriors (cal passar-ne els tests).

| Component | Carpeta | El necessiten | Es construeix a |
|---|---|---|---|
| Viewport, selecció, operadors G/R/S | `viewport/`, `operators/` | Tots | 01 |
| Malles editables | `mesh/` | 01 (primitives), 02, 03, 10 | 01 (dades), 02 (edició) |
| Properties Editor (pestanyes) | `ui/properties/` | 03, 04, 05, 06, 07 | 03 |
| Mòdul de render (Material Preview, Rendered, gestió del color) | `render/` | 04, 05, 06, 07, 10 | 04 |
| Dades d'animació (F-curves, avaluació) | `anim/` | 08, 09, 10 | 08 |
| Timeline i Dope Sheet | `ui/timeline/` | 08, 09, 10 | 08 |
| Graph Editor | `ui/graph-editor/` | 09, 10 | 09 |
| Pila de modificadors | `modifiers/` | 03, 10 | 03 |
| Editor de nodes | `ui/node-editor/`, `shading/` | 05, 10 | 05 |

## Decisió que cal prendre abans de la Fase 1 del Lab 01

**Quin renderer de three.js es fa servir.** El Lab 05 (Materials) necessita convertir grafs de nodes
de Blender en shaders. En les versions actuals de three.js, la manera natural de fer-ho és
amb TSL (three.js Shading Language) i `WebGPURenderer`, que té un backend WebGL2 per als
navegadors sense WebGPU. Si el Lab 01 es construeix amb `WebGLRenderer` clàssic, més
endavant caldrà migrar-lo.

Recomanació: `WebGPURenderer` + TSL des del Lab 01, **sempre que** la versió de three.js
del projecte ho suporti de manera estable i funcioni bé en els ordinadors de l'aula.
Claude Code ho ha de verificar amb la versió concreta de three.js abans de decidir-ho, i
presentar-me la decisió al pla de la Fase 1.

## Feina aprofitada: cifog-lab

`https://github.com/xavikai/cifog-lab` (web: `https://xavikai.github.io/cifog-lab/`) té labs
semblants en JavaScript sense frameworks. El seu autor ha donat permís a Joan per aprofitar-ne
la feina (28/09/2026; el repositori encara no té fitxer de llicència). No es copia tal qual: se'n
porten els algorismes i les dades a la nostra arquitectura (TypeScript, core/apps/labs, Z amunt,
historial), amb una nota "Adaptat de cifog-lab (xavikai)" als fitxers i crèdit a la web. Tot el que
se n'aprofita passa igualment per `// FIDELITY?` i per la validació de Joan.

- **Lab 04 (Llum):** `labs/lighting/light.js` (física de les llums en unitats de Blender,
  Blackbody), `scene.js` (llums de three.js, ombres suaus progressives, World i HDRI procedurals),
  Color Management (Standard, AgX, False Color) i el bust de guix CC0 (`assets/bust.bin`).
- **Lab 05 (Materials):** la conversió del Principled BSDF a `MeshPhysicalMaterial` de
  `labs/materials/`, les textures CC0 i les fitxes dels paràmetres. El seu editor de nodes és un
  graf fix; el nostre ha de ser general (Shift+A, qualsevol node).

## Com es valida la fidelitat

- **Geometria (Labs 02, 03):** Joan exporta des de Blender 5.2 malles de referència en OBJ
  (per exemple, un cub amb Subdivision nivell 2, o un bevel de 3 segments). Es desen a
  `tests/fixtures/blender/` i els tests comparen vèrtex a vèrtex amb tolerància.
- **Comprovació de les etapes:** les imatges de referència amb què es compara el treball de
  l'alumne es generen **amb el mateix renderer del lab**, a partir d'una escena solució.
  Així la comparació és justa.
- **Material didàctic:** quan un lab vol mostrar com queda una cosa al Blender real (per
  exemple, EEVEE contra Cycles), Joan aporta renders estàtics fets amb Blender. Mai es
  presenta un render del lab com si fos de Blender.
- Tot element que no sigui idèntic a Blender es documenta a `docs/fidelity/blender.md`.

## Elements del lab i elements de Blender

Alguns labs afegeixen ajudes que Blender no té (fantasmes de posició, gràfic de
velocitat, analitzador de topologia, mesurador de llum...). Sempre s'han de dibuixar amb
l'estil de l'embolcall (`docs/DESIGN.md`), mai amb el de Blender, perquè l'alumne no
els busqui després al programa real.
