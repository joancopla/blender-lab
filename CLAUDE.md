# Labs interactius de programari creatiu — context del projecte

## Què és

Una col·lecció de laboratoris interactius al navegador per aprendre programari creatiu des
de zero. Cada lab replica una part de la interfície del programa en HTML i proposa etapes
curtes amb comprovació automàtica: l'alumne canvia alguna cosa, veu l'efecte i rep
retroalimentació.

- **Programari actual: Blender.** En el futur es podria afegir un altre programa (per
  exemple, After Effects). Ara **no** es construeix res d'això, però l'arquitectura ha de
  permetre afegir-lo sense tocar el nucli (vegeu "Arquitectura").
- **Autor:** Joan, professor de Blender (el domina a fons). És l'expert de domini i el
  validador final de tot el que fa referència al comportament del programari.
- **Públic:** alumnes d'un cicle formatiu d'Imatge i So, sense experiència prèvia.
- **Objectiu pedagògic:** preparar per al programa real, no substituir-lo. Tot el que
  s'aprengui aquí s'ha de poder fer exactament igual al programa.

## Regla número 1: fidelitat al programa

Per a Blender:

- Versió de referència: **Blender 5.2 LTS**, keymap per defecte, selecció amb
  botó esquerre.
- Bona part del material que hi ha sobre Blender correspon a versions 2.8–4.x. Si un
  comportament pot haver canviat a la sèrie 5.x, marca'l com a `// FIDELITY?` en lloc de
  donar per bo el que recordis de versions anteriors.
- Dreceres, noms de menús, etiquetes de camps, colors de selecció, textos de la capçalera del
  viewport i comportament dels operadors modals han de coincidir amb aquesta versió.
- **No t'inventis comportaments.** Si no estàs segur de com es comporta Blender en un cas
  concret, NO ho decideixis tu: afegeix-ho a `docs/fidelity/blender.md` com a pregunta
  oberta, implementa l'opció més probable marcada amb `// FIDELITY?` i avisa'm.
- `docs/fidelity/blender.md` és la llista de tot el que replica el lab, amb una casella
  per a cada element perquè jo el validi amb Blender obert al costat.
- Blender és **Z-up**; three.js és Y-up. Tota la lògica, els valors que veu l'alumne i les
  comprovacions treballen en coordenades de Blender (Z amunt, metres, graus). La conversió
  a three.js es fa en un sol lloc (`src/apps/blender/coords.ts`) i enlloc més.

Qualsevol programa que s'afegeixi en el futur tindrà la seva pròpia secció de fidelitat i
el seu propi fitxer a `docs/fidelity/`.

## Idioma

- **Interfície replicada del programa: en anglès**, exactament com al programa
  (Object Mode, Location, User Perspective...).
- **Tot el contingut didàctic en català:** consignes, pistes, missatges d'error,
  retroalimentació, pàgines del web. Aquests textos mai s'escriuen directament al codi:
  - textos del nucli i de l'embolcall a `src/core/i18n/ca.json`;
  - textos de cada lab al seu `ca.json`, dins de la carpeta del lab.
- Codi, noms de variables i comentaris tècnics: en anglès.

## Stack

- Vite + TypeScript (strict) + three.js. Sense frameworks d'UI: DOM i CSS a mà.
- Vitest per als tests de la lògica (keymap, operadors modals, entrada numèrica, undo,
  comprovacions d'etapes).
- Sortida estàtica desplegable a GitHub Pages (`base` configurable a Vite).
- Dependències mínimes. Demana'm permís abans d'afegir-ne cap més.

## Arquitectura

El projecte té tres capes, amb una direcció de dependència estricta:
**labs → apps → core**. Mai a l'inrevés.

```
src/
  core/                 comú a qualsevol programari. Sense three.js ni res de Blender.
    input/              gestor de teclat i ratolí, keymaps declarats com a dades,
                        màquina d'estats d'operadors modals, entrada numèrica
    history/            undo/redo amb patró command
    stages/             executor d'etapes, comprovacions, pistes, registre d'operacions,
                        progrés (localStorage)
    shell/              embolcall segons docs/DESIGN.md: caixetí, panell d'etapes,
                        preferències, overlay de tecles, avís de mòbil
    i18n/               càrrega de textos i ca.json del nucli
    app-contract.ts     la interfície que ha d'implementar qualsevol programa replicat
  apps/
    blender/            tot l'específic de Blender
      coords.ts         conversió Blender (Z-up) <-> three.js
      keymap.ts         dreceres de Blender 5.2, declarades sobre core/input
      scene/            model de dades (objectes, selecció, objecte actiu, modes)
      mesh/             malles editables pròpies (Lab 02)
      viewport/         escena three.js, càmera tipus Blender, graella, gizmo
      operators/        grab, rotate, scale, select... sobre core/history
      ui/               rèplica: capçalera, Outliner, panell N, barra d'estat
  labs/
    blender/
      01-viewport/      stages.ts, escena inicial, ca.json
      02-edit-mode/
  site/                 pàgina índex (agrupada per programari) i plantilla de lab
specs/
  blender/              especificació de cada lab (01-viewport.md, 02-edit-mode.md...)
docs/
  DESIGN.md
  ARCHITECTURE.md
  fidelity/blender.md
```

### El contracte entre el nucli i cada programa

`core/app-contract.ts` defineix què ha d'oferir un programa perquè el nucli el pugui fer
servir. Com a mínim:

- muntar-se i desmuntar-se en un contenidor del DOM;
- exposar el seu estat de manera tipada i de només lectura, perquè les comprovacions de
  les etapes el puguin llegir;
- registrar el seu keymap i els seus operadors al nucli;
- carregar l'escena o l'estat inicial que li passi una etapa;
- emetre esdeveniments d'operació (confirmada, cancel·lada, desfeta) al registre del nucli.

Les etapes d'un lab reben l'estat del programa a través d'aquest contracte. El nucli
no sap què és un vèrtex ni una capa; només sap que hi ha un estat i unes comprovacions.

### Regles

- `src/core/` **no pot importar res** de `src/apps/` ni de `src/labs/`, ni tampoc
  three.js. Afegeix un test de Vitest que ho comprovi analitzant els imports dels fitxers
  de `core/`, perquè no es trenqui sense adonar-nos-en.
- `src/apps/blender/` no pot importar res de `src/labs/`.
- L'estat del programa és l'única font de veritat. La UI i three.js només el reflecteixen.
- Tots els canvis a l'estat passen per operadors registrats a `core/history`, perquè
  Ctrl+Z funcioni sempre.
- Les comprovacions de les etapes llegeixen l'estat a través del contracte, no el DOM ni
  three.js.
- Els objectes de tipus malla de Blender són **malles pròpies editables** (vèrtexs,
  arestes i cares, amb n-gons), no primitives de three.js. El Lab 02 (Mode Edició) les
  editarà. Ja des del Lab 01, les primitives es generen com a malles pròpies i es
  converteixen a three.js només per dibuixar-les.
- Quan tinguis dubtes sobre si una peça va a `core/` o a `apps/blender/`, la pregunta
  és: "la faria servir també una rèplica d'un programa 2D de línia de temps?". Si la
  resposta és no, va a `apps/blender/`. Si no ho tens clar, pregunta'm.

## Forma de treballar

- Treballa **per fases**. Al final de cada fase, atura't i fes-me un resum de què has
  fet, què he de provar i les preguntes de fidelitat obertes. No passis a la següent fase
  fins que jo ho digui.
- `specs/blender/README.md` recull l'ordre dels labs, les dependències, els components
  compartits i com es valida la fidelitat. Llegeix-lo abans de començar qualsevol lab.
- Treballa només en el lab que t'indiqui. Les especificacions d'altres labs a `specs/`
  són context per a decisions d'arquitectura, no feina per avançar.
- Abans d'escriure codi d'una fase, proposa'm el pla breument.
- Fes commits petits amb missatges clars.
- La lògica té tests; la part visual la valido jo al navegador.
- Si una petició meva contradiu aquest document, pregunta'm abans.

## Criteris de qualitat

- L'aspecte de tot el que no és la rèplica del programa (índex, pàgines de lab, panells,
  retroalimentació) el defineix `docs/DESIGN.md`. Segueix-lo al peu de la lletra.
- Nom del projecte: [NOM — pendent]. No ha de semblar un producte oficial de Blender ni
  de cap altre fabricant, i no fa servir logotips ni icones oficials de cap programa. Al
  peu de pàgina hi ha d'haver una frase que digui que és un projecte educatiu independent.
- Funciona bé en ordinadors d'aula modestos: 60 fps amb escenes petites, sense
  post-processats pesants.
- Pensat per a escriptori amb teclat. En pantalles tàctils o petites, mostra un avís en
  català que expliqui que el lab necessita teclat i ratolí.
- Respecta `prefers-reduced-motion` en les animacions de la interfície del web.
- El progrés de l'alumne es desa a `localStorage` (amb try/catch) i es pot reiniciar.
