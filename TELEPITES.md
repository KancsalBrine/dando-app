# Dandó V5.0 – Mobilbeosztás és szerkesztési zárolás
A csomag a V4.9 összes fájljára épül. A GitHub `main` ág gyökerébe töltsd fel az összes fájlt, a meglévőket felülírva. Új fájl: `roster-lock-v50.css`.
**Ne módosítsd a `supabase-config.js` fájlt.** Nem kell SQL-migráció.
Megnyitás: https://kancsalbrine.github.io/dando-app/vezeto.html?v=50

A beosztás minden megnyitáskor **megtekintési módban** indul. A cellák érintése ilyenkor nem ment. A szerkesztéshez külön `Szerkesztés bekapcsolása` gomb szükséges. Az import, a jelölésválasztó és a hónap törlése szerkesztés nélkül tiltott. CSV-export és nyomtatás zárolt módban is elérhető.
Szerkesztéskor a cellára koppintva a kiválasztott jelölés felhőbe mentődik. A szerkesztő módot a `Szerkesztés befejezése` gombbal zárhatod le. Navigáláskor a szerkesztési állapot elvész, a következő megnyitás zárolt.
A mobilos beosztás vízszintesen görgethető, a dolgozónevek és napfejléc rögzítve maradnak.
