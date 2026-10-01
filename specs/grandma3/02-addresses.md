# Lab 02 (grandMA3) — Adreces i valors

Id `ma3-02-addresses` (no es pot canviar: és la clau del progrés). Pàgina `labs/ma3-02-addresses/`.

## Objectiu

Fer fins que surtin sols els càlculs del patch i de la sortida: percentatge ↔ valor DMX,
adreça següent (adreça + footprint), footprints diferents, adreça absoluta ↔ univers.adreça i
el salt a l'univers següent.

## Novetats del simulador

- Aparell genèric **Moving head · 16 ch** (Pan, Pan fine, Tilt, Tilt fine, Speed, Dimmer,
  Shutter, Red, Green, Blue, White, Zoom, Focus, Gobo, Prism, Control). L'ordre és inventat
  per al lab.
- Patch amb univers i adreça (`setPatch`). En canviar d'univers, la sortida DMX hi salta.

## Etapes

| # | Id | Títol | Es supera quan… |
|---|---|---|---|
| 1 | `percent` | Del percentatge al valor | canals 1, 2, 3 = 255, 153, 51 (100, 60 i 20 %) |
| 2 | `colour` | Un color en percentatges | PAR: 255, 255, 0, 102 (blau al 40 %) |
| 3 | `row` | En fila, sense forats | quatre PAR LED a 1, 5, 9 i 13 |
| 4 | `mixed` | Footprints diferents | dimmer 1, cap mòbil 2, PAR LED 18 |
| 5 | `absolute` | Adreça absoluta | cap mòbil a 2.88 (absoluta 600) |
| 6 | `overflow` | Quan l'univers s'omple | cinc caps a 1.449, 1.465, 1.481, 1.497 i 2.1 |

Els comprovadors de patch diuen quin és el primer aparell que no és al lloc i el marquen a
l'escenari.

## A validar per Joan

- Textos i nivell de les etapes.
- Fidelitat: `docs/fidelity/grandma3.md`, secció Lab 02.
