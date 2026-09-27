# Lab 09 — Graph Editor

L'alumne aprèn a llegir i editar corbes d'animació. El fil conductor és el clàssic
exercici de la pilota que bota, que ensenya timing, espaiat, contactes, squash and stretch
i cicles.

Llegeix `CLAUDE.md` i `specs/blender/README.md` abans de res.

**Depèn de:** Lab 01 i Lab 08 (dades d'animació, Timeline, Dope Sheet). Aquest lab
construeix el **Graph Editor**.

Nota: un altre projecte (CIFOG Lab) té un lab de corbes amb una pilota. Aquest lab es
construeix des de zero i no en reutilitza codi ni textos.

---

## 1. Interfície replicada

- **Graph Editor**, accessible també amb Ctrl+Tab des del Dope Sheet.
- **Llista de canals:** per objecte i propietat, amb els colors d'eix (X vermell, Y verd,
  Z blau), visibilitat i bloqueig.
- **Vista de corbes:** eix de frames i eix de valors, capçal, keyframes i manetes.
- **Navegació:** botó del mig per desplaçar, roda per fer zoom, Ctrl+botó del mig per
  escalar els eixos per separat, Home per veure-ho tot, Numpad . per enquadrar la
  selecció.
- **View > Normalize:** mostra les corbes normalitzades entre −1 i 1.
- Opció de mostrar les manetes només dels keyframes seleccionats. `// FIDELITY?` amb el
  valor per defecte a la 5.2.

## 2. Edició

| Acció | Drecera |
|---|---|
| Seleccionar keyframes i manetes | Clic, Shift+clic, caixa (B o arrossegar) |
| Moure, escalar, rotar | G, S, R. Amb X o Y, restringir a l'eix de temps o de valor. `// FIDELITY?` |
| Tipus de maneta | V: Free, Aligned, Vector, Automatic, Auto Clamped |
| Interpolació | T |
| Easing | Ctrl+E |
| Extrapolació | Shift+E: Constant, Linear, Make Cyclic, Clear Cyclic |
| Afegir keyframe a la corba | Ctrl+clic dret. `// FIDELITY?` |
| Esborrar | X |
| Modificadors d'F-curve | Panell N > Modifiers: Cycles i Noise |

Tot passa per operadors amb undo i fa servir les dades d'animació del Lab 08.

## 3. Elements del lab

- **Fantasmes de la pilota:** posicions en frames anteriors i posteriors (onion skin) al
  viewport, amb l'estil de l'embolcall. A Blender no n'hi ha per a objectes; la consigna ho
  diu i remet a Motion Paths.
- **Gràfic de velocitat:** una capa opcional sota la corba que en mostra la derivada, per
  entendre que el pendent és la velocitat. És un element del lab i es dibuixa com a tal.
- Preservació de volum en squash and stretch: indicador del producte de les escales.

## 4. Etapes

1. **Llegir corbes.** Identificar quin canal correspon a cada moviment d'una animació ja
   feta.
2. **Pendent i velocitat.** Fer que un objecte acceleri en sortir i freni en arribar,
   veient el gràfic de velocitat.
3. **Lineal o suau.** Canviar una animació mecànica per una de natural amb interpolació i
   manetes.
4. **El contacte.** Un bot on la pilota toca a terra amb un canvi de direcció sec,
   fent servir manetes Vector al contacte.
5. **Alçades.** Cada bot ha de ser més baix que l'anterior, dins d'una proporció.
6. **Avançar.** El moviment horitzontal ha de ser constant mentre bota.
7. **Timing dels bots.** Cada bot més curt que l'anterior.
8. **Squash and stretch.** Aixafar la pilota al contacte i estirar-la a la caiguda,
   preservant el volum.
9. **Cicle.** Fer que la pilota boti indefinidament al lloc amb el modificador Cycles.
10. **Repte final.** Animar la pilota completa: ha de passar per les posicions fantasma de
    referència i complir les regles de contactes, alçades i volum.

En acabar, **mode lliure**.

## 5. Pàgina del lab

Com als anteriors. El bloc "Al Blender real" ha d'explicar el Graph Editor, els tipus de
maneta i els modificadors d'F-curve.

## 6. Fases

1. **Graph Editor (visualització).** Canals, corbes, manetes, navegació i Normalize.
2. **Edició de keyframes i manetes.** Selecció, G/S/R, tipus de maneta, interpolació,
   easing i extrapolació.
3. **Modificadors d'F-curve.** Cycles i Noise.
4. **Elements del lab.** Fantasmes, gràfic de velocitat i indicador de volum.
5. **Etapes i web.**
6. **Poliment.**
