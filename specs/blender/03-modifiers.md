# Lab 03 — Modificadors

L'alumne aprèn el treball no destructiu: la malla base es manté senzilla i els modificadors
en generen el resultat final. En acabar, ha de saber quan fer servir cada modificador
bàsic, per què importa l'ordre de la pila i quan convé aplicar-los.

Llegeix `CLAUDE.md` i `specs/blender/README.md` abans de res.

**Depèn de:** Lab 01 (motor), Lab 02 (malles editables i Mode Edició), Properties Editor.

---

## 1. Interfície replicada

- **Properties Editor** amb la pestanya Modifiers (icona de clau anglesa) activa. La resta
  de pestanyes visibles però inactives, llevat de les que ja existeixin d'altres labs.
- **Add Modifier:** menú amb les categories de Blender 5.2 i cerca. Només s'hi poden afegir
  els modificadors d'aquest lab; la resta surten desactivats. `// FIDELITY?` amb les
  categories i l'ordre exacte.
- **Capçalera de cada modificador:** desplegar/plegar, icona, nom editable, botons de
  visibilitat (Edit Mode, Realtime, Render), menú desplegable (Apply, Duplicate, Move to
  First, Move to Last) i botó per esborrar. Es poden reordenar arrossegant.
  `// FIDELITY?` amb la drecera d'Apply sobre el panell.
- En Mode Edició, amb el modificador visible, es veu el resultat i la gàbia de la malla
  base, com a Blender.
- Object > Shade Smooth, Shade Flat i Shade Auto Smooth, també al menú del botó dret.
  Resolt per Joan (28/09/2026): Auto Smooth no és un modificador ni va a la pila; és la
  casella Auto Smooth de la pestanya Object Data > Normals, a 30°.

## 2. Modificadors dins d'abast

| Modificador | Paràmetres |
|---|---|
| Subdivision Surface | Catmull-Clark / Simple, Levels Viewport, Render. Ctrl+1…5 en Object Mode per fixar nivells (implementat, però al navegador Ctrl+1…8 canvien de pestanya: el lab ho explica i fa servir Add Modifier). |
| Mirror | Axis X/Y/Z, Bisect, Flip, Mirror Object, Clipping, Merge amb distància. |
| Array | Fit Type Fixed Count, Count, Relative Offset, Constant Offset, Merge. |
| Bevel | Amount, Segments, Limit Method (None, Angle). `// FIDELITY?` amb el valor per defecte. |
| Solidify | Thickness, Offset, Even Thickness. |

- La pila s'avalua en ordre i genera una **malla avaluada** separada de la malla base.
  Només la malla avaluada es dibuixa; la malla base és la que s'edita.
- El càlcul es fa en diferit i en memòria cau: només es recalcula quan canvia la malla base
  o un paràmetre.
- Límit de rendiment: Levels Viewport màxim 3 en aquest lab, amb un avís del lab si
  l'alumne ho intenta superar.
- **Subdivision Surface:** Blender fa servir OpenSubdiv. Cal reproduir el resultat de
  Catmull-Clark amb el tractament de vores per defecte. Es valida amb fixtures OBJ
  exportades de Blender (vegeu el README).
- **Apply** converteix la malla avaluada en la nova malla base i elimina el modificador.
  Si no és el primer de la pila, fa el que faci Blender 5.2 (avís o aplicació).
  `// FIDELITY?`

## 3. Fora d'abast

Creases, pesos de bevel, modificadors de deformació, Boolean, Geometry Nodes i Shrinkwrap.

## 4. Etapes

1. **Suavitzar.** Afegir Subdivision Surface a un cub amb Add Modifier i canviar els
   nivells. La consigna explica per què el cub es converteix en una mena d'esfera, i que a
   Blender també es fa amb Ctrl+2 (al navegador no, perquè canvia de pestanya).
2. **Loops de suport.** Aconseguir que el cub subdividit mantingui les arestes marcades
   afegint loop cuts a prop de les vores. Es comprova per siluetes.
3. **Mirror.** Modelar només mitja peça i completar-la amb Mirror i Clipping. Es comprova
   que el resultat és simètric i que la costura està unida.
4. **Array.** Fer una escala amb Array i Relative Offset en dos eixos. Es comprova el
   nombre d'esglaons i l'alçada.
5. **Bevel no destructiu.** Arrodonir les arestes d'una peça amb el modificador Bevel i
   Limit Method Angle. La consigna el compara amb el bevel del Lab 02.
6. **L'ordre importa.** Una pila en ordre incorrecte (Subdivision abans de Mirror) dona un
   resultat equivocat. L'alumne l'ha de reordenar fins que coincideixi amb la referència.
7. **Gruix.** Donar gruix a un pla amb Solidify per fer una làmina (per exemple, el seient
   del tamboret).
8. **Suau o pla.** Shade Smooth, Shade Flat i Auto Smooth sobre la mateixa peça.
9. **Aplicar.** Aplicar el Mirror mantenint Subdivision. La consigna explica quan cal
   aplicar i quan no.
10. **Repte final.** Refer el tamboret del Lab 02 amb una malla base mínima i
    modificadors (Mirror, Subdivision, Bevel). Es comprova per siluetes contra la
    referència i amb un límit de cares de la malla base, per premiar la
    feina eficient.

En acabar, **mode lliure** amb tots els modificadors del lab.

## 5. Pàgina del lab

Com als anteriors, amb el bloc "Al Blender real", que ha d'explicar a més quins
modificadors importants queden fora del lab.

## 6. Fases

1. **Pila de modificadors.** Model de dades, avaluació en ordre, memòria cau, Mirror i Array
   amb tests.
2. **Subdivision i Bevel.** Algorismes i validació amb fixtures de Blender.
3. **Solidify i Shade Smooth/Flat/Auto Smooth.**
4. **Interfície.** Pestanya Modifiers, Add Modifier, capçaleres, reordenació, Apply i
   visualització en Mode Edició.
5. **Etapes i web.**
6. **Poliment.** Rendiment en ordinadors modestos i `docs/fidelity/blender.md` actualitzat.
