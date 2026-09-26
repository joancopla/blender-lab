# Blender Lab — context del projecte

## Què és

Una col·lecció de laboratoris interactius al navegador per aprendre Blender des de zero.
Cada lab replica una part de la interfície de Blender en HTML i proposa etapes curtes amb
comprovació automàtica: l'alumne canvia alguna cosa, veu l'efecte i rep retroalimentació.

- **Autor:** Joan, professor de Blender (el domina a fons). És l'expert de domini i el
  validador final de tot el que fa referència al comportament de Blender.
- **Públic:** alumnes d'un cicle formatiu d'Imatge i So, sense experiència prèvia en 3D.
- **Objectiu pedagògic:** preparar per al Blender real, no substituir-lo. Tot el que
  s'aprengui aquí s'ha de poder fer exactament igual a Blender.

## Regla número 1: fidelitat a Blender

- Versió de referència: **Blender 5.2 LTS**, keymap per defecte, selecció amb
  botó esquerre.
- Bona part del material que hi ha sobre Blender correspon a versions 2.8–4.x. Si un
  comportament pot haver canviat a la sèrie 5.x, marca'l com a `// FIDELITY?` en lloc de
  donar per bo el que recordis de versions anteriors.
- Dreceres, noms de menús, etiquetes de camps, colors de selecció, textos de la capçalera del
  viewport i comportament dels operadors modals han de coincidir amb aquesta versió.
- **No t'inventis comportaments.** Si no estàs segur de com es comporta Blender en un cas
  concret, NO ho decideixis tu: afegeix-ho a `docs/BLENDER-FIDELITY.md` com a pregunta
  oberta, implementa l'opció més probable marcada amb `// FIDELITY?` i avisa'm.
- `docs/BLENDER-FIDELITY.md` és la llista de tot el que replica el lab, amb una casella
  per a cada element perquè jo el validi amb Blender obert al costat.
- Blender és **Z-up**; three.js és Y-up. Tota la lògica, els valors que veu l'alumne i les
  comprovacions treballen en coordenades de Blender (Z amunt, metres, graus). La conversió
  a three.js es fa en un sol lloc (`engine/coords.ts`) i enlloc més.

## Idioma

- **Interfície replicada de Blender: en anglès**, exactament com al programa
  (Object Mode, Location, User Perspective...).
- **Tot el contingut didàctic en català:** consignes, pistes, missatges d'error,
  retroalimentació, pàgines del web. Tots aquests textos van a `src/i18n/ca.json`, mai
  escrits directament al codi.
- Codi, noms de variables i comentaris tècnics: en anglès.

## Stack

- Vite + TypeScript (strict) + three.js. Sense frameworks d'UI: DOM i CSS a mà.
- Vitest per als tests de la lògica (keymap, operadors modals, entrada numèrica, undo,
  comprovacions d'etapes).
- Sortida estàtica desplegable a GitHub Pages (`base` configurable a Vite).
- Dependències mínimes. Demana'm permís abans d'afegir-ne cap més.

## Arquitectura

El motor és compartit per tots els labs. Cada lab només aporta dades i, si cal, mòduls
propis. Afegir un lab nou no ha de requerir tocar el motor.

```
src/
  engine/
    coords.ts        conversió Blender (Z-up) <-> three.js
    viewport/        escena, càmera tipus Blender, graella, gizmo de navegació, render
    input/           keymap, emulació 3 botons i teclat numèric, gestor d'operadors modals
    operators/       grab, rotate, scale, select... (patró command, amb undo/redo)
    scene/           model de dades de l'escena (objectes, selecció, objecte actiu)
    ui/              capçalera, Outliner, panell N, barra d'estat, overlay de tecles
    stages/          executor d'etapes: càrrega, comprovacions, pistes, progrés
  labs/
    01-viewport/     SPEC.md, stages.ts, escena inicial
  i18n/ca.json
  site/              pàgina índex de la col·lecció i plantilla de pàgina de lab
docs/
  BLENDER-FIDELITY.md
  ARCHITECTURE.md
```

- L'estat de l'escena és l'única font de veritat. La UI i three.js només el reflecteixen.
- Tots els canvis a l'escena passen per operadors, perquè Ctrl+Z funcioni sempre.
- Les comprovacions de les etapes llegeixen l'estat de l'escena, no el DOM ni three.js.

## Forma de treballar

- Treballa **per fases**. Al final de cada fase, atura't i fes-me un resum de què has
  fet, què he de provar i les preguntes de fidelitat obertes. No passis a la següent fase
  fins que jo ho digui.
- Abans d'escriure codi d'una fase, proposa'm el pla breument.
- Fes commits petits amb missatges clars.
- La lògica té tests; la part visual la valido jo al navegador.
- Si una petició meva contradiu aquest document, pregunta'm abans.

## Criteris de qualitat

- Funciona bé en ordinadors d'aula modestos: 60 fps amb escenes petites, sense
  post-processats pesants.
- Pensat per a escriptori amb teclat. En pantalles tàctils o petites, mostra un avís en
  català que expliqui que el lab necessita teclat i ratolí.
- Respecta `prefers-reduced-motion` en les animacions de la interfície del web.
- El progrés de l'alumne es desa a `localStorage` (amb try/catch) i es pot reiniciar.
