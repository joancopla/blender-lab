# Disseny de l'embolcall dels labs

Aquest document defineix l'aspecte de tot allò que **no** és la rèplica de Blender: la
pàgina índex, les pàgines de cada lab, el panell d'etapes, les pistes, la
retroalimentació i les preferències. La rèplica de Blender segueix el tema per defecte de
Blender i no es toca.

## Concepte: estudi fosc, tipografia gran i accent turquesa

L'embolcall és fosc i neutre, com una eina professional de creació, amb un únic color
d'accent turquesa. Té caràcter gràcies a la tipografia: títols molt grans, gruixuts i
compactes, i una segona línia en color d'accent. Els grisos són neutres i lleugerament
càlids, diferents del gris de Blender, i el turquesa no coincideix amb cap color de la
interfície de Blender (el taronja és la selecció): l'alumne ha de saber en tot moment què
és el programa i què és el lab.

L'element memorable del web continua sent el **plànol del repte final**: un dibuix en tres
vistes (alçat, perfil, planta) de l'objecte que es construeix al curs. Cada etapa
superada hi afegeix línies en turquesa. En acabar el curs, el plànol està complet. La
resta ha de ser discret i disciplinat.

## Colors

Mode fosc per defecte. L'alumne pot canviar a mode clar quan vulgui (botó "Mode" a la
capçalera de l'índex i al caixetí del lab); la tria es recorda.

### Fosc (per defecte)

| Nom | Hex | Ús |
|---|---|---|
| Fons | `#17191C` | Fons general |
| Superfície baixa | `#1C1E22` | Franges, zones secundàries, panell del plànol |
| Superfície | `#222529` | Panells, targetes |
| Superfície alta | `#2C3035` | Tecles, controls, elements elevats |
| Línia | `#363A41` | Vores i separadors |
| Línia forta | `#4A4F57` | Vores en hover, botons secundaris |
| Text | `#F2F3F4` | Text principal |
| Text secundari | `#B0B5BD` | Descripcions, estats |
| Text tènue | `#858B94` | Números inactius, notes |
| Accent | `#57F1DB` | Botó principal, etapa actual, enllaços, focus, progrés, èxit |
| Accent fort | `#2DD4BF` | Hover del botó principal, segell |
| Text sobre accent | `#003731` | Text dels botons turquesa |
| Eix X | `#FF6B6B` | Només l'eix X i els errors |
| Eix Y | `#8BC34A` | Només l'eix Y |
| Eix Z | `#6EA8FF` | Només l'eix Z |

### Clar

| Nom | Hex |
|---|---|
| Fons | `#F6F5F3` |
| Superfície baixa | `#EFEEEB` |
| Superfície | `#FFFFFF` |
| Superfície alta | `#E9E7E3` |
| Línia / línia forta | `#DCD9D3` / `#C3BFB8` |
| Text | `#16181B` |
| Text secundari / tènue | `#50555C` / `#666B73` |
| Accent (text, línies, botó) | `#0F766E`; text sobre accent `#FFFFFF` |
| Eixos X / Y / Z | `#C62828` / `#3D7420` / `#1D5FD1` |

- Els colors d'eix tenen significat i mai s'usen com a decoració. Quan una consigna parla
  de l'eix X, la lletra X surt en vermell, igual que a Blender.
- L'accent turquesa és l'únic color de marca. No hi ha altres colors decoratius.
- Contrast mínim WCAG AA a tot el text, en tots dos modes.

## Tipografia

- **Inter** (Google Fonts) per a tot el text: cos 400, 16–18 px, interlineat 1,5, línies
  de menys de 75 caràcters.
- **Títols grans** de la pàgina índex (hero i nom del programa): Inter 800, interlineat
  0,95–1, espaiat entre lletres negatiu (entre −0,035 i −0,055 em). El títol del hero té
  dues parts: la primera en color text i la segona en color d'accent. Títols de targeta i
  de secció: Inter 700, espaiat −0,03 em.
- **Etiquetes petites** sobre els títols ("Programari 3D · 4 labs"): Inter 600, 13 px,
  color d'accent, espaiat +0,06 em, en sentence case (mai en majúscules).
- **JetBrains Mono** (Google Fonts) només per a etiquetes tècniques petites: comptadors
  ("3/10 etapes"), números de lab i d'etapa, estats, tecles al peu de les il·lustracions.
- Les dreceres de teclat es mostren com a **tecles dibuixades** (superfície alta, vora de
  línia de 1 px amb vora inferior de 2 px, radi de 4 px) amb **Inter**, no amb la
  monoespaiada.
- Escala modular (ràtio 1,25) per al text de les pàgines de lab. **Sentence case** a tot
  arreu; mai tot en minúscules ni tot en majúscules.
- Stacks de reserva: `"Inter", "Segoe UI", Arial, sans-serif` i
  `"JetBrains Mono", Consolas, monospace`.

## Pàgina índex

```
+----------------------------------------------------------------+
|  [marca] [nom del projecte]        Labs  Preferències  Mode    |
+--------------------------------+-------------------------------+
|  · Etiqueta petita             |  (graella subtil)             |
|  Aprèn programari creatiu      |   +--------+ +--------+       |
|  construint, pas a pas.        |   | Alçat  | | Perfil |       |
|  (2a línia en turquesa)        |   +--------+ +--------+       |
|  Una frase del que aprendràs.  |   +--------+  El repte final  |
|  [Continua el Lab 02 →]        |   | Planta |  (nota)          |
|  [Mira els labs ↓]             |   +--------+                  |
+--------------------------------+-------------------------------+
|  Programari 3D · 4 labs                                        |
|  Blender (títol gran)                     Frase del programa   |
|  +--------------------------+  +--------------------------+    |
|  | il·lustració del lab     |  | il·lustració del lab     |    |
|  |        tecles del lab    |  |        tecles del lab    |    |
|  | 01  9 etapes  ○ Estat    |  | 02  10 etapes  ● En curs |    |
|  | Títol del lab            |  | Títol del lab            |    |
|  | Descripció               |  | Descripció               |    |
|  | ───── progrés            |  | ───── progrés            |    |
|  | 3/9 etapes   Continua →  |  | 0/10 etapes  Comença →   |    |
|  +--------------------------+  +--------------------------+    |
|                                                                |
|  Control ràpid des del teclat: [G] Moure  [R] Girar ...        |
+----------------------------------------------------------------+
```

- **Hero partit en dos**, a tota l'amplada: a l'esquerra, l'etiqueta petita amb un punt
  d'accent, el títol gran, una frase i les accions; a la dreta, el plànol en tres vistes
  sobre una graella subtil, amb la nota "El repte final". Un degradat molt suau del color
  d'accent (tint) il·lumina la cantonada superior esquerra del text.
- Al plànol, les línies de les etapes superades es dibuixen en turquesa; les pendents, en
  línia discontínua de color text tènue. La primera vegada, el plànol està gairebé buit i
  la nota explica que es completarà a mesura que avancin.
- Els labs de cada programa són **targetes amb il·lustració**, dues per fila (una en
  pantalles estretes), en l'ordre real de la seqüència. Cada targeta té:
  - una il·lustració isomètrica pròpia sobre un fons fosc tipus viewport (també en mode
    clar), dibuixada amb el llenguatge visual de Blender (objectes grisos, contorn taronja
    de l'objecte actiu, colors d'eix); al peu, les tecles clau del lab en mono;
  - número del lab en mono i en color d'accent, nombre d'etapes i estat amb un punt i text
    ("Completat", "En curs", "No començat", "En construcció");
  - títol, descripció, barra fina de progrés, comptador i una acció: "Comença →",
    "Continua →" o "Repassa →"; si hi ha progrés, l'enllaç "Reinicia el progrés".
  - El lab en curs porta la vora en color d'accent.
- En passar el ratolí per sobre d'una targeta, les línies d'aquell lab es ressalten al
  plànol.
- Només es mostren labs que existeixen. Res de mòduls inventats ni "properament".
- El botó principal diu exactament què fa: "Comença el Lab 01", "Continua el Lab 02" o
  "Repassa el Lab 01". El botó secundari ("Mira els labs") baixa fins a la llista.
- Una franja de dreceres bàsiques amb tecles dibuixades, amb dreceres reals dels labs.
- **Mòbil** (menys de 600 px): hero simplificat amb només l'etiqueta, el títol, la frase i
  el botó principal a tota l'amplada; el plànol i el botó secundari no es mostren. Les
  targetes van una sota l'altra. Cap element pot provocar desplaçament horitzontal.

## Pàgina de lab

La pàgina de lab segueix el mateix llenguatge que la pàgina índex. De dalt a baix:

```
+----------------------------------------------------------------+
|  [marca] [nom del projecte]                 Tots els labs  Mode |
+--------------------------------+-------------------------------+
|  · Lab 02 · Blender            |  (graella subtil)             |
|  Títol gran del lab            |   +-----------------------+   |
|  Frase del que aprendràs.      |   | il·lustració del lab  |   |
|  10 etapes ───────  3/10       |   |        tecles del lab |   |
|  [Continua el lab →] [Controls]|   +-----------------------+   |
+--------------------------------+-------------------------------+
|  Controls clau                                                 |
|  [Entrar al Mode Edició  Tab] [Vèrtexs, arestes i cares 1,2,3] |
+----------------------------------------------------------------+
| Caixetí: 02 Mode Edició     Etapa 4 de 10 ───   Mode  [Índex]  |
+-------------------------------------------+--------------------+
|                                           | Etapes 3/10  Plega |
|                                           | [El repte final]   |
|        Rèplica de Blender                 | ① Etapa superada   |
|        (tema de Blender)                  | ④ Etapa actual     |
|                                           | ○ Etapa pendent    |
|                                           | +----------------+ |
|                                           | | Etapa 4 de 10  | |
|                                           | | Títol, consigna| |
|                                           | | tecles, pista  | |
|                                           | | [Següent →]    | |
|                                           | +----------------+ |
+-------------------------------------------+--------------------+
|  Del lab al programa                                           |
|  Al Blender real (títol gran)                 Frase d'entrada  |
|  [Eina: on es troba]  [Eina: on es troba]  (dues columnes)     |
|                                                                |
|  Següent lab                                                   |
|  +--------------------+-------------------------------------+ |
|  | il·lustració       | 03  10 etapes                       | |
|  |                    | Títol · descripció · Comença →      | |
|  +--------------------+-------------------------------------+ |
+----------------------------------------------------------------+
```

- **Barra superior** igual que la de l'índex (marca i nom del projecte, "Tots els labs" i
  "Mode"), però no queda fixa en desplaçar-se: el lab necessita tota l'alçada.
- **Introducció partida en dos**, com el hero de l'índex: etiqueta petita "Lab 02 ·
  Blender", títol gran (Inter 800, compacte), una frase, una línia amb el nombre d'etapes,
  la barra de progrés i "3/10 superades", i les accions "Comença el lab" o "Continua el
  lab" i "Controls clau". A la dreta, la mateixa il·lustració de la targeta de l'índex, en
  gran, sobre graella subtil. Un lab sense il·lustració fa servir només la columna de text.
- **Controls clau** en una graella de targetes petites: què fa cada control i, a la
  dreta, les tecles dibuixades com una tecla.
- El **caixetí** és una franja fina (50 px): número del lab en mono i turquesa, títol,
  etapa actual amb una barra de progrés fina, "Mode" i "Índex" com a botons petits.
- El **panell de la dreta** té amplada fixa (320–360 px) i es pot plegar per donar tot
  l'espai a Blender. Plegat, queda una pestanya vertical amb el número d'etapa. La capçalera
  mostra "Etapes" i el comptador de superades en turquesa.
- El plànol en miniatura va dins una targeta petita amb l'etiqueta "El repte final".
- Les etapes es mostren com un **recorregut vertical**: cercles numerats units per una
  línia. Superada: cercle turquesa ple i la paraula "Superada". Actual: anell turquesa i
  fons tint. Pendent: anell de línia forta i text tènue. Es pot tornar a una etapa
  superada.
- L'**etapa actual** va dins una targeta: "Etapa 4 de 10" en mono i turquesa, títol,
  consigna, tecles, pista, estat i accions. El botó "Següent →" ocupa la resta de la fila i
  és el botó principal quan l'etapa està superada.
- Les tecles de l'etapa es dibuixen com a tecles. Quan l'alumne en prem una, la tecla del
  panell fa un petit clic visual (s'enfonsa i s'il·lumina en turquesa), connectat amb
  l'overlay de tecles.
- **Al Blender real**: etiqueta petita, títol gran i una frase; cada punt és una targeta
  amb el nom de l'eina en negreta i on es troba al programa, en dues columnes.
- **Següent lab**: una targeta amb la il·lustració del lab següent, el número, les etapes,
  el títol, la descripció i "Comença el Lab 03 →". L'últim lab d'un programa no en té.
- L'overlay de tecles i les preferències segueixen aquest mateix estil, no el de Blender.

## Retroalimentació

- **Comprovant:** text discret de l'estat en text secundari.
- **Error:** diu què falla i com arreglar-ho, amb el color de l'eix X només al marcador
  (un quadrat petit), no a tot el text. Mai demana disculpes ni és vague.
- **Etapa superada:** l'únic moment d'animació orquestrada de tot el web. Apareix un
  segell turquesa al panell i, a la vegada, una miniatura del plànol mostra com es dibuixa
  la línia nova que s'acaba de guanyar. Dura menys d'un segon. Amb
  `prefers-reduced-motion`, apareix directament sense animació.
- **Pista:** es desplega sota la consigna, amb una vora de color línia a l'esquerra.

## Moviment

- Només hi ha animacions quan responen a una acció de l'alumne: plegar el panell,
  desplegar una pista, prémer una tecla, superar una etapa.
- Res que es mogui sol: sense carrusels, sense pulsacions ni resplendors en bucle, sense
  entrades en cascada i sense paral·laxi.

## Detalls de qualitat

- Radis petits i coherents: 4 px en tecles i camps; 6 px en botons, panells i targetes
  petites (controls, punts d'"Al Blender real"); 10 px en les targetes grans (labs, etapa
  actual, plànol, segell, lab següent) i en les vistes del plànol de l'índex.
- Sense ombres difuses; la profunditat s'indica amb esglaons de superfície i línies.
- Graella de fons subtil només darrere del plànol i de la il·lustració de la introducció del
  lab. Els únics degradats són el tint suau dels hero i el fons tipus viewport de les
  il·lustracions.
- Focus de teclat visible a tots els controls (contorn de 2 px en color accent).
- Icones: com a molt unes poques icones SVG pròpies i simples. Sense fonts d'icones
  externes.
- Responsive: l'índex funciona en mòbil; la pàgina de lab mostra en mòbil l'avís de
  teclat i ratolí, amb el mateix estil.
- No s'usa cap logotip de Blender ni de cap altre fabricant. Tampoc s'hi posen versions,
  dades d'usuari ni estats inventats ("sessió activa", "sincronitzat"...). Veure la nota
  sobre el nom a `CLAUDE.md`.

## Textos

- Català, to directe, frases curtes, verbs actius: "Comença el lab", "Mostra una pista",
  "Reinicia l'etapa".
- Una acció es diu igual a tot arreu. Si el botó diu "Reinicia l'etapa", el missatge
  posterior diu "Etapa reiniciada".
