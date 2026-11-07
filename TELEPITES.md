# Dandó V4 – vezetői főoldal

A V3.6 meglévő vezetői felületére épül, és **nem változtat az adatbázis sémáján**.

1. GitHub: `KancsalBrine/dando-app`, `main` ág. A csomag tartalmát a repó gyökerébe töltsd fel, a meglévő fájlokat felülírva.
2. **A `supabase-config.js` fájlt ne töröld és ne cseréld le!** A ZIP nem tartalmazza.
3. Nem kell Supabase SQL-t futtatni.
4. Nyisd meg: https://kancsalbrine.github.io/dando-app/vezeto.html?v=40
5. Mobilon a telepített PWA-t zárd be és indítsd újra. Ha régi verzió látszik, előbb ellenőrizd, hogy az adatok szinkronizálódtak, majd szükség esetén telepítsd újra.

## Újdonságok
- Frissített, mobilra is optimalizált főoldal.
- Aktuális és következő műszak dolgozói, a beállított műszakidők és a havi beosztás alapján.
- Nyitott és sürgős naplóesemények, hiányzó ellenőrzések, készlethiányok, folyamatban lévő rendelések.
- Kattintható statisztikák és gyorsműveletek.

## Korlátok
- A következő műszak dolgozóinak listája csak akkor jelenik meg, ha annak hónapja már be van töltve. Hónapváltáskor a Beosztás menüben ellenőrizd a megfelelő hónapot.
- Az „8” jelölés mindkét műszakban megjelenik, mivel nem tartalmaz kezdési időt.
- Az aktuális idő megjelenítése az oldal újratöltésekor frissül, nem folyamatos élő követés.
- A kódot statikusan ellenőriztük; a tényleges Supabase- és mobilböngészős működést telepítés után kell kipróbálni.
