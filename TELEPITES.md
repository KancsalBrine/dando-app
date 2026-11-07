# Dandó V3.4 – tiszta telepítés

A csomagban minden, a vezetői felület futtatásához szükséges alkalmazásfájl szerepel.

1. GitHubon a main ág gyökerében cseréld le a fájlokat a csomag azonos nevű fájljaival. Az új fájlok mellett a régi app.js és styles.css törölhető, de nem kötelező. **Ne töröld a GitHub-tárolót és a Supabase-táblákat.**
2. Ellenőrizd a supabase-config.js értékeit: a csomag a korábbi Dandó böngészőben használható nyilvános projektbeállításait tartalmazza. Titkos service_role kulcsot soha ne tölts fel.
3. Ha a manager_* táblák és manager_rosters már működnek, a két SQL-t nem kell újra futtatni. Új Supabase projektnél előbb supabase-vezeto.sql, majd supabase-beosztas.sql.
4. Nyisd meg: https://kancsalbrine.github.io/dando-app/vezeto.html?v=34
5. A Beosztás menüben a 13 dolgozó közül Balázs Roland az első sorban szerepel. A háttérben a régi sorazonosítók maradnak, így a meglévő beosztások nem csúsznak el.

Ha még mindig a régi felület látszik, a böngésző webhelyadataiban töröld az adott GitHub Pages oldal gyorsítótárát és a service worker regisztrációját, majd nyisd meg újra a fenti URL-t. A Supabase adatait ez nem törli.

A GitHub kapcsolat nem engedett közvetlen írást, ezért ezt a csomagot manuálisan kell feltölteni.
