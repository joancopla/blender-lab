# Lab 11 — Look neó (Visuals)

L'alumne aconsegueix un look neó sobre negre, a l'estil de Tron Legacy: objectes que brillen
amb línies de color saturat, una graella al terra i un halo de bloom. És per a l'alumnat del
cicle de Vídeo, Discjòquei i So, que farà visuals amb Blender projectats en una paret al
ritme de la seva música.

No és un lab de teoria de materials ni de composició. Té poques etapes, molt guiades, i cada
pas s'ha de notar molt a la pantalla. En acabar, l'alumne ha de saber fer el look al Blender
real, sense el lab.

Llegeix `CLAUDE.md` i `specs/blender/README.md` abans de res.

**Públic:** no és el grup d'Imatge i So de la resta del curs. Només ha fet l'equivalent al
Lab 01 (interfície, navegació, selecció, G/R/S, vista de càmera). No coneix el Properties
Editor, els modificadors, el Mode Edició ni l'editor de nodes. Cada etapa ensenya el mínim
imprescindible d'aquestes eines, i res més. El lab és independent del fil del tamboret.

**Depèn de** (components, no labs fets per l'alumne):

- Lab 01: motor, viewport, Shift+A, vista de càmera.
- Lab 03: Properties Editor i pila de modificadors (aquí s'hi afegeix **Wireframe**).
- Lab 04: mòdul de render (Rendered, pestanya World, AgX i Standard al model).
- Lab 05: editor de nodes (fases 1–2, ja fetes), compilació a GLSL amb Emission (fase 3) i
  pestanya Material amb el selector de materials (fase 4). **Aquest lab no es pot construir
  abans que el Lab 05 tingui acabades les fases 3 i 4.**

Construeix tres components nous: el **compositor** mínim, la **cadena HDR amb bloom** i el
panell **Color Management** de la pestanya Render (el Lab 07 l'ampliarà).

Les dades de Blender d'aquesta especificació estan verificades al codi font de Blender 5.2.1
o executant Blender 5.1.2 en segon pla; cada element diu d'on surt a
`docs/fidelity/blender.md`. La resta va marcada `// FIDELITY?`.

---

## 1. Interfície replicada

### Disposició

Viewport a dalt i un editor de nodes a baix, com al Lab 05, amb el Properties Editor a la
dreta. L'editor de baix té el menú **Editor Type** de Blender, i s'hi pot triar **Shader
Editor** o **Compositor**. És el mateix que fa Blender: el Shader Editor i el Compositor són
el mateix editor de nodes amb un tipus d'arbre diferent. El lab comença amb l'editor de baix
en Compositor però plegat, i l'etapa 4 el desplega.

`// FIDELITY?` Al Blender real, el workspace Compositing no té viewport 3D; el lab no replica
aquest workspace (vegeu "Al Blender real").

### Add (Shift+A) i Adjust Last Operation

- **Shift+A > Mesh** afegeix **Grid** a les primitives que ja hi ha (Plane, Cube, UV Sphere,
  Cylinder, Cone, Torus).
- Grid nova (verificat a la 5.1.2): X Subdivisions 10, Y Subdivisions 10, Size 2 m. Dona
  11 × 11 vèrtexs i 10 × 10 cares. Nom de l'objecte: "Grid".
- **Adjust Last Operation** després d'Add Grid: X Subdivisions, Y Subdivisions, Size,
  Generate UVs (sense efecte al lab), Align, Location, Rotation. Al lab només funcionen les
  tres primeres; la resta surten però no fan res. `// FIDELITY?` amb l'ordre i el nom exacte
  dels camps a la 5.2. El panell ja existeix per a les eines del Mode Edició
  (`ui/adjust-panel.ts`); aquí es fa servir també per a Add Grid.
- Decisió del lab: l'Adjust Last Operation de les altres primitives continua fora d'abast.

### Modificador Wireframe (amplia la pila del Lab 03)

Add Modifier > Generate > **Wireframe**. Panell (verificat al codi de la 5.2.1,
`MOD_wireframe.cc`):

| Camp | Per defecte | Al lab |
|---|---|---|
| Thickness | 0.02 m | Sí |
| Offset | 0 | Sí |
| Boundary | Desactivat | Sí |
| Replace Original | Activat | Sí |
| Thickness: Even | Activat | Sí |
| Thickness: Relative | Desactivat | Sí |
| Crease Edges (i el pes) | Desactivat | Surt, sense efecte |
| Material Offset | 0 | Surt, sense efecte |
| Vertex Group (subpanell) | — | Surt, sense efecte |

- Genera, per a cada aresta, un tub prismàtic de secció quadrada amb gruix Thickness, i les
  unions als vèrtexs. Amb Replace Original desactivat, també hi deixa la malla original.
- Es valida amb fixtures OBJ de Blender 5.2 (vegeu "Com es valida la fidelitat" al README):
  com a mínim, una Grid de 4 × 4 i un cub, tots dos amb Wireframe per defecte, i el cub amb
  Even desactivat.
- Els tests del Lab 03 han de continuar passant. El menú Add Modifier del Lab 03 mostra
  Wireframe actiu només als labs que l'activen.

### Pestanya Material (del Lab 05)

Es fa servir sense obrir l'editor de nodes: botó **New**, selector per triar un material que
ja existeix (perquè la graella i el cub comparteixin el neó), nom del material i panell
Surface amb el Principled BSDF. L'alumne obre el subpanell **Emission**: Color i Strength.
Material nou (verificat al codi de la 5.2.1): Emission Color blanc, Emission Strength 0.

### Pestanya World (del Lab 04)

Color i Strength del node Background. Valor per defecte (verificat a la 5.1.2): gris 0.0509
lineal, Strength 1.

### Pestanya Render: Color Management (nou)

Un panell **Color Management** mínim, que el Lab 07 ampliarà:

- **View Transform** (verificat a la 5.1.2): Standard, Khronos PBR Neutral, AgX, Filmic,
  Filmic Log, False Color, Raw. Per defecte, AgX. Al lab només funcionen AgX i Standard; la
  resta surten en gris. `// FIDELITY?` amb l'ordre del desplegable a la 5.2.
- **Display Device** (sRGB), **Look** (None), **Exposure** i **Gamma** surten però no es
  poden canviar en aquest lab.
- La resta de la pestanya Render (Render Engine EEVEE, Sampling...) surt plegada i inactiva.

### Viewport Shading: Compositor (nou)

El desplegable de Viewport Shading (la fletxa al costat dels quatre botons de shading) té el
subpanell **Compositor**, amb tres botons: **Disabled | Camera | Always**. Per defecte,
Disabled. Només surt en Material Preview i Rendered. (Verificat al codi de la 5.2.1:
`VIEW3D_PT_shading_compositor`.) Camera vol dir "només en vista de càmera".

`// FIDELITY?` La resta del desplegable de Viewport Shading (Lighting, Color, Background,
Options...). El lab només en replica el subpanell Compositor, amb una nota a
`docs/fidelity/blender.md`.

### Compositor (nou)

- **Capçalera:** botó **New** quan l'escena no té arbre de composició. New crea un node
  group de tipus Compositor anomenat "Compositor Nodes", l'assigna a l'escena i hi posa
  **Render Layers → Reroute → Group Output** i el mateix Reroute cap a **Viewer**
  (verificat a la 5.1.2; a la 5.2.1, el botó crida el mateix operador,
  `NODE_OT_new_compositing_node_group`). A la sèrie 5.x ja no hi ha casella Use Nodes ni
  node Composite: la sortida és el Group Output.
- **Nodes dins d'abast:** Render Layers (sortides Image i Alpha), Glare, Group Output,
  Viewer, Reroute.
- **Shift+A** amb les categories del compositor de la 5.2. Glare és a **Filter**, i el menú
  ofereix entrades directes per a cada tipus ("Glare ▸ Bloom"...). `// FIDELITY?` amb com es
  mostra l'entrada amb el tipus al menú i a la cerca. Els nodes que el lab no implementa
  surten en gris, com al Lab 05.
- **Node Glare** (verificat al codi de la 5.2.1, `node_composite_glare.cc`):
  - Sortides Image, Glare i Highlights.
  - Entrades de menú **Type** (Bloom, Ghosts, Streaks, Fog Glow, Simple Star, Sun Beams,
    Kernel; per defecte **Streaks**) i **Quality** (High, Medium, Low; per defecte
    Medium).
  - Panell **Highlights** (plegat per defecte): Threshold 1.0 (≥ 0), Smoothness 0.1
    (0–1), i el subpanell Clamp (plegat) amb Clamp desactivat i Maximum 10.
  - Panell **Adjust**: Strength 1.0 (0–1), Saturation 1.0 (0–1), Tint blanc.
  - Panell **Glare**: Size 0.5 (0–1), que només es fa servir amb Bloom, Fog Glow i Sun
    Beams. Els altres camps del panell (Streaks, Iterations, Fade...) només es fan servir
    amb els seus tipus.
  - Al lab només funciona el tipus **Bloom**. Els altres es poden triar, però el node passa
    la imatge tal qual i el lab mostra un avís.
  - `// FIDELITY?` Si Blender amaga o només enfosqueix els camps que no es fan servir amb el
    tipus triat (`usage_by_menu`).
- Això vol dir que l'editor de nodes necessita tres coses que el Lab 05 no té: sockets de
  tipus **menú** (Type, Quality), el node **Reroute** i els nodes **Group Output** i
  **Viewer** sense entrades de shader.
- Desfer: Add Node, Link Nodes, Delete... com al Lab 05; New crea un pas propi.
  `// FIDELITY?` amb el nom del pas de New.

## 2. Comportament i límits

### El que fa el compositor al viewport

- Amb Compositor a Always (o a Camera, en vista de càmera), en Material Preview i Rendered,
  la imatge del viewport passa pel node tree del compositor abans del View Transform, com a
  Blender. Sense node tree, o en Solid i Wireframe, no hi passa.
- El viewport mostra el que arriba al **Group Output**. `// FIDELITY?` Si el viewport de
  Blender 5.2 mostra el Viewer actiu en lloc del Group Output. Amb el node tree que crea New,
  el Viewer penja del mateix Reroute: si el Glare s'insereix entre el Reroute i el Group
  Output, el Viewer no té bloom. La consigna demana inserir el Glare entre Render Layers i el
  Reroute, que funciona en tots dos casos.
- Un enllaç vermell o un node tree sense camí fins al Group Output deixa el viewport sense
  composició, i el lab ho diu.

### Bloom (el mateix algorisme que Blender)

El Bloom del Glare de la 5.2.1 és una cadena de mipmaps, que és barata i es pot portar tal
qual a WebGL:

1. **Highlights:** per a cada píxel, la brillantor (V en HSV, és a dir, el canal més alt)
   es retalla suaument entre Threshold i Maximum (si Clamp és activat) amb Smoothness, i
   se'n resta Threshold. Es calcula a la mida de Quality: High a mida completa, Medium a la
   meitat, Low a una quarta part.
2. **Cadena:** llargada = `floor(log2(max(1, costat_curt × Size)))`. La primera reducció fa
   servir la mitjana de Karis; les altres, un filtre de reducció a la meitat. Després es
   torna a ampliar amb un filtre tent de 3 × 3, sumant a cada pas el nivell de la mateixa
   mida.
3. **Barreja:** sortida = imatge + glare × Tint × Strength / llargada de la cadena, després
   d'ajustar la saturació del glare amb Saturation.

Tot això es fa en color lineal i HDR, **abans** del View Transform. Per això, amb AgX,
l'halo també tendeix a blanc, no només el neó.

### Cadena de render

Ara el viewport fa servir `WebGLRenderer` i el tone mapping s'aplica en dibuixar. Per al
compositor cal:

1. Dibuixar l'escena en un render target HDR (`HalfFloatType`), lineal i sense tone mapping.
   L'acumulador de Rendered (`render/accumulator.ts`) continua treballant igual i el
   compositor llegeix el resultat acumulat.
2. Passades del Glare (highlights, cadena de reducció, cadena d'ampliació, barreja), cadascuna
   amb un quad a pantalla completa.
3. Una passada final amb el View Transform (AgX o Standard) i la conversió a sRGB.
4. Al final de tot, la simulació de projector (vegeu la secció 4), si està activada.

La graella del viewport, els contorns i les icones es dibuixen a sobre, sense compositor, com
ara.

**Cost estimat** (cal mesurar-lo amb `?perf` en un ordinador de l'aula). Amb un viewport
intern de 1600 × 900 i Quality Medium, els highlights es fan a 800 × 450 i la cadena té
`floor(log2(450 × 0.5)) = 7` nivells. Totes les reduccions i ampliacions sumen menys d'1/3
dels píxels dels highlights. La passada més cara és la barreja a mida completa (1,4 Mpx), una
mostra bilineal per píxel. En total, unes 7 + 6 + 3 passades lleugeres i uns 2,5 Mpx
processats per fotograma: s'espera entre 0,5 i 1,5 ms en una gràfica integrada. El render
target HDR afegeix memòria (uns 11 MB a 1600 × 900) i obliga a fer l'antialiàsing al render
target (MSAA de WebGL2) en lloc del canvas. Si no arriba a 60 fps, l'ordre de rebaixa és:
Quality Low interna (sense canviar el que veu l'alumne), i després la resolució adaptativa del
Lab 04.

### Límits

- Sense llums a l'escena inicial: en un look neó, la llum la fan els objectes.
- L'Emission del lab no il·lumina els altres objectes. Al Blender real, a EEVEE una superfície
  emissiva pot il·luminar els objectes del costat. `// FIDELITY?` amb el comportament a la
  5.2. Amb el World negre i sense llums, la diferència és petita.
- Glare només amb el tipus Bloom.
- Els valors de color que veu l'alumne i que es comproven són lineals, com a Blender.

## 3. Fora d'abast

Els altres nodes del compositor i els altres tipus de Glare. El workspace Compositing, el
render amb F12 i la sortida de vídeo (només a la pàgina). Animació i sincronització amb la
música. Cycles. La llum que fa l'Emission sobre els altres objectes. El node Emission de
l'editor de nodes (es pot fer servir en mode lliure, però les etapes fan servir el panell
Emission del Principled). Freestyle, Geometry Nodes i el Mode Edició.

## 4. Element del lab: prova de projector

No és de Blender: es dibuixa amb l'estil de l'embolcall (`docs/DESIGN.md`) i l'alumne no l'ha
de buscar al programa real.

- Un interruptor al panell de l'etapa: "Prova de projector". Quan està activat, el viewport
  té una etiqueta a dalt al mig, amb l'estil de les ajudes del lab: "Simulació de projector ·
  no és de Blender".
- Simula una paret projectada en una aula amb una mica de llum, en una passada final sobre la
  imatge ja en sRGB:
  - negres aixecats (el negre passa a un gris fosc, uns 0,10);
  - menys contrast i una mica menys de saturació;
  - suavitzat d'uns 2 px equivalents a 1920 × 1080, perquè les línies fines es perdin com a
    la paret;
  - una mica de caiguda de llum a les vores.
- Cost: una passada a mida completa i un desenfocament separable petit. Uns 0,3 ms.
- Decisió que cal prendre (vegeu les preguntes): un sol perfil o dos ("Aula amb llum" i
  "Sala fosca").

## 5. Etapes

L'escena inicial té el Cube de Blender aixecat a Z = 1 m (perquè quedi sobre la graella),
la Camera de l'escena per defecte i el Light de l'escena per defecte. El World és el per
defecte i el viewport és en Solid. Les comprovacions llegeixen l'estat a través del contracte.
Només el repte final analitza una imatge, feta amb el renderer del lab.

1. **Apagar-ho tot.** Passar a Rendered (Z o els botons de la capçalera), posar el World
   negre (Color negre o Strength 0) i esborrar el Light. La pantalla queda negra: és el punt
   de partida. La consigna explica que en Material Preview el World no es veu, perquè fa
   servir un HDRI propi.
   *Comprova:* shading Rendered; luminància del Color × Strength ≤ 0,001; cap llum a l'escena.
2. **Primer neó.** Seleccionar el cub, a la pestanya Material fer New, anomenar el material
   (per exemple, "Neó cian"), obrir Emission i posar un Color cian saturat i Strength alta.
   El cub brilla sobre negre.
   *Comprova:* el cub té un material amb Emission Strength ≥ 5; to del color dins del cian
   (170°–200°) i saturació ≥ 0,8.
3. **La graella.** Shift+A > Mesh > Grid; a Adjust Last Operation, Size 20 m i 20 × 20
   subdivisions. A la pestanya Modifiers, Add Modifier > Generate > Wireframe. A la pestanya
   Material, triar "Neó cian" amb el selector. Amb Replace Original, només en queden les
   línies.
   *Comprova:* hi ha una Grid amb Size ≥ 10 m i ≥ 10 subdivisions per costat, amb Wireframe
   (Replace Original activat) i un material emissiu.
4. **Encendre el bloom.** Desplegar l'editor de baix (ja és en Compositor) i fer New.
   Shift+A > Filter > Glare ▸ Bloom i deixar-lo anar sobre l'enllaç entre Render Layers i el
   Reroute. Després, a Viewport Shading, posar Compositor a Always. Apareix l'halo.
   La consigna avisa que sense el pas d'Always el bloom no es veu al viewport.
   *Comprova:* l'escena té node tree de composició; hi ha un camí Render Layers → Glare
   (Type Bloom) → … → Group Output; Compositor a Always, o a Camera en vista de càmera.
5. **AgX o Standard.** A la pestanya Render > Color Management, canviar View Transform
   d'AgX a Standard i tornar-hi. Amb AgX el neó i el seu halo es tornen blancs; amb Standard,
   el cian es manté. Triar Standard.
   *Comprova:* View Transform Standard i, al registre d'operacions, almenys un canvi
   d'AgX a Standard i un de tornada (que hagi vist tots dos).
6. **Segon color.** Afegir un Torus, posar-li un material nou taronja amb Emission i un
   Wireframe. Equilibrar les intensitats perquè cap dels dos colors domini.
   *Comprova:* un segon objecte amb Wireframe i emissió taronja (to 15°–40°, saturació
   ≥ 0,8); la relació entre la luminància × Strength del cian i del taronja, entre 0,67 i
   1,5; i no hi ha cap altre to emissiu a l'escena (paleta de dos colors).
7. **Repte final: a la paret.** Amb la prova de projector activada, en vista de càmera
   (Numpad 0), fer que l'escena aguanti: engruixir el Wireframe i fer el bloom prou generós
   perquè les línies no desapareguin, sense que tot es converteixi en una taca.
   *Comprova:* tots els requisits anteriors es mantenen (World negre, Standard, bloom
   actiu, dos colors equilibrats) i una anàlisi de la imatge de càmera feta amb el renderer
   del lab i la simulació de projector: proporció de fons fosc dins d'un marge, les línies
   de la graella visibles amb un contrast mínim respecte del fons, i els dos tons presents.
   Els marges es calibren amb una escena solució (vegeu les preguntes).

En acabar, **mode lliure** amb tot el que fa servir el lab.

## 6. Pàgina del lab

Com les altres, amb aquests continguts al bloc **"Al Blender real"**:

- **On és el compositor a la 5.2.** Al workspace **Compositing** (pestanya de dalt), o
  canviant qualsevol editor a **Compositor** amb el menú Editor Type. Botó **New** a la
  capçalera; ja no hi ha casella Use Nodes ni node Composite, la sortida és el Group Output.
  Per veure'l al viewport: Viewport Shading > **Compositor > Always** (o **Camera**, només en
  vista de càmera). En renderitzar amb F12, la imatge també hi passa.
- **Per què EEVEE i no Cycles per a visuals:** EEVEE és en temps real, es pot provar i
  canviar en directe i renderitza en segons el que Cycles faria en minuts. Per a un loop de
  visuals, la velocitat d'iteració importa més que la llum física.
- **Sortida per a projecció:** pestanya Output, Resolution **1920 × 1080** i Frame Rate
  **30 fps** (Blender en porta 24 per defecte). Els loops han de durar un nombre exacte de
  compassos:
  `frames per compàs (4/4) = 4 × 60 × fps / BPM`. A 120 BPM i 30 fps, un compàs són 60
  frames; un loop de 4 compassos va del frame 1 al 240. Perquè el loop no faci salt, el
  frame 241 ha de ser igual que el frame 1.
- Que el neó brilli de debò amb l'Emission: a Blender, una emissió forta també il·lumina el
  que té al costat (al lab no).

Les imatges de Blender d'aquest bloc les fa Joan. Mai es presenta un render del lab com si
fos de Blender.

La il·lustració de la targeta de l'índex (`docs/DESIGN.md`) és una graella i un cub en línia,
amb l'estil de la resta de targetes.

## 7. Fases

1. **Grid i Wireframe.** Primitiva Grid amb Adjust Last Operation (X/Y Subdivisions, Size) i
   modificador Wireframe a la pila del Lab 03, amb tests i fixtures de Blender. Els tests del
   Lab 03 han de continuar passant.
2. **Model del compositor.** Tipus de nodes (Render Layers, Glare, Group Output, Viewer,
   Reroute), sockets de tipus menú, node tree de composició de l'escena, New i passos de
   desfer. L'arbre de nodes del Lab 05 s'ha de poder fer servir amb un altre catàleg de
   nodes sense trencar-ne els tests.
3. **Interfície del compositor.** Editor Type (Shader Editor / Compositor), capçalera amb
   New, Shift+A del compositor, panells del Glare, subpanell Compositor de Viewport
   Shading i panell Color Management.
4. **Cadena HDR i bloom.** Render target HDR, Glare Bloom amb l'algorisme de Blender, View
   Transform al final, integració amb l'acumulador i mesura amb `?perf`.
5. **Prova de projector, etapes i pàgina.**
6. **Poliment.** Rendiment en ordinadors de l'aula i `docs/fidelity/blender.md` actualitzat.
