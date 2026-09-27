# Lab 07 — Render i sortida

L'alumne aprèn a treure una imatge final de Blender amb les especificacions que demana un
encàrrec: motor, mostres, resolució, format de fitxer, fons transparent i gestió del
color.

Llegeix `CLAUDE.md` i `specs/blender/README.md` abans de res.

**Depèn de:** Labs 01, 04, 05 i 06 (materials, llum i càmera ja construïts).

---

## 1. Interfície replicada

- **Pestanya Render:** Render Engine (EEVEE, Workbench, Cycles), Sampling (Viewport i
  Render), Film > Transparent i Color Management (Display Device, View Transform, Look,
  Exposure, Gamma).
- **Pestanya Output:** Resolution X/Y i percentatge, Frame Rate, Frame Range, i Output amb
  File Format (PNG, JPEG, OpenEXR), Color (BW, RGB, RGBA), Color Depth i Compression o
  Quality.
- **F12:** obre una finestra de render (Image Editor) on la imatge es va completant.
  Render slots amb J per alternar i Image > Save As (Shift+Alt+S). **F11:** tornar a
  mostrar l'últim render.
- `// FIDELITY?` amb les opcions exactes de View Transform i Look a Blender 5.2.

## 2. Comportament i límits

- **EEVEE:** el renderer del lab, a la resolució demanada. Les mostres s'acumulen de manera
  progressiva i es veu com millora l'antialiàsing i les ombres suaus.
- **Workbench:** render de previsualització amb l'aspecte del mode Solid.
- **Cycles:** no es pot simular al navegador. Surt a la llista però, en triar-lo, el lab
  explica què és i en què es diferencia de EEVEE, amb renders estàtics fets per Joan
  amb Blender. Mai es presenta una imatge del lab com a Cycles.
- **View Transform:** AgX i Standard com a mínim. Khronos PBR Neutral amb el tone mapping
  neutral de three.js. False Color amb un shader propi que acoloreixi per zones
  d'exposició. Filmic només si es pot aproximar amb prou fidelitat; si no, fora d'abast i
  documentat.
- **Guardar:** descarrega el fitxer real, generat al navegador. PNG i JPEG com a mínim.
  OpenEXR només si hi ha una manera lleugera de fer-ho; si no, fora d'abast.
- El panell del lab mostra el pes real del fitxer generat, per comparar formats.

## 3. Fora d'abast

Render d'animació i vídeo (es veu al projecte final), View Layers, passes de render,
Compositor i render per línia d'ordres.

## 4. Etapes

1. **Primer render.** Fer F12, veure la finestra de render i desar la imatge.
2. **Resolució.** Fer un render de prova al 50 % i el final al 100 %. La consigna
   explica per què es fa així.
3. **Formats.** Desar la mateixa imatge en PNG i en JPEG amb qualitat baixa, i comparar
   qualitat i pes.
4. **Fons transparent.** Film > Transparent i PNG RGBA, per poder fer servir el render en
   un muntatge.
5. **AgX o Standard.** Una escena amb llum molt forta: comparar com es cremen els colors
   amb Standard i com els conserva AgX.
6. **Exposició.** Fer servir False Color per ajustar Exposure fins que el subjecte quedi a
   la zona correcta.
7. **Mostres.** Comparar pocs i molts samples i trobar un equilibri entre temps i qualitat.
8. **Workbench.** Fer un render ràpid de previsualització per ensenyar-lo a un client.
9. **Comparar versions.** Fer dos renders amb canvis en slots diferents i comparar-los amb
   J.
10. **Repte final: l'encàrrec.** Un brief de client en català amb especificacions
    concretes (per exemple, 1920×1080, PNG RGBA de 16 bits, fons transparent, AgX amb un
    Look concret i exposició correcta). La comprovació llegeix la configuració i el fitxer
    generat.

## 5. Pàgina del lab

Com als anteriors. El bloc "Al Blender real" ha d'explicar Cycles, el render per GPU,
la sortida d'animació en seqüència d'imatges i la carpeta de sortida.

## 6. Fases

1. **Pestanyes Render i Output.**
2. **Finestra de render.** F12, acumulació progressiva, slots, F11 i desar.
3. **Gestió del color.** View Transforms, Looks, Exposure, Gamma i False Color.
4. **Formats de fitxer i transparència.**
5. **Etapes i web**, incloent-hi els renders estàtics de Cycles que aporta Joan.
6. **Poliment.**
