# Labs d'Adobe Photoshop — índex, abast i ordre

Tercer programa de la col·lecció (decisió de Joan, 13/11/2026). Mateix nucli, mateix disseny
(`docs/DESIGN.md`) i mateix progrés que els labs de Blender i de grandMA3.

## Per a qui i per a què

- Alumnes del cicle d'Imatge i So, sense experiència prèvia amb Photoshop.
- Joan en fa la mostra (programa mínim i Lab 01) i hi farà tutorials. Un company que és professor
  de Photoshop duplicarà el repositori i continuarà aquesta part pel seu compte amb Claude Code
  (`docs/photoshop-handover.md`).
- El lab no substitueix el programa: fa practicar els conceptes que costen d'entendre (capes,
  seleccions, màscares, edició no destructiva) amb comprovació automàtica. Tot el que s'hi aprèn
  s'ha de poder fer exactament igual a Photoshop.

## Versió i convencions de referència

| Què | Valor | Estat |
|---|---|---|
| Versió | L'última instal·lada a l'aula | ❓ Per confirmar a Help > About Photoshop (Photoshop 2025 = 26.x; Photoshop 2026 = 27.x) |
| Idioma de la interfície | Anglès (regla general del projecte) | ❓ Per confirmar: si a l'aula el tenen en castellà, cal decidir si la rèplica va en castellà |
| Sistema | Windows (Ctrl, Alt) | ❓ Per confirmar: si l'aula és Mac, les dreceres es mostren amb Cmd i Option |
| Dreceres | Keyboard Shortcuts per defecte ("Photoshop Defaults") | |
| Espai de treball | Essentials (Default) | ❓ |
| Tema de color de la interfície | El gris fosc per defecte | ❓ |

Fins que no es confirmin, el codi que en depèn porta `// FIDELITY?` i l'element surt amb ❓ a
`docs/fidelity/photoshop.md`.

## Regla de fidelitat

- Cap drecera, nom de menú, etiqueta ni comportament de Photoshop entra als labs sense
  haver-lo comprovat amb el programa obert o a la guia oficial
  (https://helpx.adobe.com/photoshop/user-guide.html). El que no es pugui comprovar va a
  `docs/fidelity/photoshop.md` com a pregunta oberta, amb l'opció més probable implementada i
  marcada amb `// FIDELITY?`.
- El validador és l'expert de Photoshop que porti aquesta part (a la mostra, Joan amb el
  programa obert; després, el seu company).
- **Cap icona, logotip ni recurs gràfic d'Adobe.** Les icones de les eines i dels panells es
  dibuixen de nou (SVG propi): s'han de reconèixer per la forma general, però no poden ser una
  còpia. El nom "Photoshop" només es fa servir per dir quin programa s'aprèn.
- Les imatges dels documents de pràctica es generen amb codi o són CC0 (amb la font anotada).
  Cap imatge d'Adobe ni de bancs d'imatges amb llicència.

## Què no es replica

Funcions que no es poden imitar bé al navegador o que canvien massa entre versions. Si un lab en
parla, ho fa amb una captura o una explicació, mai amb una imitació:

- Funcions generatives (Generative Fill, Generative Expand, Remove Tool amb IA) i Neural Filters.
- Content-Aware Fill, Select Subject, Sky Replacement.
- El motor de pinzells complet (dinàmiques, pinzells mixtos, pressió de tauleta). Un pinzell rodó
  amb Size, Hardness i Opacity sí que és assumible.
- Camera Raw, 16 i 32 bits per canal, perfils de color CMYK, espais de color reals.
- Fitxers PSD reals (obrir-los o desar-los).

## Limitacions del navegador

El navegador es reserva algunes dreceres i la pàgina no les pot capturar. A Chrome i Edge:
`Ctrl+N`, `Ctrl+T`, `Ctrl+W`, `Ctrl+Shift+N`, `Ctrl+Shift+T`, `Ctrl+Shift+W` i `Ctrl+Tab`.

Afecta dreceres importants de Photoshop: `Ctrl+T` (Free Transform), `Ctrl+Shift+N` (New Layer),
`Ctrl+N` (New Document). Regles:

- L'etapa que ensenya una d'aquestes ordres la fa executar pel menú o pel botó del panell, i
  la consigna ensenya la drecera real dient clarament que al lab no funciona.
- Per explorar a la Fase 1: en pantalla completa, Chrome i Edge permeten capturar aquestes
  tecles amb l'API Keyboard Lock. Si funciona bé a l'aula, el lab pot oferir un botó de pantalla
  completa que les activi. Cal provar-ho abans de comptar-hi.
- Les dreceres amb `Alt` soles poden obrir el menú del navegador a Windows; cal comprovar-ne
  cadascuna quan s'afegeixi.

## Ordre dels labs (esborrany)

L'ordre i el contingut dels labs 02 en endavant els decideix el professor de Photoshop. Aquesta
taula és una proposta de punt de partida, pensada perquè cada lab reutilitzi el que ha construït
l'anterior.

| Lab | Títol | Introdueix | Estat |
|---|---|---|---|
| 01 | Capes | Document, panell Layers, eina Move | Especificat (`01-layers.md`) |
| 02 | Seleccions | Marquee, Lasso, sumar i restar, Select > Inverse, Deselect | Proposta |
| 03 | Màscares de capa | Màscara, pinzell blanc i negre, X i D | Proposta |
| 04 | Capes d'ajust | Levels, Hue/Saturation, edició no destructiva | Proposta |
| 05 | Transformació i objectes intel·ligents | Free Transform, Smart Object | Proposta |
| 06 | Modes de fusió | Normal, Multiply, Screen, Overlay | Proposta |
| 07 | Text | Type Tool, panell Character | Proposta |
| 08 | Mida, resolució i exportació | Image Size, Canvas Size, Crop, Export As | Proposta |

## El repte final (proposta, per validar)

Cada programa de la col·lecció té un plànol que es va dibuixant a mesura que se superen etapes
(`docs/DESIGN.md`). Per a Photoshop es proposa **un cartell**: una sola vista, com el plànol de
llums de grandMA3. Cada lab superat hi afegeix una part (el fons, les formes, el text, els
ajustos). El dibuix és de línia i propi del lab, a `src/labs/photoshop/blueprint.ts`.

## Arquitectura

- `src/apps/photoshop/`: tot l'específic de Photoshop. No importa res de `apps/blender` ni
  d'`apps/grandma3`, ni three.js. El llenç es dibuixa amb Canvas 2D.

  | Component | Carpeta | El necessiten | Es construeix a |
  |---|---|---|---|
  | Document i capes (model de dades) | `document/` | Tots | 01 |
  | Composició de capes al llenç | `render/` | Tots | 01 |
  | Operadors sobre `core/history` | `operators/` | Tots | 01 |
  | Panell Layers | `ui/layers-panel/` | Tots | 01 |
  | Finestra: barra de menús, Options bar, Tools, pestanya del document | `ui/` | Tots | 01 (mínim) |
  | Keymap | `keymap.ts` | Tots | 01 |
  | Seleccions (màscara de selecció, formigues) | `selection/` | 02, 03 | 02 |
  | Màscares | `document/`, `render/` | 03 | 03 |
  | Capes d'ajust | `adjustments/` | 04 | 04 |

- **L'estat és l'única font de veritat.** L'estat que llegeixen les comprovacions és tipat i de
  només lectura: mida del document, llista de capes (nom, visibilitat, opacitat, mode de fusió,
  bloquejos, desplaçament, identificador del contingut), capes seleccionades i eina activa. Els
  píxels de cada capa es desen a part, referenciats per identificador; les comprovacions no
  llegeixen el llenç ni el DOM.
- Unitats: píxels del document, amb l'origen a dalt a l'esquerra, com a Photoshop. Opacitat en
  percentatge enter (0–100).
- Tot canvi passa per un operador registrat a `core/history`. `Ctrl+Z` desfà i `Shift+Ctrl+Z`
  refà (❓ validar amb la versió de l'aula).
- `src/labs/photoshop/NN-nom/`: etapes, textos (`ca.json`) i escena inicial de cada lab. Els ids
  de lab porten el prefix `ps-` (són la clau del progrés): `ps-01-layers`. Pàgines a
  `labs/ps-01-layers/`.
- La UI replicada va en l'idioma de referència (vegeu la taula de dalt); les consignes, en català.
- Les ajudes pròpies del lab (zones de destí, fantasmes) es dibuixen amb l'estil de l'embolcall,
  mai amb el de Photoshop, perquè l'alumne no les busqui després al programa.

## Com es valida

- **Lògica:** tests de Vitest per al model de capes, els operadors, el keymap i les
  comprovacions de cada etapa.
- **Composició:** les funcions de fusió (opacitat, modes) es proven amb valors de píxel
  calculats a mà. Quan arribin els modes de fusió (Lab 06), el validador exporta de Photoshop
  imatges de referència petites a `tests/fixtures/photoshop/`.
- **Aspecte i comportament:** el validador repassa `docs/fidelity/photoshop.md` amb Photoshop
  obert al costat.
