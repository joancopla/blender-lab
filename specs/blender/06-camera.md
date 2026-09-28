# Lab 06 — Càmera i composició

L'alumne aprèn a fer servir la càmera de Blender com una càmera real: enquadrament,
distància focal, format, profunditat de camp i composició. Connecta directament amb
fotografia i vídeo.

Llegeix `CLAUDE.md` i `specs/blender/README.md` abans de res.

**Depèn de:** Lab 01, Properties Editor i mòdul de render (Lab 04).

---

## 1. Interfície replicada

- **Vista de càmera:** Numpad 0. Marc de càmera amb passepartout, nom de la càmera i
  vora que indica la càmera activa.
- **Ctrl+Numpad 0:** fer activa la càmera seleccionada. **Ctrl+Alt+Numpad 0:** alinear la
  càmera activa amb la vista.
- **Lock Camera to View:** al panell N, pestanya View. Quan està actiu, navegar en vista de
  càmera mou la càmera.
- Moure la càmera en vista de càmera: G per desplaçar-la en el pla de la imatge; G i Z
  dues vegades per apropar-la al llarg del seu eix local. `// FIDELITY?`
- **Pestanya de càmera (Object Data):** Type (Perspective, Orthographic), Focal Length,
  Lens Unit, Shift X/Y, Clip Start/End, Sensor Fit i Size, Depth of Field (Focus Object,
  Focus Distance, F-Stop) i Viewport Display (Composition Guides, Passepartout).
- **Pestanya Output:** Resolution X/Y i percentatge. El marc de la càmera canvia segons la
  proporció.

## 2. Comportament

- Focal Length i Sensor Size determinen el camp de visió com a Blender (sensor de 36 mm per
  defecte).
- Guies de composició: Thirds, Golden, Center i Diagonal, com a Blender. `// FIDELITY?`
  amb la llista completa a la 5.2.
- **Profunditat de camp:** aproximació amb un pas de postprocessament de bokeh, visible en
  vista de càmera en Material Preview i Rendered. El desenfocament ha de dependre de
  F-Stop i de la distància de focus de manera coherent amb una òptica real.
  `// FIDELITY?` amb quan mostra Blender la profunditat de camp al viewport.
- Ortho Scale en càmera ortogràfica.

## 3. Elements del lab

- Lectura del camp de visió en graus i l'equivalència amb objectius de fotografia de format
  complet, al panell del lab.
- Indicador del centre visual del subjecte per a les etapes de composició.

## 4. Fora d'abast

Càmera panoràmica, estèreo, rigs de càmera i restriccions (Track To, Follow Path).

## 5. Etapes

1. **Mirar per la càmera.** Entrar en vista de càmera, canviar la càmera activa i
   entendre el passepartout.
2. **Enquadrar.** Enquadrar un objecte amb Lock Camera to View activat.
3. **Angular i tele.** Mantenir el subjecte a la mateixa mida amb 24 mm i amb 135 mm,
   movent la càmera. La consigna explica la compressió de la perspectiva a partir del fons.
4. **Format.** Canviar la resolució per fer un 16:9, un 9:16 vertical i un 4:5.
5. **Regla de terços.** Col·locar el subjecte en una intersecció de terços.
6. **Profunditat de camp.** Enfocar el subjecte i desenfocar el fons amb F-Stop i Focus
   Object.
7. **Verticals rectes.** Fotografiar un edifici sense línies convergents fent servir Shift Y
   amb la càmera anivellada, en lloc d'inclinar-la. És un concepte de fotografia
   d'arquitectura.
8. **Ortogràfica.** Fer un pla ortogràfic del tamboret amb Ortho Scale.
9. **Alinear amb la vista.** Trobar un enquadrament navegant i passar-lo a la càmera amb
   Ctrl+Alt+Numpad 0.
10. **Repte final.** Reproduir l'enquadrament d'una imatge de referència del tamboret:
    posició, orientació i focal dins d'una tolerància, comprovant la posició a la pantalla
    de punts de referència de l'objecte.

En acabar, **mode lliure**.

## 6. Pàgina del lab

Com als anteriors. El bloc "Al Blender real" ha de connectar cada paràmetre amb el
seu equivalent en una càmera física.

## 7. Fases

1. **Càmera.** Dades de càmera, vista de càmera, marc, passepartout, càmera activa, Lock
   Camera to View i alineació.
2. **Òptica.** Focal, sensor, shift, ortogràfica, clip i resolució.
3. **Profunditat de camp i guies de composició.**
4. **Etapes i web.**
5. **Poliment.** Rendiment del bokeh en ordinadors modestos i fidelitat documentada.
