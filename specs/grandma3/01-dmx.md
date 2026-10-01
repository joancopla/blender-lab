# Lab 01 (grandMA3) — Què és el DMX

Id `ma3-01-dmx` (no es pot canviar: és la clau del progrés). Pàgina `labs/ma3-01-dmx/`.

## Objectiu

Entendre què viatja pel cable abans de tocar l'onPC: 512 canals per univers, valors de 0 a
255, adreça i footprint de cada aparell, solapaments, el límit de l'univers i el segon univers.

## El simulador

- Escenari en alçat amb una vara i els aparells. Cada aparell té una pantalleta amb la seva
  adreça i el número a sota. Clic: el selecciona i la sortida salta als seus canals.
- Quadre de l'aparell: tipus, Universe, Address (`1.005`), Absolute, Channels i la llista de
  canals amb la funció i el valor. Avisos si no hi cap o si comparteix canals.
- Patch (només a les etapes que ho permeten): − / + o escriure l'adreça.
- DMX Output: pestanyes d'univers, 16 faders per pàgina (‹ › o "Ch" per saltar), casella amb
  el valor exacte. Arrossegar és una vista prèvia; en deixar anar, es desa (un pas de desfer).
- Ctrl + Z / Ctrl + Shift + Z / Ctrl + Y.
- Aparells genèrics: Dimmer (1 canal) i LED PAR en mode de 4 canals (Dimmer, Red, Green, Blue).

## Etapes

| # | Id | Títol | Es supera quan… |
|---|---|---|---|
| 1 | `channel` | Un canal, un valor | canal 1 = 255 |
| 2 | `address` | Cada focus té una adreça | el focus 3 (adreça 10) a ple i els altres apagats |
| 3 | `footprint` | Un focus, quatre canals | dimmer ≥ 128, vermell ≥ 128, verd i blau a 0 |
| 4 | `next-address` | On comença el següent | el PAR 2 a l'adreça 5 |
| 5 | `fit` | No hi cap | el PAR (4 canals) a l'adreça 509 |
| 6 | `universe` | Un segon univers | univers 2 canal 1 = 255 i univers 1 canal 1 = 0 |

Mode lliure: dos univers, dos dimmers, dos LED PAR i un dimmer a l'univers 2, amb patch.

## A validar per Joan

- Els textos de "Al grandMA3 onPC" (DMX-key, Patch, AddressMode, DMX Sheet).
- Si el nivell i l'ordre de les etapes encaixen amb el curs.
