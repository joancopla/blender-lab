# Lab 05 — Llum

L'alumne aprèn a il·luminar una escena: tipus de llum, intensitat, mida de la font i
ombres, color i esquemes clàssics d'il·luminació. És el lab que connecta més directament
amb el que fan a plató i fotografia.

Llegeix `CLAUDE.md` i `specs/blender/README.md` abans de res.

**Depèn de:** Lab 01. Segons l'ordre de construcció, aquest lab construeix el
**Properties Editor** i el **mòdul de render**.

---

## 1. Properties Editor (component compartit)

Component nou a `src/apps/blender/ui/properties/`, amb totes les pestanyes de Blender en
l'ordre correcte. Cada lab n'activa només les que necessita. En aquest lab: Object, Object
Data de la llum i World. `// FIDELITY?` amb l'ordre de les pestanyes a Blender 5.2.

## 2. Mòdul de render (component compartit)

Component nou a `src/apps/blender/render/`:

- **Modes de shading del viewport:** Wireframe, Solid, Material Preview i Rendered, amb
  els botons de la capçalera i el pie menu de Z.
- **Rendered** fa servir les llums i el World de l'escena. **Material Preview** fa servir
  un HDRI d'estudi i ignora les llums de l'escena per defecte, com a Blender.
- **Unitats físiques:** llums amb unitats físiques de three.js. La conversió de la potència
  de Blender (W) a les unitats de three.js es calibra una vegada amb una escena de
  referència i es desa en un sol lloc. `// FIDELITY?`
- **Gestió del color:** View Transform AgX per defecte, com a Blender des de la 4.0, amb
  el tone mapping AgX de three.js. `// FIDELITY?` amb les diferències entre
  implementacions.
- Pensat per a ordinadors d'aula: ombres amb mapes de mida moderada i qualitat
  configurable.

## 3. Interfície replicada

- **Shift+A > Light:** Point, Sun, Spot, Area.
- **Pestanya de la llum (Object Data):** tipus, Color, Power (Strength al Sun), Radius
  (Angle al Sun), Spot Size i Blend a l'Spot, Shape i Size a l'Area, i Cast Shadow.
  `// FIDELITY?` amb l'opció de temperatura de color a la sèrie 5.x.
- **Gizmos al viewport:** direcció del Sun, con de l'Spot i forma de l'Area, com a
  Blender.
- **Pestanya World:** color de fons i Strength.

## 4. Aproximacions tècniques

| Blender | three.js | Limitacions a documentar |
|---|---|---|
| Point | PointLight | Radius s'aproxima amb ombres suaus. |
| Sun | DirectionalLight | Angle s'aproxima amb el suavitzat de l'ombra. |
| Spot | SpotLight | Spot Size és l'angle total; Blend es tradueix a penombra. |
| Area | RectAreaLight | Les RectAreaLight de three.js no projecten ombres. Cal una solució (per exemple, una llum auxiliar només per a l'ombra) i documentar-la. |

Les imatges de referència de les etapes es generen amb aquest mateix renderer a partir
d'una escena solució (vegeu el README).

## 5. Element del lab: mesurador de llum

Un element de l'embolcall, no de Blender: l'alumne pot col·locar un punt de mesura sobre
una superfície i veure'n la il·luminació relativa, com un fotòmetre. Serveix per
explicar la llei de l'invers del quadrat i les proporcions entre llums.

## 6. Etapes

1. **Encendre.** Afegir una llum i passar a Rendered. La consigna explica la diferència
   amb Solid i Material Preview.
2. **Quatre tipus.** Provar Point, Sun, Spot i Area a la mateixa escena i identificar-los
   per l'ombra que fan.
3. **Distància i intensitat.** Doblar la distància de la llum i comprovar amb el mesurador
   que la llum que arriba és una quarta part. Després compensar-ho amb Power.
4. **Dura o tova.** Aconseguir una ombra dura i una de tova canviant Radius o Size.
5. **Color.** Crear un contrast de llum càlida i llum freda.
6. **Spot.** Il·luminar només un objecte amb un Spot ajustant Size i Blend.
7. **Hora del dia.** Orientar el Sun perquè les ombres tinguin la direcció i la longitud
   de la referència.
8. **Tres punts.** Muntar key, fill i rim respecte de la càmera, amb una proporció key/fill
   dins d'un rang. Es comprova amb posicions relatives i amb el mesurador.
9. **Món.** Ajustar el World perquè l'ambient sigui el de la referència.
10. **Repte final.** Il·luminar el tamboret fins a aproximar-se a un render de referència.

En acabar, **mode lliure**.

## 7. Pàgina del lab

Com als anteriors. El bloc "Al Blender real" ha de parlar de les unitats de llum, de
les diferències entre EEVEE i Cycles en ombres i rebots, i de l'ús d'HDRI al World.

## 8. Fases

1. **Properties Editor.** Component compartit amb totes les pestanyes.
2. **Mòdul de render.** Modes de shading, AgX, calibratge de potència, ombres.
3. **Llums.** Els quatre tipus, paràmetres, gizmos i solució per a l'ombra de l'Area.
4. **World i mesurador de llum.**
5. **Etapes i web.**
6. **Poliment.** Rendiment en ordinadors modestos i fidelitat documentada.
