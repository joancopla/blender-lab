# Lab 03 (grandMA3) — Línia d'ordres

Id `ma3-03-command-line` (no es pot canviar: és la clau del progrés). Pàgina `labs/ma3-03-command-line/`.

## Objectiu

Seleccionar aparells i donar-los intensitat amb el teclat del controlador de classe, amb
la sintaxi verificada al manual (taula a `README.md`).

## El simulador en mode consola (`RigSetup.console`)

- Vuit focus Dimmer a les adreces 1–8. A l'escenari, els seleccionats van en ambre i el valor
  del programmer surt sota el número.
- Línia d'ordres amb el prompt `[Fixture]>`. Sota, el resultat o l'error (en català).
- Controlador dibuixat com el de classe: encoders, Master, XFade, sis faders amb botons,
  Go− / Pause / Go+ i el teclat. Només el teclat construeix ordres; les altres tecles diuen
  que es faran servir en un altre lab.
- Teclat de l'ordinador: números, punt, + i −, Retorn (Please) i Retrocés.
- Clear: curt treu la selecció, llarg (600 ms) buida el programmer.
- Cada ordre executada és un pas de desfer (Ctrl + Z).

## Etapes

| # | Id | Títol | Ordre esperada |
|---|---|---|---|
| 1 | `select` | Selecciona un aparell | `1 Please` |
| 2 | `add` | Afegeix-ne un | `+ 2 Please` |
| 3 | `range` | Un rang | `1 Thru 4 Please` |
| 4 | `at` | Dona'ls valor | `1 Thru 5 At 60 Please` |
| 5 | `except` | Tots menys dos | `1 Thru 8 − 4 Thru 5 At 30 Please` |
| 6 | `normal` | Al valor normal | `At At Please` |
| 7 | `clear-selection` | Treu la selecció | `Clear` curt |
| 8 | `clear-all` | Buida el programmer | `Clear` llarg |

Les comprovacions miren el resultat (selecció i programmer), no les tecles: qualsevol camí
vàlid supera l'etapa.

## A validar per Joan

- Textos i nivell; fidelitat a `docs/fidelity/grandma3.md`, secció Lab 03.
