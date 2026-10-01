# Labs de grandMA3 onPC — control de llums per DMX

Segon programa de la col·lecció (decisió de Joan, 01/10/2026). Mateix nucli, mateix disseny
(`docs/DESIGN.md`) i mateix progrés que els labs de Blender.

## Per a qui i per a què

- Joan (aprèn des de zero) i els alumnes d'un curs que va començar l'01/10/2026.
- Nivells: **Iniciació → Mitjà → Pro**.
- El lab no substitueix el programa: grandMA3 onPC és gratuït i porta visualitzador 3D. El lab
  fa practicar el que s'ha d'entendre i automatitzar (DMX, ordres, conceptes, flux de treball).

## L'equip de classe (fotos a `C:\ma3-lab\referencia\`, fora del repositori)

```
Ordinador amb grandMA3 onPC ──USB── grandMA3 onPC DMX-key (4.096 paràmetres) ──DMX── llums
        └── (per confirmar) ── controlador COLORNIE "DMX Controller"
```

El COLORNIE no és de MA. Té 4 encoders, 6 faders amb 6 botons, Master, XFade, Go−, Pause, Go+
i un teclat numèric amb `+ Thru − At If . Please Clear Store`. No té tecles Fixture, Group, Cue
ni Preset (Fixture és la paraula clau per defecte de grandMA3).

## Ordre dels labs

| Lab | Nivell | Títol | Estat |
|---|---|---|---|
| 01 | Iniciació | Què és el DMX | Fet (`01-dmx.md`) |
| 02 | Iniciació | Adreces i valors (càlculs) | Pendent |
| 03 | Iniciació | Línia d'ordres amb el teclat del controlador | Pendent (esboç a `C:\ma3-lab\propostes\`) |
| 04 | Iniciació | L'onPC per dins: programmer, grups, presets, cues, executors | Pendent |
| 05–08 | Mitjà | Escenari amb color i moviment, patch, grups i presets, cues i tracking | Pendent |
| 09–12 | Pro | 16 bits, temps, sintaxi completa i abreujada, repte final | Pendent |

## El repte final

Un **plànol de llums en alçat** (`src/labs/grandma3/blueprint.ts`): una vara, el terra i els
aparells amb el feix. Cada etapa superada dibuixa un aparell. Com que només té vista frontal,
el plànol en miniatura del panell en mostra una sola.

## Arquitectura

- `src/apps/grandma3/`: el simulador DMX (`dmx/`: universos, adreces, aparells; `state.ts`:
  estat i operadors sobre `core/history`; `rig-app.ts`: el contracte del nucli i la UI).
  La UI del simulador és en anglès, amb les paraules que fa servir l'onPC (Universe, Address,
  Fixture); les consignes són en català.
- `src/labs/grandma3/NN-nom/`: etapes, textos i il·lustració de cada lab. Els ids de lab porten
  el prefix `ma3-` perquè no coincideixin amb els de Blender (són la clau del progrés).
- **Visualitzador 3D (idea de Joan, per als labs de nivell mitjà):** aprofitar el render amb
  three.js i la física de llums de `apps/blender/render/` per a un escenari 3D amb feixos,
  color i moviment. El Lab 01 fa servir un escenari 2D en SVG, que és lleuger i n'hi ha prou
  per a canals i adreces. Quan toqui, el que es comparteixi entre programes s'ha de moure a un
  lloc comú (no importar `apps/blender` des de `apps/grandma3`); cal decidir-ho abans.

## Regla de fidelitat

Cap ordre ni nom de finestra de grandMA3 entra als labs sense haver-lo verificat al manual
oficial (https://help.malighting.com/grandMA3/), indicant la pàgina. El que no es pugui
verificar va a `docs/fidelity/grandma3.md` com a pregunta oberta.

### Ordres verificades fins ara (per al Lab 03)

| Ordre | Què fa | Font |
|---|---|---|
| `1 Please` | Selecciona l'aparell 1 (Fixture per defecte) | QSG Control Simple Fixtures |
| `+ 2 Please` | Afegeix el 2 a la selecció | QSG |
| `1 Thru 10 Please` | Rang | QSG |
| `At 50 Please` | Dimmer de la selecció al 50 % | QSG |
| `Full` | Dimmer al 100 % | QSG |
| `At At` | Valor Normal (100 % per defecte) | QSG |
| `Clear` curt / llarg | Treu la selecció / buida el programmer | QSG |
| `Store Cue 2 Time 3 Please` | Desa la cue 2 amb 3 s de fade | QSG Sequence with Multiple Cues |
| `Store Sequence 8 Cue 20 /Overwrite` = `S Seq 8 Cue 20 /O` | Completa i abreujada | Syntax Rules |
| Adreça `2.1` | Univers 2, adreça 1 (absoluta 513) | DMXAddress Keyword |
