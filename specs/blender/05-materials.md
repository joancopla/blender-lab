# Lab 05 — Materials i nodes

L'alumne aprèn com respon la superfície d'un objecte a la llum i com es construeix un
material amb nodes. En acabar, ha de saber fer materials bàsics amb el Principled BSDF i
els primers materials procedurals.

Llegeix `CLAUDE.md` i `specs/blender/README.md` abans de res.

**Depèn de:** Lab 01, Properties Editor, mòdul de render (Lab 04, segons l'ordre de
construcció). Aquest lab construeix l'**editor de nodes**.

---

## 1. Interfície replicada

Una versió simplificada del workspace Shading:

- **Viewport** a dalt, en Material Preview per defecte. Es pot canviar a Solid i a
  Rendered des de la capçalera i amb el pie menu de Z.
- **Shader Editor** a baix.
- **Properties Editor** amb la pestanya Material: llista de material slots, botó New,
  nom del material i panell Surface, que mostra les entrades del Principled BSDF
  sincronitzades amb els nodes.

Material Preview fa servir un HDRI d'estudi. Cal incloure'n un de llicència CC0 (per
exemple, de Poly Haven) a resolució reduïda. `// FIDELITY?` amb l'aspecte per defecte de
Blender.

## 2. Editor de nodes

Component nou a `src/apps/blender/ui/node-editor/`. Cal replicar:

- Navegació: botó del mig per desplaçar, roda per fer zoom, Home per veure-ho tot.
- Selecció amb clic, Shift+clic i caixa. G per moure, Shift+D per duplicar, X per
  esborrar, Ctrl+X per esborrar mantenint la connexió.
- **Shift+A:** menú d'afegir amb les categories de Blender 5.2 i cerca.
- **Connexions:** arrossegar d'un socket a un altre. Arrossegar des d'una entrada
  connectada mou o desconnecta l'enllaç. Ctrl+botó dret arrossegant talla enllaços.
  Deixar anar un node sobre un enllaç l'insereix al mig.
- M silencia un node. H el plega. Ctrl+H amaga els sockets sense connectar.
- Colors dels sockets segons el tipus (color, valor, vector, shader) i conversions
  implícites de Blender (per exemple, color a valor en escala de grisos).
- `// FIDELITY?` amb qualsevol comportament de connexió que no quedi clar.

## 3. Nodes dins d'abast

- **Sortida i shaders:** Material Output, Principled BSDF, Emission, Mix Shader.
- **Principled BSDF:** entrades agrupades en panells com a Blender 5.2 (Base Color,
  Metallic, Roughness, IOR, Alpha, Normal; i els panells Subsurface, Specular, Transmission,
  Coat, Sheen i Emission). En aquest lab s'implementen Base Color, Metallic, Roughness, IOR,
  Alpha, Normal, Transmission, Coat i Emission. La resta de panells surten però no tenen
  efecte, i el lab ho indica.
- **Textures:** Noise Texture, Checker Texture, Wave Texture i Image Texture (amb un joc de
  textures CC0 incloses al projecte).
- **Color i conversió:** Color Ramp, Mix (tipus Color, amb els modes Mix, Multiply,
  Overlay i Screen), RGB, Value.
- **Vector:** Texture Coordinate (Generated i Object), Mapping, Bump, Normal Map.

UV no entra en aquest lab, perquè no s'ha ensenyat a desplegar.

## 4. Compilació del graf

- El graf de nodes es tradueix a un material de three.js amb TSL. Cada node de Blender té
  el seu equivalent en TSL.
- El Principled BSDF s'aproxima amb `MeshPhysicalMaterial` (o l'equivalent de nodes).
  Documenta les diferències visibles a `docs/fidelity/blender.md`.
- Les textures procedurals no cal que siguin idèntiques píxel a píxel, però els
  paràmetres (Scale, Detail, Roughness, Distortion...) s'han de comportar igual:
  si l'alumne puja Detail, ha de passar el mateix que a Blender. `// FIDELITY?`
- La recompilació és immediata en canviar un valor o una connexió. Si falla, el material
  passa a magenta (com fa Blender amb una textura que falta) i el lab mostra un avís.

## 5. Fora d'abast

UV i desplegament, pintura de textures, bake, Displacement real, Volume, Shader to RGB,
Node Wrangler i grups de nodes.

## 6. Etapes

Les comprovacions fan servir els paràmetres del material sempre que sigui possible. Només
els reptes oberts fan servir la comparació d'imatges amb referències generades pel
mateix renderer.

1. **Primer material.** Crear un material nou i canviar-ne el Base Color.
2. **Metall o plàstic.** Fer dos materials que coincideixin amb dues esferes de
   referència. La consigna explica què fa Metallic.
3. **Rugositat.** Ajustar Roughness fins que el reflex de l'HDRI sigui com el de la
   referència.
4. **Vidre.** Fer un material transparent amb Transmission i IOR.
5. **Emissió.** Fer brillar una part de l'objecte amb Emission.
6. **Primer graf.** Connectar Noise Texture, Color Ramp i Base Color per fer una superfície
   tacada.
7. **Escala i coordenades.** Canviar la mida del patró amb Mapping i Texture Coordinate.
8. **Relleu.** Fer servir el soroll per al relleu amb Bump connectat a Normal.
9. **Barrejar.** Posar rovell sobre metall barrejant dos colors i dues rugositats amb una
   màscara de soroll.
10. **Repte final.** Crear els materials del tamboret (fusta procedural per al seient,
    metall per a les potes) fins a aproximar-se a un render de referència.

En acabar, **mode lliure** amb tots els nodes del lab.

## 7. Pàgina del lab

Com als anteriors. El bloc "Al Blender real" ha d'explicar el workspace Shading, on hi ha
la pestanya Material i què és UV (que es veurà més endavant).

## 8. Fases

1. **Editor de nodes (model).** Model de dades del graf, tipus de sockets, conversions,
   validació i tests.
2. **Editor de nodes (interfície).** Dibuix, navegació, selecció, connexions i Shift+A.
3. **Compilació.** Traducció a TSL de tots els nodes del lab, amb recompilació en viu.
4. **Pestanya Material i workspace Shading.** Slots, panell Surface sincronitzat i HDRI.
5. **Etapes i web.**
6. **Poliment.** Rendiment dels shaders en ordinadors modestos i fidelitat documentada.
