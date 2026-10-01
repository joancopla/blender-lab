# Fidelitat a grandMA3 onPC

Llista del que els labs diuen de grandMA3. Font: https://help.malighting.com/grandMA3/ (cal
fixar la versió que es fa servir a classe). Marca cada casella quan ho hagis comprovat amb
l'onPC obert al costat. Els elements marcats amb ❓ són dubtes oberts.

## Versió

- [ ] ❓ Versió de grandMA3 onPC de l'aula (surt a la pantalla d'inici)

## Lab 01 — Què és el DMX

El simulador DMX és una eina genèrica del lab, no una còpia d'una finestra de grandMA3.

- [ ] Una adreça s'escriu `univers.adreça`, per exemple `2.1` (manual: DMXAddress Keyword)
- [ ] A l'edició del patch, AddressMode alterna entre Univ.addr i Absolute (manual: DMX Sheet / Edit Patch)
- [ ] ❓ La finestra DMX Sheet mostra el valor de cada canal (nom i funció per confirmar a l'onPC)
- [ ] Sense DMX-key (o un altre maquinari de MA), l'onPC no envia DMX
- [ ] ❓ Format de l'adreça al quadre de l'aparell (`1.005`): l'onPC el mostra igual?

## Lab 02 — Adreces i valors

- [ ] `At 50` posa el dimmer al 50 % (manual: QSG Control Simple Fixtures)
- [ ] ❓ Escala de percentatge a DMX: el lab fa servir valor = % × 255 ÷ 100 arrodonit (60 % = 153). Comprovar amb la DMX Sheet de l'onPC
- [ ] ❓ El cap mòbil de 16 canals és genèric (ordre de canals inventat per al lab); els reals segueixen el seu manual i la llibreria de l'onPC

## Lab 03 — Línia d'ordres (pendent)

- [ ] ❓ Ordre exacte dels passos de `Clear` quan hi ha text a la línia d'ordres
- [ ] ❓ Què fa la tecla `If`
- [ ] ❓ Numeració completa de les pools de presets (1 Dimmer … 9)
