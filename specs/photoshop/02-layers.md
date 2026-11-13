# Lab 02 (Photoshop) — Capes (proposta, no construït)

Id `ps-02-layers` (no es pot canviar: és la clau del progrés). Pàgina `labs/ps-02-layers/`.

## Objectiu

Entendre que una imatge de Photoshop és una pila de capes: cada capa té el seu contingut, es pot
amagar, moure, fer transparent i canviar de lloc a la pila, i tot el que es fa afecta la capa
seleccionada. En acabar, l'alumne sap llegir el panell Layers i no es perd quan "no passa res"
perquè té una altra capa seleccionada.

## El document de pràctica

Un paisatge nocturn senzill, de 1200 × 800 px, dibuixat amb codi (cap imatge externa). Capes, de
dalt a baix:

| Capa | Contingut |
|---|---|
| `Títol` | Un rètol de text ja convertit a píxels |
| `Layer 1` | Un núvol (nom per defecte a propòsit: l'etapa 5 el fa canviar) |
| `Estrelles` | Punts blancs escampats pel cel |
| `Lluna` | Un disc clar |
| `Muntanyes` | Una silueta fosca a la part de baix |
| `Background` | Un cel blau fosc. Capa de fons: bloquejada, nom en cursiva |

Cada etapa carrega la seva variant d'aquest document (per exemple, a l'etapa 3 la Lluna comença
davant de les Muntanyes).

## La rèplica (mínima, només el que el lab fa servir)

- **Finestra:** barra de menús (File, Edit, Image, Layer, Type, Select, Filter, View, Plugins,
  Window, Help) amb només les ordres del lab actives; Options bar; panell Tools amb l'eina Move
  activa i la resta dibuixades però inactives; pestanya del document; llenç amb el fons d'escacs
  de la transparència fora de les capes opaques.
- **Eina Move (`V`):** arrossegar al llenç mou la capa. Options bar amb Auto-Select (casella) i
  el desplegable Layer / Group. Amb Auto-Select activat, un clic al llenç selecciona la capa de
  més amunt que té un píxel no transparent sota el cursor. Les fletxes mouen 1 px; amb Shift,
  10 px.
- **Panell Layers:**
  - una fila per capa amb l'ull, la miniatura i el nom; la capa seleccionada, ressaltada;
  - clic a l'ull: amaga o mostra la capa;
  - clic a la fila: la selecciona; Ctrl + clic hi afegeix o en treu; Shift + clic selecciona el rang;
  - arrossegar una fila: canvia l'ordre, amb una línia que indica on caurà;
  - doble clic al nom: l'edita; Retorn confirma, Esc cancel·la;
  - Opacity (0–100 %): escriure el valor o arrossegar; Fill es dibuixa però queda inactiu;
  - desplegable del mode de fusió fix a Normal (inactiu fins al Lab 06);
  - fila Lock i botons de baix dibuixats; actius només Create a new layer i Delete layer;
  - la capa `Background` no es pot moure, ni canviar d'ordre, ni fer transparent.
- **Dreceres:** `V`; `Ctrl+J` (Layer > New > Layer Via Copy); `Ctrl+]` i `Ctrl+[` (Layer > Arrange >
  Bring Forward / Send Backward); `Ctrl+Shift+]` i `Ctrl+Shift+[` (Bring to Front / Send to Back);
  xifres amb l'eina Move per a l'opacitat (`5` = 50 %, `0` = 100 %, dues xifres seguides = valor
  exacte); `Delete` esborra les capes seleccionades; `Ctrl+Z` i `Shift+Ctrl+Z`.
- **Fora del lab:** grups, màscares, estils, capes d'ajust, enllaçar capes, filtre de capes
  (fila Kind), seleccions, zoom i desplaçament del llenç (el document es veu sencer).

Tot el que hi ha en aquesta llista és a `docs/fidelity/photoshop.md` per validar.

## Etapes

| # | Id | Títol | Es supera quan… |
|---|---|---|---|
| 1 | `eye` | Què hi ha a cada capa | `Títol` està amagada i totes les altres, visibles |
| 2 | `active` | La capa seleccionada | la `Lluna` és dins la zona marcada (±20 px) i cap altra capa s'ha mogut |
| 3 | `order` | L'ordre de la pila | `Lluna` és per sota de `Muntanyes` i per sobre de `Background` |
| 4 | `opacity` | Opacitat | `Estrelles` té Opacity 50 % |
| 5 | `rename` | Posa nom a les capes | la capa del núvol es diu `Núvol` (sense distingir majúscules ni espais als extrems) |
| 6 | `duplicate` | Duplica una capa | hi ha dues capes amb el contingut de la Lluna, separades més de 150 px |

Notes de disseny de les etapes:

- **1:** la consigna demana clicar els ulls un per un per veure què conté cada capa, i deixar
  només `Títol` amagada.
- **2:** el document comença amb `Muntanyes` seleccionada i Auto-Select desactivat. Si l'alumne
  arrossega sense seleccionar la `Lluna`, mou les muntanyes: la retroalimentació li explica per
  què i li recorda `Ctrl+Z`. La zona de destí és una ajuda del lab (estil de l'embolcall).
- **3:** la `Lluna` comença a dalt de tot i tapa el cim. Es pot resoldre arrossegant la fila o amb
  `Ctrl+[`.
- **4:** es pot resoldre escrivint al camp, arrossegant o prement `5` amb l'eina Move.
- **6:** `Ctrl+J` i després moure la còpia. La còpia es diu `Lluna copy` (❓ a validar).

Mode lliure: el document complet amb totes les eines del lab.

## Pistes i errors freqüents que el lab ha de detectar

- Moure o editar la capa equivocada (etapes 2 i 6).
- Intentar moure `Background`: Photoshop mostra un avís; el lab en mostra el text real (❓) i
  explica en català què és la capa de fons.
- Amagar la capa en lloc de baixar-ne l'opacitat (etapa 4).

## Text "Al programa real"

Cada etapa acaba amb una nota curta de com es fa a Photoshop, incloses les ordres que el lab no
té: `Ctrl+Shift+N` per a una capa nova (el navegador es reserva aquesta drecera), `F7` per obrir
el panell Layers i `Alt` + clic a l'ull per veure una capa sola.

## A validar

- Tots els elements de la secció "Lab 02" de `docs/fidelity/photoshop.md`.
- Si el nivell i l'ordre de les etapes encaixen amb les primeres classes.
- Els noms de les capes de pràctica i el motiu del document.
