# Dandó V3.5 – beosztás import és élő műszak

1. A ZIP összes fájlját töltsd fel a GitHub `KancsalBrine/dando-app` repó `main` ágába, a meglévőket felülírva. A Supabase adatbázist ne töröld.
2. Várd meg a GitHub Pages telepítést, majd nyisd meg a `https://kancsalbrine.github.io/dando-app/vezeto.html?v=35` címet.
3. A **Beosztás** menüben válassz hónapot, majd az **Importálás (Excel/CSV)** mezőben `.xlsx`, `.xls` vagy `.csv` fájlt.
4. A fájl első munkalapján legyen napokat (1–31) tartalmazó fejlécsor és az ismert dolgozók nevei. Az import a képen látható beosztás formátumát és a Dandó CSV-exportját is kezeli.
5. Az import előnézetet/összegzést mutat; jóváhagyás után a felismert dolgozók kiválasztott havi beosztását írja felül a Supabase-ben. A fel nem ismert dolgozók korábbi adatai megmaradnak.
6. A főoldal **Ki dolgozik most?** kártyája a beállított műszakidő, Budapest időzóna és a Supabase-be mentett beosztás alapján mutatja a dolgozókat. A `8` jelölés mindkét műszaknál látható, mert nem tartalmaz pontos kezdési időt.
7. Másik eszközön a **Frissítés** gomb tölti be az új beosztást.

**Megjegyzés:** Az Excel-fájl olvasásához a böngésző importáláskor letölti a SheetJS könyvtárat a `cdn.sheetjs.com` címről. Internet nélkül CSV-importot használj. Az import nem képfelismerés; a fényképet előbb Excel/CSV táblázattá kell alakítani. A kód nem módosítja a régi `dando_data` táblát.
