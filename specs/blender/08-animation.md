# Lab 08 — Animació bàsica

L'alumne aprèn els fonaments de l'animació per keyframes: timing, espaiat, interpolació i
com reorganitzar una animació al Dope Sheet.

Llegeix `CLAUDE.md` i `specs/blender/README.md` abans de res.

**Depèn de:** Lab 01. Aquest lab construeix les **dades d'animació**, el **Timeline** i el
**Dope Sheet**.

---

## 1. Dades d'animació (component compartit)

A `src/apps/blender/anim/`:

- Cada propietat animada té una F-curve amb keyframes: frame, valor, interpolació
  (Constant, Linear, Bezier), easing i manetes amb el seu tipus.
- Les manetes es calculen com a Blender, amb Auto Clamped per defecte. El Lab 09 les
  editarà, així que el model ha de ser complet des d'ara.
- Avaluació de qualsevol propietat en qualsevol frame, incloent-hi frames fraccionaris.
- Tests d'avaluació comparats amb valors exportats de Blender per a casos concrets.
  `// FIDELITY?`

## 2. Interfície replicada

- **Timeline** a baix: controls de reproducció, frame actual, Start i End, marques de
  keyframe dels objectes seleccionats, botó d'Auto Keying i capçal arrossegable.
- **Dope Sheet** (workspace Animation simplificat): canals per objecte i propietat, i
  keyframes com a rombes.
- **Colors dels camps al panell N:** indiquen si una propietat té keyframe en aquest frame,
  si està animada o si s'ha canviat sense desar-ne la clau. `// FIDELITY?` amb els colors
  exactes a la 5.2.
- **Motion Paths** (Object > Motion Paths): el camí de l'objecte amb un punt per frame, per
  veure l'espaiat.
- La velocitat de reproducció segueix el Frame Rate de la pestanya Output (24 fps per
  defecte), saltant frames si cal per mantenir el temps real.

## 3. Dreceres

| Acció | Drecera |
|---|---|
| Inserir keyframe | I al viewport. `// FIDELITY?` amb els canals que insereix a la 5.2 i el menú de Keying Sets (K). |
| Inserir o esborrar sobre un camp | I / Alt+I amb el ratolí a sobre del camp |
| Reproduir / aturar | Espai |
| Frame anterior / següent | Fletxa esquerra / dreta |
| Keyframe anterior / següent | Fletxa amunt / avall |
| Inici / final | Shift+Esquerra / Shift+Dreta |
| Dope Sheet | Clic, Shift+clic, caixa, G, S (respecte del capçal), Shift+D, X, T (interpolació), Ctrl+E (easing), Ctrl+C / Ctrl+V |

## 4. Fora d'abast

Graph Editor (Lab 09), NLA, accions múltiples, drivers, armatures i shape keys.

## 5. Etapes

1. **Primera animació.** Moure un objecte d'un punt a un altre entre els frames 1 i 24, i
   reproduir-ho.
2. **Timing.** Fer el mateix moviment en 12 i en 48 frames i comparar la sensació.
3. **Pausa.** Aturar l'objecte entre els frames 24 i 36 duplicant la clau.
4. **Interpolació.** Posar la mateixa animació en Constant (stop motion), Linear (robot)
   i Bezier (natural), fent servir Motion Paths per veure l'espaiat.
5. **Rotació.** Fer que una roda doni exactament una volta.
6. **Més ràpid.** Escalar els keyframes al Dope Sheet perquè l'animació duri la meitat.
7. **Desfasament.** Tres objectes amb la mateixa animació, desplaçats uns frames entre
   ells al Dope Sheet.
8. **Auto Keying.** Animar una seqüència de posicions amb Auto Keying activat.
9. **Moure la càmera.** Fer un apropament lent de la càmera cap al tamboret.
10. **Repte final.** Reproduir una animació de referència: l'objecte ha de passar per les
    posicions fantasma en frames concrets, dins d'una tolerància, i respectar la pausa.

En acabar, **mode lliure**.

## 6. Pàgina del lab

Com als anteriors. El bloc "Al Blender real" ha d'explicar on són el workspace
Animation, el Timeline i els Keying Sets.

## 7. Fases

1. **Dades d'animació.** F-curves, manetes i avaluació, amb tests.
2. **Timeline i reproducció.** Controls, capçal, frames, fps i dreceres de navegació.
3. **Keyframes.** Inserir, esborrar, colors dels camps i Auto Keying.
4. **Dope Sheet.** Canals, edició de keyframes, interpolació i easing.
5. **Motion Paths.**
6. **Etapes i web.**
7. **Poliment.**
