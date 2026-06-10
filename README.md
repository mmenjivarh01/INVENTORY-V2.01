# Afghan Kabob Inventory V2.0.2

Mobile-first inventory system built with HTML, CSS, JavaScript modules and Firebase Realtime Database.

## What is included

- Firebase Web SDK connection to `afghan-kabab-inventory-gpt`
- Mobile-first interface with tablet/desktop adaptation
- English default, Spanish optional
- Dashboard
- Raw materials / finished products inventory views
- Add / edit / delete products
- Stock entry / exit / set adjustment
- Categories and units editor
- History view
- Print / PDF report
- JSON export
- Initial data import from `data/seed.json`

## Files

```text
index.html
manifest.json
css/styles.css
js/config.js
js/firebase.js
js/i18n.js
js/state.js
js/data.js
js/ui.js
js/app.js
data/seed.json
```

## Firebase setup

1. Open Firebase Console for the development project.
2. Enable Authentication > Sign-in method > Email/Password.
3. Create at least one user in Authentication. For the first import, create `mmenjivar29@gmail.com` with a temporary password, then log in as `Admin`.
4. In Realtime Database, use rules similar to this during development:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

5. Open the app and sign in with a username alias such as `Admin` or with the full email. The app resolves username → email internally.
6. Go to Settings or Dashboard and click **Import initial data**.

## Important

This app is currently connected to the development Firebase project, not the production project.
Do not replace `js/config.js` with the production config until the final migration window.

## Final migration plan

1. Freeze the old inventory at 10:00 p.m.
2. Export the latest production Realtime Database JSON.
3. Replace `data/seed.json` with the final export.
4. Import into the V2 Firebase project.
5. Verify product count, low-stock count, and out-of-stock count.
6. Publish the final V2 app.


## Login model

The visible login accepts internal usernames or emails. Current aliases:

```text
Admin      -> mmenjivar29@gmail.com
Antonio    -> antonio@imenjivar.com
Nayuby1979 -> nayuby1979@imenjivar.com
MMadrigal  -> mmadrigal@imenjivar.com
```

Firebase Authentication still validates the real email/password. Realtime Database `/usuarios` stores the internal username, role and active status.

When importing production data into a new Firebase project, Auth UIDs may change. This version falls back to matching `/usuarios` by email and then mirrors the profile under the new UID.

## V2.0.6 changes

- Uses the real restaurant logo (`logo.png`) and updated brand colors based on the logo.
- Three internal roles are supported:
  - `admin`: full system access, users, categories, units, data import/export.
  - `usuario`: inventory operations and history/reports, no user administration.
  - `invitado`: read-only profile level.
- Admin user panel now supports:
  - creating Firebase Auth users through a secondary Firebase app instance,
  - creating/updating `/usuarios` profiles,
  - editing role/status,
  - pending password reset compatible with the original system pattern.
- All users can change their own password from inside the app.

### Password reset behavior
The admin reset button writes a temporary password into `/pendingReset`. On the user's next successful login, the app applies that password with Firebase Auth `updatePassword()` and clears the pending reset.



## v2.1.44
- Ajuste visual de iconos de categorías a estilo vectorial fino tipo Tabler/Lucide.

## v2.1.56
- Inventory workspace fixed on desktop/tablet: navigation, header, inventory tabs, search and filters remain anchored while only the product list/table scrolls.
