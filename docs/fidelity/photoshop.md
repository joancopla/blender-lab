# Fidelitat a Adobe Photoshop

Llista del que replica el lab. Marca cada casella quan ho hagis comprovat amb Photoshop obert al
costat. Els elements marcats amb ❓ són dubtes oberts: al codi porten `// FIDELITY?`.

Font per a dubtes: https://helpx.adobe.com/photoshop/user-guide.html

Aquesta llista s'ha escrit abans de programar res i sense Photoshop al davant: tot està per
validar, també el que no porta ❓.

## Referència

- [ ] ❓ Versió de l'aula (Help > About Photoshop). Photoshop 2025 = 26.x; Photoshop 2026 = 27.x
- [ ] ❓ Idioma de la interfície a l'aula (el lab la replica en anglès)
- [ ] ❓ Sistema de l'aula: Windows (Ctrl, Alt) o Mac (Cmd, Option)
- [ ] ❓ Espai de treball per defecte: Essentials (Default)
- [ ] ❓ Tema de color de la interfície per defecte i els seus grisos

## Lab 01 — Capes

### Finestra

- [ ] Barra de menús: File, Edit, Image, Layer, Type, Select, Filter, View, Plugins, Window, Help
- [ ] ❓ Text de la pestanya del document: `nom.psd @ 100% (Capa, RGB/8#)` (format exacte i quan surt l'asterisc)
- [ ] ❓ Posició per defecte dels panells: Tools a l'esquerra, Options bar a dalt, Layers a baix a la dreta
- [ ] ❓ La barra de tasques contextual (Contextual Task Bar) surt per defecte sota el llenç; el lab no la replica
- [ ] Les zones transparents es veuen amb un fons d'escacs gris i blanc
- [ ] ❓ Mida i colors del fons d'escacs per defecte

### Eina Move

- [ ] `V` activa l'eina Move
- [ ] Arrossegar al llenç mou la capa seleccionada
- [ ] Options bar: casella Auto-Select i desplegable Layer / Group
- [ ] ❓ Auto-Select ve activat o desactivat per defecte en aquesta versió
- [ ] Amb Auto-Select activat, un clic selecciona la capa de més amunt amb contingut sota el cursor
- [ ] ❓ Amb Auto-Select, llindar de transparència perquè un píxel compti com a contingut
- [ ] ❓ Amb Auto-Select desactivat, Ctrl + clic al llenç selecciona la capa de sota el cursor
- [ ] Les fletxes mouen la capa 1 px; amb Shift, 10 px
- [ ] ❓ Show Transform Controls a l'Options bar (el lab el dibuixa desactivat)
- [ ] ❓ Guies intel·ligents (Smart Guides) en moure una capa; el lab no les replica
- [ ] Shift mentre s'arrossega limita el moviment a horitzontal, vertical o 45°
- [ ] ❓ Diversos arrossegaments seguits són passos de desfer separats

### Panell Layers: aspecte

- [ ] Pestanyes del grup: Layers, Channels, Paths
- [ ] ❓ Fila de filtre a dalt, amb el desplegable Kind
- [ ] Fila amb el desplegable del mode de fusió (Normal) i Opacity
- [ ] Fila Lock (píxels transparents, píxels de la imatge, posició, niuament en taules de treball, tot) i Fill
- [ ] Botons de baix, d'esquerra a dreta: Link layers, Add a layer style, Add layer mask, Create new fill or adjustment layer, Create a new group, Create a new layer, Delete layer
- [ ] ❓ Textos exactes dels tooltips d'aquests botons i de l'ull ("Indicates layer visibility")
- [ ] Cada fila: ull, miniatura i nom; la capa seleccionada es veu ressaltada
- [ ] ❓ Color del ressaltat de la capa seleccionada i mida per defecte de les miniatures
- [ ] La capa de fons es diu `Background`, amb el nom en cursiva i un cadenat a la dreta

### Panell Layers: comportament

- [ ] Clic a l'ull: amaga o mostra la capa (sense canviar la selecció)
- [ ] ❓ Arrossegar per la columna dels ulls amaga o mostra diverses capes; el lab no ho replica
- [ ] Alt + clic a l'ull: mostra només aquella capa; el lab no ho replica, només ho explica
- [ ] ❓ Amagar o mostrar una capa és un pas de desfer (`Ctrl+Z` el desfà)
- [ ] Clic a la fila: selecciona la capa; Ctrl + clic al nom n'afegeix o en treu; Shift + clic selecciona el rang
- [ ] ❓ Ctrl + clic a la miniatura carrega la transparència com a selecció (no afegeix la capa); el lab ho ignora
- [ ] Arrossegar una fila en canvia l'ordre; una línia indica on caurà
- [ ] Doble clic al nom: l'edita; Retorn confirma; Esc cancel·la
- [ ] ❓ Tab, mentre s'edita un nom, passa a editar el de la capa següent
- [ ] ❓ Doble clic fora del nom obre Layer Style; el lab no fa res
- [ ] Opacity accepta de 0 a 100 %; es pot escriure o arrossegar sobre l'etiqueta
- [ ] ❓ En arrossegar l'opacitat, el canvi és un sol pas de desfer
- [ ] Amb l'eina Move, les xifres canvien l'opacitat: `5` = 50 %, `0` = 100 %, dues xifres seguides = valor exacte (`2` `5` = 25 %)
- [ ] ❓ `0` `0` posa l'opacitat a 0 %
- [ ] ❓ Temps màxim entre les dues xifres perquè comptin com un sol valor

### Capa de fons

- [ ] No es pot moure amb l'eina Move
- [ ] ❓ Text exacte de l'avís en intentar-ho ("Could not use the move tool because the layer is locked.")
- [ ] No es pot canviar d'ordre ni se n'hi pot posar cap a sota
- [ ] Opacity, Fill i el mode de fusió queden desactivats quan està seleccionada
- [ ] Clic al cadenat: es converteix en una capa normal anomenada `Layer 0`

### Ordres de capa

- [ ] `Ctrl+J`: Layer > New > Layer Via Copy; la còpia queda just a sobre i seleccionada
- [ ] ❓ Nom de la còpia: `Lluna copy` (i la segona, `Lluna copy 2`)
- [ ] `Ctrl+]` / `Ctrl+[`: Layer > Arrange > Bring Forward / Send Backward
- [ ] `Ctrl+Shift+]` / `Ctrl+Shift+[`: Bring to Front / Send to Back (sempre per sobre de `Background`)
- [ ] ❓ En un teclat espanyol o català, on `[` i `]` es fan amb AltGr, com es premen aquestes dreceres (i si Photoshop les canvia)
- [ ] Botó Create a new layer: crea `Layer N` just a sobre de la capa seleccionada, sense diàleg
- [ ] ❓ Numeració de les capes noves: el primer número lliure o un comptador que no torna enrere
- [ ] `Ctrl+Shift+N`: Layer > New > Layer..., amb diàleg (el navegador es reserva la drecera: al lab només s'explica)
- [ ] `Delete`: esborra les capes seleccionades sense confirmació
- [ ] ❓ Botó Delete layer: demana confirmació ("Delete the layer "nom"?") amb Yes / No
- [ ] ❓ No es pot esborrar l'última capa del document
- [ ] `F7` mostra o amaga el panell Layers (al lab només s'explica)

### Desfer

- [ ] `Ctrl+Z` desfà un pas cada vegada; `Shift+Ctrl+Z` refà
- [ ] ❓ `Ctrl+Alt+Z` alterna l'últim estat; el lab no ho replica
- [ ] ❓ Seleccionar una capa no és un pas de desfer

## Diferències conegudes amb el programa

- El navegador es reserva `Ctrl+N`, `Ctrl+T`, `Ctrl+W`, `Ctrl+Shift+N`, `Ctrl+Shift+T` i
  `Ctrl+Shift+W`: al lab aquestes ordres es fan pel menú o pel botó.
- Les icones són dibuixos propis, no les d'Adobe.
- El llenç no té zoom ni desplaçament al Lab 01: el document es veu sencer.
- El rètol de `Títol` és una capa de píxels, no una capa de text.
