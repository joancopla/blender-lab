# Lab 01 (Photoshop) — Transformar

Id `ps-01-transform` (no es pot canviar: és la clau del progrés). Pàgina `labs/ps-01-transform/`.

És la mostra que fa Joan (13/11/2026): el programa mínim de Photoshop i aquest lab. La resta de
labs els farà el professor de Photoshop al seu repositori.

La interfície de la rèplica és en **castellà**, com a l'aula (Edición > Transformación libre,
Mayús, Intro). Aquesta especificació fa servir els noms anglesos de les ordres; l'equivalència
és a `src/apps/photoshop/ui/labels.ts`.

## Estat

- **Fase 1 (feta, 13/11/2026):** el programa mínim i el mode lliure, a `labs/ps-01-transform/`.
  Encara no surt a l'índex.
- **Fase 2 (pendent):** les nou etapes amb comprovacions, les ajudes del lab, la targeta a
  l'índex i el plànol del repte final.

## Objectiu

Aprendre les transformacions d'una capa: escalar, rotar, inclinar, distorsionar i posar en
perspectiva. En acabar, l'alumne sap entrar a Free Transform, què fa cada nansa, quina tecla
canvia el comportament, i que la transformació no s'aplica fins que es confirma.

## El document de pràctica

Documents petits (1200 × 800 px) dibuixats amb codi, un per etapa, amb dues o tres capes: un
fons (`Background`) amb el motiu de l'etapa i la capa que cal transformar. Exemples: un adhesiu
que s'ha d'encaixar en un marc, una foto torta, un cartell que s'ha de col·locar sobre una
tanca publicitària vista de costat. Cap imatge externa.

## La rèplica (mínima, només el que el lab fa servir)

- **Finestra:** barra de menús amb només les ordres del lab actives; Options bar; panell Tools
  amb l'eina Move activa i la resta dibuixades però inactives; pestanya del document; llenç.
- **Panell Layers (reduït):** fila per capa amb l'ull, la miniatura i el nom; clic per
  seleccionar; l'ull amaga i mostra. Res més (el panell complet és el Lab 02).
- **Menú Edit:**
  - Free Transform (`Ctrl+T`);
  - Transform > Again, Scale, Rotate, Skew, Distort, Perspective, Warp (inactiu), Rotate 180°,
    Rotate 90° Clockwise, Rotate 90° Counter Clockwise, Flip Horizontal, Flip Vertical;
  - Undo i Redo.
- **Mode de transformació:**
  - caixa amb vuit nanses (quatre cantonades i quatre costats) al voltant de la capa;
  - arrossegar dins la caixa: mou;
  - arrossegar una nansa: escala. Proporcional per defecte; amb Shift, lliure; amb Alt, des del
    centre;
  - arrossegar fora de la caixa: rota (el cursor és una fletxa corba). Amb Shift, de 15° en 15°;
  - Ctrl + arrossegar una nansa: distorsiona (la cantonada es mou sola; un costat s'emporta les seves dues cantonades);
  - Ctrl + Shift + arrossegar un costat: inclina;
  - Ctrl + Alt + Shift + arrossegar una cantonada: perspectiva;
  - les ordres Scale, Rotate, Skew, Distort i Perspective del menú limiten les nanses a aquella
    transformació sense haver de prémer cap tecla;
  - clic dret dins la caixa: el mateix menú de transformacions;
  - Retorn o el botó Commit de l'Options bar: aplica. Esc o el botó Cancel: descarta;
  - mentre s'està transformant, `Ctrl+Z` desfà l'últim ajust.
- **Options bar en mode de transformació:** X, Y, W, H (en %), l'enllaç Maintain aspect ratio,
  l'angle, H i V d'inclinació, i els botons Cancel i Commit. Els camps mostren els valors i es
  poden escriure. El punt de referència, la interpolació i el botó de Warp es dibuixen inactius.
- **La capa `Background` no es pot transformar:** amb ella seleccionada, Free Transform i
  Transform surten desactivats al menú.
- **Fora del lab:** Warp, punt de referència mòbil, Content-Aware Scale, Puppet Warp, Perspective
  Warp, transformar una selecció, objectes intel·ligents (s'expliquen al text "Al programa real").

### `Ctrl+T` i el navegador

El navegador es reserva `Ctrl+T` (pestanya nova) i la pàgina no el pot capturar. Al lab:

- Free Transform s'obre des del menú Edit, i la consigna ensenya `Ctrl+T` dient clarament que
  al programa és la manera habitual.
- A la Fase 1 es prova l'API Keyboard Lock: en pantalla completa, Chrome i Edge deixen capturar
  `Ctrl+T`. Si funciona bé, el lab ofereix un botó de pantalla completa (ajuda del lab, amb
  l'estil de l'embolcall) i aleshores `Ctrl+T` funciona com al programa.

## Etapes

| # | Id | Títol | Es supera quan… |
|---|---|---|---|
| 1 | `scale` | Escalar | l'adhesiu fa entre el 48 % i el 52 % de la mida original, proporcional, i la transformació està confirmada |
| 2 | `move-scale` | Escalar i col·locar | la foto omple el marc (cada cantonada a menys de 12 px de la seva marca), sense deformar-se |
| 3 | `stretch` | Escalar sense proporció | la franja ocupa tota l'amplada del document (±12 px) i conserva l'alçada (±5 %) |
| 4 | `rotate` | Rotar | la foto torta queda recta: angle total 0° (±1°) |
| 5 | `rotate-snap` | Rotar amb Shift | el rètol està girat exactament 90° en sentit horari |
| 6 | `flip` | Voltejar | la fletxa apunta a la dreta: Flip Horizontal aplicat una vegada |
| 7 | `skew` | Inclinar | el costat de dalt de l'ombra s'ha desplaçat entre 150 i 250 px a la dreta, amb el de baix al seu lloc (±5 px) |
| 8 | `distort` | Distorsionar | cada cantonada del cartell és a menys de 12 px de la cantonada corresponent de la tanca |
| 9 | `perspective` | Perspectiva | el costat de dalt del text s'ha estret simètricament fins a un 40–60 % de l'amplada, amb el de baix al seu lloc (±5 px) |

Notes de disseny de les etapes:

- **Totes:** l'etapa no se supera fins que la transformació s'ha confirmat. Si l'alumne té la
  forma bé però encara és dins del mode de transformació, la retroalimentació li ho diu
  ("Prem Retorn per aplicar-la").
- **1:** primer contacte: Edit > Free Transform, arrossegar una cantonada, Retorn. Les marques
  de mida són una ajuda del lab.
- **2:** combina moure (arrossegar dins la caixa) i escalar. Es pot fer en una sola
  transformació o en diverses.
- **3:** aquí s'ensenya Shift. Si la franja queda proporcional (massa alta), la retroalimentació
  explica que sense Shift l'escala manté la proporció.
- **4:** la foto comença girada −8°. S'ensenya el cursor de rotar fora de la caixa i el camp de
  l'angle de l'Options bar.
- **5:** Shift durant la rotació, o Edit > Transform > Rotate 90° Clockwise: les dues valen.
- **6:** una ordre de menú, sense caixa. També serveix per ensenyar que girar 180° no és el
  mateix que voltejar (la retroalimentació ho detecta).
- **7:** Edit > Transform > Skew, o Ctrl + Shift + arrossegar el costat de dalt.
- **8:** l'exercici clàssic de posar un cartell sobre una superfície en perspectiva. Les
  marques de les cantonades de la tanca són part del motiu del fons, no una ajuda afegida.
- **9:** Edit > Transform > Perspective: arrossegar una cantonada de dalt cap endins mou també
  l'oposada.

Mode lliure: un document amb tres capes i totes les transformacions.

## Errors freqüents que el lab ha de detectar

- Sortir sense confirmar, o prémer Esc i perdre la transformació.
- Tenir seleccionada `Background` (les ordres surten desactivades): explicar per què.
- Deformar una imatge quan calia mantenir-ne la proporció (etapa 2).
- Transformar la capa equivocada.

## Text "Al programa real"

Cada etapa acaba amb una nota curta de com es fa a Photoshop, inclòs el que el lab no té:
`Ctrl+T`; que escalar moltes vegades una capa de píxels la fa malbé i que per això hi ha els
objectes intel·ligents; Warp; i la casella del punt de referència.

## Com es desa una transformació

- Cada capa té un quadrilàter: les quatre cantonades en píxels del document. Escalar, rotar,
  inclinar, distorsionar i perspectiva només canvien aquestes cantonades, i les comprovacions
  només llegeixen això (i si hi ha una transformació en curs).
- El contingut de la capa no es remostreja en confirmar: el lab dibuixa sempre el contingut
  original deformat cap al quadrilàter. Photoshop sí que remostreja els píxels (per això la
  qualitat es degrada); aquesta diferència consta a `docs/fidelity/photoshop.md` i s'explica a
  l'alumne.
- W, H, l'angle i la inclinació de l'Options bar es calculen a partir del quadrilàter.

## A validar

- Tots els elements de la secció "Lab 01" de `docs/fidelity/photoshop.md`, començant pels
  modificadors de teclat (Shift, Alt, Ctrl), que són el que el lab ensenya.
- Si el nivell, l'ordre i els motius de les etapes encaixen amb el que demana el professor de
  Photoshop.
