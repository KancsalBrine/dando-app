# Dandó – új felület és felhőszinkron

## Telepítés GitHub Pages-re
Cseréld le a repó gyökérkönyvtárában a fájlokat az itt található fájlokra. A `supabase-setup.sql` és a `supabase-config.js` is kerüljön a gyökérbe.

## Felhőszinkron beállítása
1. Hozz létre egy Supabase projektet.
2. A Dashboard SQL Editor részén futtasd a `supabase-setup.sql` teljes tartalmát.
3. A Authentication / URL Configuration részen állítsd a Site URL értékét erre: `https://kancsalbrine.github.io/dando-app/` (és add hozzá ezt a Redirect URL-ekhez is).
4. A Project Settings / API részen másold ki a Project URL-t és a publishable (vagy anon) kulcsot.
5. A `supabase-config.js` fájlban cseréld le a két `IDE_JON...` értéket.
6. Töltsd fel a módosított fájlokat GitHubra, majd várd meg a Pages újratelepítését.
7. Nyisd meg a Dandót, válaszd a Szinkronizálás gombot, hozz létre fiókot, erősítsd meg az e-mail-címed, majd jelentkezz be.
8. A másik eszközön ugyanazzal a fiókkal jelentkezz be.

A `publishable`/`anon` kulcs böngészőben használható, a `service_role` titkos kulcsot soha ne tedd a weboldalba. A táblán Row Level Security védi, hogy mindenki csak a saját adatait olvashassa és módosíthassa.
