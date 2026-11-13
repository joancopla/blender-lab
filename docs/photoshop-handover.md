# Com continuar la part de Photoshop pel teu compte

Guia per al professor de Photoshop que vol duplicar aquest projecte i fer-hi créixer els labs de
Photoshop amb Claude Code. Estat: **esborrany de la Fase 0**. Les seccions marcades amb
"(pendent)" es completen quan la mostra (programa mínim i Lab 01) estigui acabada.

## Què et trobaràs

Un web estàtic amb laboratoris interactius: cada lab replica una part de la interfície d'un
programa i proposa etapes curtes amb comprovació automàtica. Ara hi ha Blender, grandMA3 i la
mostra de Photoshop. El codi és TypeScript amb Vite; no cal saber-ne per començar, però sí
entendre com està organitzat:

- `CLAUDE.md`: les regles del projecte. Claude Code el llegeix a cada sessió. És el fitxer més
  important.
- `specs/photoshop/`: què ha de fer cada lab. Abans de programar un lab, se n'escriu
  l'especificació aquí.
- `docs/fidelity/photoshop.md`: la llista de tot el que el lab copia de Photoshop, amb una
  casella per validar cada element amb el programa obert al costat.
- `src/apps/photoshop/`: la rèplica de Photoshop. `src/labs/photoshop/`: les etapes de cada lab.
- `src/core/`: el nucli comú a tots els programes. Millor no tocar-lo si no cal.

## Què necessites

- Un compte de GitHub.
- Git i Node.js 24 instal·lats.
- Claude Code (https://claude.com/claude-code).
- Photoshop, en la versió de l'aula, per validar.

## Duplicar el projecte

1. A GitHub, obre `https://github.com/joancopla/blender-lab` i fes **Fork**. Tria el nom del teu
   repositori (per exemple, `photoshop-lab`).
2. Clona el teu fork a l'ordinador i instal·la les dependències:

   ```
   git clone https://github.com/EL-TEU-USUARI/photoshop-lab.git
   cd photoshop-lab
   npm install
   ```

3. Comprova que tot funciona:

   ```
   npm test
   npm run dev
   ```

   `npm run dev` obre el web a l'ordinador (l'adreça surt al terminal).

## Publicar el teu web

El projecte es publica sol a GitHub Pages cada vegada que puges canvis a la branca `main`.

1. Al teu repositori: **Settings > Pages > Source: GitHub Actions**.
2. A la pestanya **Actions**, activa els workflows si GitHub t'ho demana (als forks venen
   desactivats).
3. Puja qualsevol canvi a `main`. Al cap d'un parell de minuts, el web és a
   `https://EL-TEU-USUARI.github.io/photoshop-lab/`.

El workflow passa els tests abans de publicar: si un test falla, no es publica res.

## Adaptar el `CLAUDE.md`

Abans de la primera sessió de feina, canvia aquestes coses al teu `CLAUDE.md` (pots demanar-ho
a Claude Code mateix):

- **Autor i validador:** tu, com a professor de Photoshop i expert de domini.
- **Versió, idioma i sistema de referència** de Photoshop a la teva aula (taula de
  `specs/photoshop/README.md`). La rèplica és en castellà; tots els textos són a
  `src/apps/photoshop/ui/labels.ts` i els has de comparar amb el programa.
- **Programari actual:** si només vols Photoshop, digues-ho (vegeu l'apartat següent).
- **Nom del projecte** i frase del peu de pàgina: ha de dir que és un projecte educatiu
  independent, i no pot semblar un producte d'Adobe.
- Mantén les regles de fidelitat, d'idioma, d'arquitectura i la manera de treballar per fases:
  són el que fa que el resultat sigui fiable.

## Si només vols Photoshop (pendent)

Es poden treure Blender i grandMA3 del teu fork perquè Claude Code no s'hi distregui i el web
només mostri Photoshop. La llista exacta de carpetes i fitxers que cal treure s'escriurà aquí
quan la mostra estigui acabada.

## Com treballar amb Claude Code

Obre Claude Code a la carpeta del projecte. El cicle que funciona:

1. **Especificació.** Explica-li el lab que vols (què ha d'aprendre l'alumne, quines etapes) i
   demana-li que n'escrigui l'especificació a `specs/photoshop/`. Revisa-la.
2. **Pla.** Demana-li el pla per fases abans que programi res.
3. **Una fase cada vegada.** En acabar cada fase et dirà què ha fet, què has de provar i quins
   dubtes de fidelitat té. Prova-ho al navegador abans de donar pas a la següent.
4. **Validació.** Repassa `docs/fidelity/photoshop.md` amb Photoshop obert i digues-li què no
   coincideix. No donis res per bo de memòria: per això hi ha les caselles.

Si Claude Code no està segur de com es comporta Photoshop, t'ho ha de preguntar o apuntar-ho amb
❓, mai inventar-s'ho. Si veus que s'inventa un comportament, recorda-li la regla de fidelitat.

## Afegir un lab nou (pendent)

Els passos concrets (carpeta del lab, pàgina, catàleg, entrada a `vite.config.ts`) s'escriuran
aquí prenent el Lab 01 com a exemple.

## Llicència i marques

- El projecte és **GPL-3.0-or-later**: el pots copiar i modificar, però el que publiquis ha de
  mantenir la mateixa llicència i el fitxer `LICENSE`, i ha de dir d'on ve.
- No facis servir logotips, icones ni imatges d'Adobe. Les icones es dibuixen de nou i les
  imatges de pràctica es generen amb codi o són CC0.
