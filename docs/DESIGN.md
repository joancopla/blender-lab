# Disseny de l'embolcall dels labs

Aquest document defineix l'aspecte de tot allò que **no** és la rèplica de Blender: la
pàgina índex, les pàgines de cada lab, el panell d'etapes, les pistes, la
retroalimentació i les preferències. La rèplica de Blender segueix el tema per defecte de
Blender i no es toca.

## Concepte: estudi fosc amb accent turquesa

L'embolcall és fosc i sobri, com una eina professional de creació, amb un únic color
d'accent turquesa. El gris és fred (lleugerament blavós) perquè no es confongui amb el
gris neutre de Blender: l'alumne ha de saber en tot moment què és el programa i què és
el lab.

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
| Fons | `#111418` | Fons general |
| Superfície baixa | `#191C20` | Franges, zones secundàries |
| Superfície | `#1D2024` | Panells, files |
| Superfície alta | `#272A2E` | Tecles, controls, elements elevats |
| Línia | `#2C343D` | Vores i separadors |
| Text | `#E1E2E8` | Text principal |
| Text secundari | `#BACAC5` | Descripcions, estats |
| Text tènue | `#859490` | Números inactius, notes |
| Accent | `#57F1DB` | Botó principal, etapa actual, enllaços, focus, progrés, èxit |
| Accent fort | `#2DD4BF` | Hover del botó principal, segell |
| Text sobre accent | `#003731` | Text dels botons turquesa |
| Eix X | `#FF6B6B` | Només l'eix X i els errors |
| Eix Y | `#8BC34A` | Només l'eix Y |
| Eix Z | `#6EA8FF` | Només l'eix Z |

### Clar

| Nom | Hex |
|---|---|
| Fons | `#F4F6F8` |
| Superfície baixa | `#EDF0F3` |
| Superfície | `#E8ECEF` |
| Superfície alta | `#DDE2E6` |
| Línia | `#C9D1D8` |
| Text | `#14181C` |
| Text secundari | `#4A5754` |
| Accent (text, línies, botó) | `#0F766E`; text sobre accent `#FFFFFF` |
| Eixos X / Y / Z | `#C62828` / `#3D7420` / `#1D5FD1` |

- Els colors d'eix tenen significat i mai s'usen com a decoració. Quan una consigna parla
  de l'eix X, la lletra X surt en vermell, igual que a Blender.
- L'accent turquesa és l'únic color de marca. No hi ha altres colors decoratius.
- Contrast mínim WCAG AA a tot el text, en tots dos modes.

## Tipografia

- **Space Grotesk** (Google Fonts) per a tot el text: títols 600–700, cos 400, 16–17 px,
  interlineat 1,5, línies de menys de 75 caràcters.
- **JetBrains Mono** (Google Fonts) només per a etiquetes tècniques petites: comptadors
  ("3/10 etapes"), números de lab i d'etapa, estats.
- Les dreceres de teclat es mostren com a **tecles dibuixades** (superfície alta, vora de
  línia de 1 px amb vora inferior de 2 px, radi de 4 px) amb **Space Grotesk**, no amb la
  monoespaiada.
- Escala modular (ràtio 1,25). **Sentence case** a tot arreu; mai tot en minúscules ni tot
  en majúscules.
- Stacks de reserva: `"Space Grotesk", "Helvetica Neue", Arial, sans-serif` i
  `"JetBrains Mono", Consolas, monospace`.

## Pàgina índex

```
+----------------------------------------------------------------+
|  [nom del projecte]                         Preferències  Mode |
+----------------------------------------------------------------+
|   +-------------------------------+                            |
|   |  Alçat        Perfil          |   Títol gran               |
|   |  Planta       (nota)          |   Una frase del que        |
|   |  (graella fosca, línies       |   aprendràs.               |
|   |   turquesa / discontínues)    |   [Continua el Lab 02 →]   |
|   +-------------------------------+                            |
|                                                                |
|  Labs · Blender                                                |
|  01  Viewport i transformacions     9/9 etapes   [Completat]   |
|  ▌02 Mode Edició i modelat bàsic    3/10 etapes  [En curs]     |
|  ───── (línia de progrés turquesa sota cada fila)              |
|                                                                |
|  Control ràpid des del teclat: [G] [X]  [E]  [Tab] ...         |
+----------------------------------------------------------------+
```

- El hero és el plànol en tres vistes dins d'un panell amb graella fosca subtil. Les
  línies de les etapes superades es dibuixen en turquesa; les pendents, en línia
  discontínua de color text tènue. La primera vegada, el plànol està gairebé buit i hi ha
  un text que explica que es completarà a mesura que avancin.
- En passar el ratolí per sobre d'un lab, les línies que corresponen a aquell lab es
  ressalten al plànol.
- Els labs són **files numerades** (seqüència real), no targetes: número gran en mono, títol,
  descripció, comptador d'etapes i estat en una etiqueta amb text ("Completat", "En curs",
  "No començat"). El lab en curs porta una barra turquesa a l'esquerra. Sota cada fila, una
  línia fina de progrés.
- Només es mostren labs que existeixen. Res de mòduls inventats ni "properament".
- El botó principal diu exactament què fa: "Comença el Lab 01", "Continua el Lab 02" o
  "Repassa el Lab 01".
- Una franja de dreceres bàsiques amb tecles dibuixades, amb dreceres reals dels labs.

## Pàgina de lab

```
+----------------------------------------------------------------+
| Caixetí: Lab 02  Mode Edició       Etapa 4 de 10   Mode  Índex |
+-------------------------------------------+--------------------+
|                                           | Etapes (1-10, en   |
|                                           | llista vertical)   |
|        Rèplica de Blender                 |--------------------|
|        (tema de Blender)                  | Consigna           |
|                                           | [Pista]            |
|                                           | Tecles de l'etapa  |
|                                           | Estat comprovació  |
|                                           | [Reinicia l'etapa] |
+-------------------------------------------+--------------------+
```

- El caixetí de dalt és una franja fina: número del lab (mono), títol, etapa actual, mode
  i accés a l'índex.
- El panell de la dreta té amplada fixa (320–360 px) i es pot plegar per donar tot l'espai
  a Blender. Plegat, queda una pestanya vertical amb el número d'etapa.
- Les etapes es mostren com una llista vertical numerada: superades (marca turquesa i la
  paraula "Superada"), actual (barra turquesa a l'esquerra) i pendents (text tènue). Es pot
  tornar a una etapa superada.
- Les tecles de l'etapa es dibuixen com a tecles. Quan l'alumne en prem una, la tecla del
  panell fa un petit clic visual (s'enfonsa i s'il·lumina en turquesa), connectat amb
  l'overlay de tecles.
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

- Radis petits i coherents: 4 px en tecles, botons i camps; 6 px en panells.
- Sense ombres difuses; la profunditat s'indica amb esglaons de superfície i línies.
- Graella de fons subtil només al panell del plànol i al caixetí.
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
