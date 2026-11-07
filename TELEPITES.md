# Dandó – vezetőhelyettesi modul v3.1

Ez a csomag **hozzáad** egy új vezetői felületet a meglévő Dandóhoz. A régi `index.html`, `app.js`, `styles.css`, `sw.js` és `dando_data` változatlan marad.

## Telepítés

1. A GitHub `KancsalBrine/dando-app` repó **main** ágának gyökerébe töltsd fel a csomagból a `vezeto.html`, `vezeto.js`, `vezeto.css` fájlokat. A `supabase-vezeto.sql` és ez a leírás is feltölthető, de a működéshez csak az első három kell.
2. Supabase Dashboard → SQL Editor → New query: illeszd be a `supabase-vezeto.sql` **teljes** tartalmát, majd futtasd.
3. Ellenőrizd, hogy a meglévő `supabase-config.js` továbbra is be van állítva, és a Supabase Auth-fiókod használható.
4. A GitHub Pages telepítés után nyisd meg: https://kancsalbrine.github.io/dando-app/vezeto.html
5. Jelentkezz be a meglévő Dandó-fiókoddal, a **Beállítások** menüben add meg a két műszak nevét és időpontját, majd az **Ellenőrzőlisták** menüben töltsd be a mintalistát.
6. Ellenőrizd a működést számítógépen és telefonon is. A mobilos alsó menü **vízszintesen görgethető**, így minden modul elérhető.

## Tartalom

- Vezetői áttekintés és fontos események
- Műszaknapló, prioritás és státusz
- Napi/heti ellenőrzőlisták
- Kézi termék- és készletkezelés, atomikus készletmozgás-napló
- Rendelések és beérkezési státusz
- Dolgozói lista
- Szabadon megadható két műszak
- Supabase felhőszinkron, tulajdonosi RLS, JSON-export

## Fontos korlátok

- Ez az első működő modulcsomag, **nem** teljes műszakbeosztás- vagy pénzügyi rendszer.
- A vezetői felület jelenleg **online adatbevitelt igényel**. Ha a hálózat megszakad, a mentés hibát jelez; nem ígér offline mentést.
- A rendelés „Beérkezett” állapota **nem növeli automatikusan** a készletet. A tényleges átvett mennyiséget külön, a Készlet menüben kell rögzíteni.
- A vezetői JSON-export csak a vezetői modul adatait tartalmazza. A régi Dandó feladatainak/jegyzeteinek exportja továbbra is a régi felületen van.
- A vezetői modul külön `vezeto.html` címen működik; az alap `index.html` kezdőlapját nem cseréli le.
- A `supabase-config.js` **publishable** kulcsot használjon, ne `service_role` titkot.
- A munkáltatói szabályoknak megfelelően csak engedélyezett munkahelyi adatokat rögzíts.

## Visszaállítás

A régi Dandó továbbra is a https://kancsalbrine.github.io/dando-app/ címen működik. Ha nem szeretnéd használni a vezetői modult, a három `vezeto.*` fájl eltávolítható; a régi adatok érintetlenek maradnak. Az SQL által létrehozott táblákat ne töröld, ha már adatot rögzítettél bennük.
