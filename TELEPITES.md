# Dandó V3.2 – vezetői felület + havi beosztás

1. GitHub → `KancsalBrine/dando-app` → `main`: töltsd fel a csomagban található **index.html, vezeto.html, vezeto.js, vezeto.css, beosztas.js, manifest.webmanifest, sw.js** fájlokat, a meglévőket szükség szerint felülírva.
2. Supabase → SQL Editor: futtasd a **supabase-beosztas.sql** teljes tartalmát. A korábbi `supabase-vezeto.sql` táblái megmaradnak.
3. Nyisd meg a https://kancsalbrine.github.io/dando-app/ címet. A kezdőlap automatikusan a vezetői felületre irányít.
4. Jelentkezz be; a **Beosztás** menüben szerkeszd a hónapot. A 12 dolgozó neve előre be van írva, Balázs Roland nincs a listán.
5. Ellenőrzés: írj egy próba jelölést, várd meg a **Sikeresen mentve a felhőbe** üzenetet, frissítsd az oldalt, és ellenőrizd a megmaradt adatot.

**Fontos:** a régi `app.js` és `dando_data` nem törlődik; csak a kezdőlap kerül átirányításra. Az új `manager_rosters` tábla felhasználónként és hónaponként tárolja a beosztást, RLS védelemmel. Másik eszközön történt párhuzamos változtatáskor az oldal hibát jelez, nem írja felül észrevétlenül az újabb beosztást. A régi, külön `beosztas.html` már nem szükséges. A beosztás tartalmaz dolgozói neveket: munkahelyi adatvédelmi szabályok szerint kezeld.
