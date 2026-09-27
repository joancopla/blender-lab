# Lab 10 — Projecte final: el tamboret

Projecte guiat que integra tot el curs: l'alumne porta el tamboret des del modelat fins a
un render i una animació de presentació. Té menys pistes i més llibertat que els labs
anteriors, i genera un lliurament que el professor pot avaluar.

Llegeix `CLAUDE.md` i `specs/blender/README.md` abans de res.

**Depèn de:** tots els labs anteriors i tots els components compartits.

---

## 1. Diferències amb els altres labs

- En lloc d'etapes amb una sola solució, hi ha **fites**. Cada fita té requisits mínims
  que es comproven automàticament, però l'alumne decideix com complir-los.
- Tota l'escena es desa al llarg del projecte, i l'alumne pot anar endavant i enrere entre
  fites sense perdre feina.
- Totes les eines dels labs anteriors estan disponibles alhora, amb els workspaces
  corresponents (Layout, Modeling, Shading, Animation).

## 2. Desar i continuar

A l'aula, els alumnes canvien d'ordinador. Per això:

- El projecte es desa a `localStorage` automàticament.
- **Exportar projecte:** descarrega un fitxer `.json` amb tota l'escena.
- **Importar projecte:** carrega aquest fitxer en qualsevol ordinador.
- Si l'alumne va desar el tamboret al repte final del Lab 02 o del Lab 03, pot començar
  des d'aquell model. Si no, es proporciona una malla base.

## 3. Fites

1. **Model.** El tamboret, amb topologia neta (sense n-gons ni vèrtexs duplicats) i dins
   d'unes proporcions de referència.
2. **Modificadors.** Com a mínim Mirror o Array i Subdivision o Bevel, sense aplicar.
3. **Materials.** Un material per al seient i un per a les potes, amb com a mínim una
   textura procedural.
4. **Escenari.** Un fons infinit (un pla corbat) sota el tamboret.
5. **Llum.** Un esquema de tres punts, amb una proporció key/fill dins d'un rang.
6. **Càmera.** Un pla de tres quarts, amb el subjecte en una intersecció de terços i la
   focal dins d'un rang de retrat de producte.
7. **Animació.** Un gir de 360° del tamboret (turntable) en un nombre de frames concret,
   amb un cicle sense salts.
8. **Render.** Configuració segons un brief (resolució, format, transparència o fons, View
   Transform).
9. **Lliurament.** Generació del lliurament.

## 4. Lliurament

- **Render final** en PNG, segons el brief.
- **Vídeo del turntable** en WebM, generat al navegador. El lab ha de dir clarament que
  aquest vídeo es fa amb el navegador i que, a Blender, la sortida es configura a la
  pestanya Output.
- **Fitxa de lliurament** en HTML imprimible: nom de l'alumne, miniatura, estadístiques de
  la malla, llista de modificadors i materials, llums, dades de càmera i configuració de
  render, amb l'estat de cada fita. Està pensada perquè el professor la pugui avaluar
  ràpidament o pujar-la a la plataforma del centre.
- El fitxer `.json` del projecte.

## 5. Transferència al Blender real

La pàgina del lab acaba amb una llista de comprovació imprimible per refer el mateix
projecte a Blender 5.2, fita per fita, amb les dreceres i els menús que s'han fet servir a
cada lab. Aquest és el pas que tanca el curs: l'objectiu és que l'alumne sigui capaç de
fer-ho sol al programa real.

## 6. Plànol de la pàgina índex

En completar aquest lab, el plànol del tamboret de la pàgina índex queda complet
(vegeu `docs/DESIGN.md`).

## 7. Fases

1. **Integració.** Totes les eines i workspaces disponibles alhora, sense conflictes de
   dreceres entre labs.
2. **Desar, exportar i importar.** Format `.json` versionat i validat en importar.
3. **Fites.** Comprovacions de cada fita.
4. **Lliurament.** Render PNG, vídeo WebM, fitxa imprimible.
5. **Pàgina del lab i llista de transferència.**
6. **Poliment.** Proves completes del projecte en un ordinador d'aula.
