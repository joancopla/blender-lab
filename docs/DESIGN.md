# Disseny de l'embolcall dels labs

Aquest document defineix l'aspecte de tot allò que **no** és la rèplica de Blender: la
pàgina índex, les pàgines de cada lab, el panell d'etapes, les pistes, la
retroalimentació i les preferències. La rèplica de Blender segueix el tema per defecte de
Blender i no es toca.

## Concepte: el full de plànol

Tot el curs gira al voltant de mirar un objecte des de diferents vistes i construir-lo amb
precisió. L'embolcall pren la forma d'un **plànol tècnic**: paper clar, línies de
construcció, vistes ortogràfiques (alçat, perfil, planta) i un caixetí amb la informació
del lab.

Hi ha dos motius per triar-lo:

- **Separació clara.** Blender és fosc i dens; l'embolcall és clar i ordenat. L'alumne
  sap en tot moment què és el programa i què és el lab.
- **El progrés es dibuixa.** L'element memorable de tot el web és un dibuix en tres vistes
  de l'objecte del repte final. Cada etapa superada hi afegeix línies. En acabar el curs,
  el plànol està complet. Això és el que fa que el web sigui únic, i és on es concentra
  tota l'audàcia visual. La resta ha de ser discret i disciplinat.

## Colors

| Nom | Hex | Ús |
|---|---|---|
| Paper | `#E9EDF0` | Fons general |
| Tinta | `#1C2530` | Text, botons principals, línies definitives del plànol |
| Construcció | `#9AB0C4` | Línies de construcció, graella de fons, vores |
| Eix X | `#D9423A` | Només per a l'eix X i errors |
| Eix Y | `#5E9E2F` | Només per a l'eix Y |
| Eix Z | `#2F6FD6` | Només per a l'eix Z, enllaços i èxit (segell d'etapa superada) |

- Els colors d'eix tenen significat. Mai s'usen com a decoració. Quan una consigna parla
  de l'eix X, la lletra X surt en vermell, igual que a Blender.
- Mode fosc (segons el sistema, amb opció manual): versió "blueprint", amb fons `#16212C`,
  tinta `#DCE6EE` i construcció `#3E5568`. Els colors d'eix s'ajusten perquè mantinguin el
  contrast.
- Contrast mínim WCAG AA a tot el text.

## Tipografia

- Una sola família: **Archivo** (Google Fonts, amb eix d'amplada variable).
  - Títols: amplada expandida (wdth 112–125), pes 600–700. Recorda els caixetins
    dels plànols tècnics. El títol és un element gràfic, no només text.
  - Cos: amplada normal, pes 400, 16–18 px, interlineat 1,5, línies de menys de 75
    caràcters.
  - Dreceres de teclat: es mostren com a tecles dibuixades (vora fina de color
    construcció, radi petit), amb la mateixa família. No fem servir una font monoespaiada
    per a les etiquetes.
- Escala tipogràfica modular (ràtio 1,25). Sentence case a tot arreu. No usem majúscules
  per a etiquetes.
- Stack de reserva: `Archivo, "Helvetica Neue", Arial, sans-serif`.

## Pàgina índex

```
+----------------------------------------------------------------+
|  [nom del projecte]                         Preferències  Mode |
+----------------------------------------------------------------+
|                                                                |
|   +--------------+  +--------------+                           |
|   |   Alçat      |  |   Perfil     |   Títol expandit gran     |
|   |  (dibuix)    |  |  (dibuix)    |   Una frase del que       |
|   +--------------+  +--------------+   aprendràs.              |
|   +--------------+                                             |
|   |   Planta     |                     [Continua el Lab 02]    |
|   |  (dibuix)    |                                             |
|   +--------------+                                             |
|                                                                |
|  Labs (llista en ordre, perquè és una seqüència)               |
|  1  Viewport i transformacions   9/9 etapes   Completat        |
|  2  Mode Edició                  3/10 etapes  En curs          |
|  3  ...                                       Aviat            |
+----------------------------------------------------------------+
```

- El hero és el plànol en tres vistes. Les línies de les etapes superades es dibuixen en
  tinta; les pendents, en línia de construcció. La primera vegada, el plànol està gairebé
  buit i hi ha un text que explica que es completarà a mesura que avancin.
- En passar el ratolí per sobre d'un lab de la llista, les línies que corresponen a aquell
  lab es ressalten al plànol. Així es veu la relació entre cada lab i l'objecte final.
- La llista de labs porta números perquè és una seqüència real. Són files alineades a
  l'esquerra, no targetes. L'estat es mostra amb text, no només amb color.
- El botó principal diu exactament què fa: "Comença el Lab 01" o "Continua el Lab 02".

## Pàgina de lab

```
+----------------------------------------------------------------+
| Caixetí: Lab 02  Mode Edició         Etapa 4 de 10    [Índex]  |
+-------------------------------------------+--------------------+
|                                           | Etapes (1-10, en   |
|                                           | llista vertical)   |
|        Rèplica de Blender                 |--------------------|
|        (tema de Blender, fosc)            | Consigna           |
|                                           | Tecles de l'etapa  |
|                                           | [Pista]            |
|                                           | Estat comprovació  |
|                                           | [Reinicia l'etapa] |
+-------------------------------------------+--------------------+
```

- El caixetí de dalt és una franja fina que imita el caixetí d'un plànol: número del lab,
  títol amb amplada expandida, etapa actual i accés a l'índex.
- El panell de la dreta té amplada fixa (320–360 px) i es pot plegar per donar tot l'espai
  a Blender. Plegat, queda una pestanya vertical amb el número d'etapa.
- Les etapes es mostren com una llista vertical amb números: superades, actual i
  pendents. Es pot tornar a una etapa superada.
- Les tecles de l'etapa es dibuixen com a tecles. Quan l'alumne en prem una, la tecla del
  panell fa un petit clic visual, connectat amb l'overlay de tecles.
- L'overlay de tecles i les preferències segueixen aquest mateix estil, no el de Blender.

## Retroalimentació

- **Comprovant:** text discret de l'estat ("Falta encaixar la cara superior").
- **Error:** diu què falla i com arreglar-ho, amb el color de l'eix X només al marcador,
  no a tot el text. Mai demana disculpes ni és vague.
- **Etapa superada:** l'únic moment d'animació orquestrada de tot el web. Apareix un
  segell blau (color eix Z) al panell i, a la vegada, una miniatura del plànol mostra com
  es dibuixa la línia nova que s'acaba de guanyar. Dura menys d'un segon. Amb
  `prefers-reduced-motion`, apareix directament sense animació.
- **Pista:** es desplega sota la consigna, amb una vora de color construcció a
  l'esquerra.

## Moviment

- Només hi ha animacions quan responen a una acció de l'alumne: plegar el panell,
  desplegar una pista, superar una etapa.
- Sense entrades en cascada a l'índex, sense efectes de hover a cada element i sense
  paral·laxi.

## Detalls de qualitat

- Graella de fons de línies de construcció molt subtil, només a l'índex i al caixetí; mai
  darrere de text llarg.
- Radis de vora petits i coherents per jerarquia: 2 px en tecles i camps, 4 px en panells.
  Sense ombres difuses genèriques; la profunditat s'indica amb línies, com en un plànol.
- Focus de teclat visible a tots els controls (contorn de 2 px en color eix Z).
- Responsive: l'índex funciona en mòbil; la pàgina de lab mostra en mòbil l'avís de
  teclat i ratolí, amb el mateix estil.
- No s'usa cap logotip de Blender. Veure la nota sobre el nom a `CLAUDE.md`.

## Textos

- Català, to directe, frases curtes, verbs actius: "Comença el lab", "Mostra una pista",
  "Reinicia l'etapa".
- Una acció es diu igual a tot arreu. Si el botó diu "Reinicia l'etapa", el missatge
  posterior diu "Etapa reiniciada".
