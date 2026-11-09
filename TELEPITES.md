# Dandó V4.9 – helyes műszak-hozzárendelés

A helyes jelölések: `e` = éjszakás (18:00–06:00), `n` = nappalos (06:00–18:00), `8` = csak nappalos.
A főoldal a beállított kezdési idő alapján azonosítja a nappalos és éjszakás műszakot, ezért akkor is helyes, ha a két műszak sorrendje a Beállításokban fel van cserélve. A beosztás jelmagyarázata is javítva.

Telepítés: a ZIP tartalmát a GitHub main ág gyökerébe töltsd fel és írd felül a meglévő fájlokat. A `supabase-config.js`-t ne cseréld, nincs a csomagban. SQL-módosítás nem kell.

Megnyitás: https://kancsalbrine.github.io/dando-app/vezeto.html?v=49

Ha az előző műszak kezdete 18:00, a hozzá tartozó kód `e`; ha 06:00, `n`. A `8` kód soha nem jelenik meg az éjszakás listában. A tényleges jelenlétet a program nem ellenőrzi, csak a beosztást.
