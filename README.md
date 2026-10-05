# zomato-clone

A Zomato-style food ordering app built with **React 19 + TypeScript 7 + Vite 8 + Tailwind CSS v4**, backed by **Cloud Firestore**, **Firebase Auth (Google)** and **Firebase Cloud Storage**.

**Live URL:** <https://zomato-3e2f4.web.app>

---

## Features

**Discovery**
- Responsive header with a **"Deliver to" state picker** (all 28 states + 8 union territories), search bar, cart badge and account menu
- Hero banner, horizontal category rail, sticky filter bar (sort / rating / price band / pure veg / cuisine facets)
- Restaurant grid with rating badge, discount tag, price-for-two, delivery time and area
- Live search (debounced, accent-insensitive) across name, cuisine, locality and city
- State-aware empty state: *"We do not deliver to Maharashtra yet"*
- Filter state persisted to `localStorage`

**Ordering**
- Restaurant page with a real menu per restaurant (6 dishes each, veg / spicy / bestseller markers)
- Cart with quantity steppers, per-restaurant delivery fee, taxes, and `localStorage` persistence
- Checkout with a validated address form and payment method (COD / UPI, demo only)
- Order placement with an auto-incrementing order number (`ZMC-00001`) inside a Firestore transaction
- **My orders** history with progress tracker

**Accounts**
- Google sign-in via Firebase Auth (`signInWithPopup`, falling back to redirect when blocked)
- Route guard on `/checkout` and `/orders`; Firestore rules are the real enforcement

**Admin panel** (`/admin`)
- Separate **email + password** sign-in, granted by an email allow-list
- Dashboard: revenue, orders, orders today, pending, restaurants, average order value
- Restaurants: full CRUD with validation, menu-item counts and a delete confirmation
- Orders: every order across all users, with an inline status control
- Customers: lifetime value per customer, derived from real orders
- Firestore rules allow writes only for the allow-listed admin

**Platform**
- Graceful degradation — bundled demo data when Firebase is unconfigured, unreachable or empty
- Skeleton loading states, empty states and dismissible error banners
- Accessibility: labelled controls, `aria-pressed`, live regions, keyboard-visible focus, reduced-motion support

## Tech decisions

| Concern          | Choice                                                              |
| ---------------- | ------------------------------------------------------------------- |
| Build            | Vite 8 + `@vitejs/plugin-react`                                     |
| Language         | TypeScript 7, `strict` + `noUnusedLocals` + `erasableSyntaxOnly`     |
| Routing          | `react-router-dom` v7, every page `lazy()`-loaded                    |
| Styling          | Tailwind CSS v4 via `@tailwindcss/vite` (brand tokens in `@theme`)   |
| State            | Three focused contexts: `AuthProvider`, `CartProvider`, `FiltersProvider` |
| Data             | Firestore `onSnapshot` for the catalogue, one-shot reads for menus   |
| Images           | CC0 files committed to `public/img/`, Cloud Storage behind a flag    |
| Secrets          | `.env` only, git-ignored; `import.meta.env` typed in `vite-env.d.ts` |
| Deploy           | Firebase Hosting SPA rewrite, immutable asset cache, security headers |

### Why the Firebase SDK is code-split

`firebase/firestore`, `firebase/storage` and `firebase/auth` are behind
`import()` inside hooks. An anonymous visitor never downloads them, and
`firebase/auth` only loads when someone opens the login page.

```
index.js                    364 kB   app shell + React Router
firebase-clients.js         455 kB   Firestore + Storage  (on demand)
auth-repository.js           71 kB   Firebase Auth        (on demand)
home-page.js                 13 kB
restaurant-page.js           15 kB
```

### Why filtering happens client-side

The Firestore query is `orderBy('rating').limit(60)`; search, filter and sort
run in `useMemo` over that bounded set, which keeps the app free of composite
index requirements for the catalogue. Move the facets into `where(...)` clauses
once the catalogue grows.

`orders` **does** need a composite index (`userId` + `createdAt`) because the
My-orders page filters by owner and sorts by date — see `firestore.indexes.json`.

## Setup

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

`.env` is already filled in for this project. For your own project, copy the
values from **Firebase Console → Project settings → Your apps → SDK setup and configuration**.

```bash
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

## Firebase setup (one time)

1. **Enable Google sign-in**
   Firebase Console → **Authentication → Sign-in method → Google → Enable**.
   Firebase also creates the OAuth consent screen; add your own Google account
   under **Test users** if the app is in "testing" mode.

2. **Enable Cloud Firestore** — already done for `zomato-3e2f4`
   (`asia-south1`, native mode).

3. **Enable Cloud Storage** *(optional)*
   The default bucket needs a billing account on the project. Until it exists,
   images are served from `public/img/` and `VITE_FIREBASE_STORAGE_ENABLED`
   stays `false` — see [Images](#images) below.

4. **Seed the catalogue**
   ```bash
   npm run rules:temp     # permissive ruleset so the client SDK can write
   npm run seed           # writes restaurants, categories and 84 menu items
   npm run rules:strict   # always restore the real ruleset
   ```
   > Run `npm run rules:strict` even if the seed fails — the temporary ruleset
   > is also hard-capped at `timestamp.date(2027, 1, 1)` as a backstop.

5. **Deploy the index and rules**
   ```bash
   npm run deploy:indexes
   npm run rules:strict
   ```

## Deploy

```bash
npm run deploy            # build + rules + hosting
npm run deploy:hosting    # hosting only
npm run deploy:storage    # storage rules (needs a bucket)
```

## Admin panel

`/admin` uses **email + password**, not Google. Add the admin address to
`VITE_ADMIN_EMAILS` in `.env` — and to the `isAdmin()` list in
`firestore.rules`, which is the actual enforcement:

```text
function isAdmin() {
  return isSignedIn()
         && request.auth.token.email in [ 'your-admin@example.com' ];
}
```

Create the account once (passwords are never stored in the repo):

```bash
node -e "fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+process.env.VITE_FIREBASE_API_KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD,returnSecureToken:true})}).then(r=>r.json()).then(console.log)"
```

An email allow-list is weaker than a custom claim, because the address on a
Google account can be changed. For production, set
`request.auth.token.admin == true` from a Cloud Function instead.

## Images

All 24 images are **CC0 1.0 / Public Domain Mark**, fetched from
[Openverse](https://openverse.org) by `npm run assets`, so no attribution is
required and the files can live in the repo.

```bash
npm run assets                        # fetch anything missing
npm run assets -- --force             # re-fetch everything
npm run assets -- --only=sweet-tooth  # one item
```

`scripts/fetch-assets.ts` ranks candidates so a dish never ends up with a photo
of a camera, and **validates that the bytes match the file extension** — some
hosts return WebP for a `.jpg` URL, which Hosting then serves as `image/jpeg`
and the browser renders as nothing.

- `assets/` is a git-ignored download cache
- `public/img/` is committed and served by Hosting at `/img/...`
- `ASSET-CREDITS.md` records every image's title, author and licence

To move images into Cloud Storage later:

```bash
# 1. enable Storage in the console, then flip the flag in .env
VITE_FIREBASE_STORAGE_ENABLED=true
# 2. upload + deploy rules
npm run seed
npm run deploy:storage
```

## Data model

```text
restaurants/{id}                    name, cuisines[], rating, ratingCount,
                                   deliveryMinutes, costForTwo, area, city,
                                   state, pureVeg, discount, featured,
                                   imagePath, fallbackImageUrl
restaurants/{id}/menu/{itemId}      name, description, price, veg, spicy, popular
categories/{id}                     label, imagePath, fallbackImageUrl
orders/{id}                         orderNumber (ZMC-00042), userId, userName,
                                   userEmail, restaurantId, restaurantName,
                                   items[], totals, address, paymentMethod,
                                   status, createdAt
orderCounters/global                { value } — sequential order numbers
```

Source of truth for the seed: `src/data/restaurants.json`, `categories.json`
and `menu.json` — the same files power offline demo mode.

## Security model

`firestore.rules`:

- `restaurants`, `restaurants/*/menu`, `categories` — public read, **no client writes**
- `orders` — create only if `request.auth != null` **and** `userId == request.auth.uid`;
  read only your own; update and delete always denied
- `orderCounters/global` — signed-in users only (a Cloud Function would be better in production)
- everything else denied

`storage.rules`: public read, writes closed to the public.

Verify the deployed posture at any time:

```bash
npm run verify:security
```

Two passes: anonymous must be denied everything privileged, and (with
`ADMIN_EMAIL` / `ADMIN_PASSWORD` set) the admin account must be allowed.

```
PASS  anonymous read of restaurants              allowed
PASS  anonymous read of categories               allowed
PASS  anonymous read of a restaurant menu        allowed
PASS  anonymous read of orders                   denied (permission-denied)
PASS  anonymous write of an order                denied (permission-denied)
PASS  anonymous read of the order counter        denied (permission-denied)
PASS  anonymous write to restaurants             denied (permission-denied)
PASS  admin reads every order                    allowed
PASS  admin reads the order counter              allowed
PASS  admin writes a restaurant                  allowed
PASS  admin deletes a restaurant                 allowed
PASS  admin writes a menu item                   allowed
```

Admin privileges:

- `restaurants`, `restaurants/*/menu`, `categories` — public read, **admin-only writes**
- `orders` — customers create and read their own; admins read and update all
- `orderCounters/global` — checkout writes it, only admins read it
- everything else denied

## Project layout

```text
src/
├── components/     UI only, one concern per file
├── context/        auth-context, cart-context, filters-context
├── data/           seed JSON + states.ts
├── hooks/          use-restaurants, use-image-url, use-debounced-value
├── lib/            firebase-app, firebase-clients, *-repository
├── pages/          one file per route
├── types/          domain types
└── utils/          cn, formatters
scripts/            seed.ts, fetch-assets.ts, verify-security.ts
tests/              Playwright scripts (see below)
```

## Tests

```bash
npm run test:e2e
```

Three headed-Edge suites against the deployed URL:

| Script                   | Covers                                                             |
| ------------------------ | ------------------------------------------------------------------ |
| `smoke-test.js`          | render, images, search, filters, sort, reset, empty state, mobile overflow, a11y, console |
| `location-test.js`       | all 37 state options, per-state filtering, uncovered state, persistence |
| `order-flow-test.js`     | card → menu → add to cart → totals → persistence → auth gate → 404   |
| `run-admin-test.mjs`     | admin login, wrong password, dashboard, restaurants CRUD, orders, customers, sign-out |

Run one manually:

```bash
npx playwright-cli open --headed --browser=msedge https://zomato-3e2f4.web.app
npx playwright-cli --raw run-code --filename=tests/smoke-test.js
npx playwright-cli close
```

The admin suite needs real credentials, so it is generated at run time into the
git-ignored `.playwright-cli/` folder — the secrets never reach a committed file:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret \
  npm run test:e2e:admin
```

Three gotchas worth knowing, all encoded in the scripts:

- React Router navigates with `pushState`, so Playwright's `waitForURL` hangs
  waiting for a load event that never fires — wait on `location.pathname` instead.
- A long-lived browser profile asserts against the *previous* deploy. The
  scripts disable the HTTP cache over CDP and cache-bust the entry URL.
- Firebase Auth persists the session in IndexedDB, so a re-run would skip the
  login screen. The admin suite deletes `firebaseLocalStorageDb` first.

## Before going to production

- [ ] Set `allow write: if false` in `storage.rules` once the bucket is seeded
- [ ] Move order-number allocation to a Cloud Function
- [ ] Re-price orders server-side from Firestore — the client is untrusted
- [ ] Add your domain to the `connect-src` header in `firebase.json`
- [ ] Delete `firestore.seed.rules` and `firebase.seed.json`
