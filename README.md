# Palate & Plume

A QR-code ordering website for a single café. Guests scan the QR code on their table, browse the menu, order together from one shared cart, follow their order live and pay by UPI. **No login and no app for guests.** The kitchen, the cashier and the owner each get their own screens.

> Built with Next.js 16, React 19, MongoDB Atlas, Tailwind CSS 4, three.js and framer-motion. Hosted on Vercel (Mumbai region).

---

## What it does

### For guests (no login)
- **Scan the table QR code** (or type the table number plus the 5-letter code printed on the card) and land on the menu, already seated at that table.
- **Menu** with categories, photos and a sold-out marker. Sold-out items cannot be added.
- **One shared cart per table.** Up to 4 phones can sit at a table and every phone sees the same cart, updated live.
- **Place an order** (more than once, if you like) and watch its status change on its own: *Pending → Accepted → Preparing → Served* (or *Cancelled*). No page refresh needed.
- **Pay by UPI.** A receipt "prints", then an animated QR code with a countdown appears. A failed payment is handled; after 3 failed or expired tries the guest is told to pay at the staff and give their table number.
- After staff confirm the money, the phone shows **Paid** for 5 seconds and the table is free again.

### For the kitchen and cashier (staff login)
- **Live orders board** (`/admin/orders`): new orders appear by themselves, are **read out loud** (with a chime), and move through Accept → Start preparing → Mark served, or Cancel.
- **Table bills** (`/admin/bills`): every table's orders and total. **Mark paid** (records the payment and resets the table), **Reset table** (works even if the table is full), and a **Paid today** tab with the food, table number, payer UPI id and the day's total.

### For the owner (admin login)
Everything staff can do, plus:
- **Menu manager** (`/admin/menu`): edit every item, switch items to sold out, add items and categories, upload photos (ImageKit).
- **Tables** (`/admin/tables`): add tables, switch them off, make a new QR code (this also gives the table a new code), and print the table cards.

---

## How it works (short)

| Topic | How |
|---|---|
| Guest identity | Scanning the QR sets a signed cookie (`pp_guest`, 4 h) holding the table, not a person. It is separate from the staff login and signed with a different key. |
| Shared cart | One document per table in MongoDB. Saves use a revision number, so two phones tapping at the same moment never lose a tap. |
| Live updates | Phones ask "anything new?" every few seconds with a tiny fingerprint, and the server answers `unchanged` when nothing changed. Polling slows down when quiet and pauses when the tab is hidden. |
| Orders | A snapshot of names and prices at the time of ordering. Status changes are one atomic database step, so two staff members can never clash. |
| Payment | The money goes straight from the guest's UPI app to the café's UPI id. Our server never touches it. Staff see it arrive and press **Mark paid**. |
| Reset table | Raises the table's `epoch`. The cart and seats belong to the epoch, so a new epoch means an empty table and every old phone is logged out. Old orders stay in the database. |
| Safety | Rate limits on login, scanning and table-join. Table QR secrets are 72-bit random. Security headers and a HSTS header in production. Passwords are bcrypt hashes. |

### Why UPI cannot be fully automatic
UPI apps cannot be told to lock the amount, and there is no free bank API to watch an account. So the safety net is the **staff check**: *Mark paid* only works if the bill is still exactly what staff saw on screen. The guest's QR shows the exact amount and the UPI link pre-fills it, but a guest could still edit it in their app. Staff must look at the amount that arrived.

---

## Tech stack

- **Next.js 16** (App Router, `cacheComponents`, `proxy.js`), **React 19**
- **MongoDB Atlas** with **Mongoose 9**
- **Tailwind CSS 4**, **framer-motion**, **three.js / ogl** (menu and login visuals), **lenis** (smooth scroll)
- **jose** (signed cookies), **bcryptjs**, **zod**, **qrcode**
- **ImageKit** for menu photos, **Vercel** for hosting

---

## Getting started

### 1. Install
```bash
npm install
```

### 2. Environment variables
Create a `.env.local` (for local work) and add the same values in **Vercel → Settings → Environment Variables**.

```env
# Database
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/palateplume

# A long random secret (at least 32 characters). It signs every cookie and makes the table codes.
# CHANGING IT logs everybody out AND changes every printed table code.
JWT_SECRET=put-a-64-character-random-value-here

# The live address of the site. The table QR codes point here.
SITE_URL=https://palate-plume.vercel.app

# Menu photos (ImageKit)
IMAGEKIT_PUBLIC_KEY=public_xxx
IMAGEKIT_PRIVATE_KEY=private_xxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

# Payments: where the money goes
UPI_ID=yourcafe@yourbank
UPI_NAME=Palate & Plume
```

- `UPI_ID` must be your **real** UPI id. Every payment goes to it. If it is missing, guests see "please pay at the staff".
- `UPI_NAME` is only a label in the payment link. Many UPI apps ignore it and show the name registered with the bank.
- Generate a secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

### 3. Create the owner and staff accounts (once)
```bash
node --env-file=.env.local scripts/create-accounts.mjs
```
It asks for the café name and creates one **admin** and one **staff** account. Passwords are typed hidden and only a bcrypt hash is stored.

### 4. Run
```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # run the production build
```
To test on a phone on your Wi-Fi, add your computer's address to `allowedDevOrigins` in `next.config.mjs`.

---

## First-time setup in the café

1. Log in as **admin** at `/auth/login`.
2. **Manage Menu** → add categories and items (with photos and prices).
3. **Manage Tables** → add your tables, then print the table cards (`/admin/tables/print`). Each card has the QR code, the table number and the 5-letter table code.
4. Stick a card on every table.
5. Log in as **staff** on the kitchen tablet at `/admin/orders`, tap once anywhere on the page to switch voice alerts on, and press **Test voice**.
6. Keep `/admin/bills` open on the cashier's phone.

---

## Daily use

**Kitchen**
1. A new order is announced by a chime and voice: "New order. Table 5. 2 Iced Latte, 1 Brownie."
2. Press **Accept → Start preparing → Mark served** (guests see each step).
3. Out of something? Ask the admin to switch it to **sold out**.

**Cashier**
1. The guest pays by UPI and tells a staff member.
2. Check your UPI app: did **exactly the bill amount** arrive?
3. Open **Table bills**, press **Mark paid** on that table, choose UPI / Cash / Card and type the payer's UPI id (optional). The table resets and the guest's phone shows *Paid*.
4. A guest who could not pay online appears with a red "Could not pay online" tag. Take their payment, then press **Mark paid**.
5. **Reset table** empties a table without recording a payment (walk-outs, mistakes). It warns you when a bill is unpaid.

**Voice alerts need one tap.** Browsers only allow sound after a tap, so tap anywhere on the Live orders page after opening it. On an **iPhone or iPad**, keep the page open and the screen awake (the page asks the phone to stay awake), and keep the phone's volume up. iPhones pause web pages that are in the background or locked, so no order can be announced then. For a kitchen, a tablet that stays on this page is the most reliable choice.

---

## Roles

| | Guest | Staff | Admin |
|---|:-:|:-:|:-:|
| Menu, cart, order, pay | ✅ | | |
| Live orders (`/admin/orders`) | | ✅ | ✅ |
| Table bills (`/admin/bills`) | | ✅ | ✅ |
| Menu manager and tables | | | ✅ |

`proxy.js` guards `/admin/*` and `/api/admin/*`. Staff may only open the pages listed in `lib/config.js` (`STAFF_PAGES` and `STAFF_API`). A logged-in staff or admin browser cannot act as a customer (open the table link in a private window to try the guest side).

---

## Project structure

```
app/
  (guest)/              guest pages: home, cart, your order, table help / full / staff notices
  menu/                 the menu
  t/[token]/route.js    what happens when a table QR is scanned
  admin/                orders (kitchen), bills, menu, tables
  auth/login/           staff + admin login
  api/                  orders, table-cart, table-join, payment/*, admin/*
components/             cart, orders, payment (receipt + QR), admin screens, home, nav, footer
lib/                    guest cookie, shared table cart, orders, billing, rate limit, money, UPI link
models/                 Mongoose models: Table, TableCart, Order, Payment, MenuItem, Category, User ...
scripts/                create-accounts.mjs
proxy.js                login guard for /admin and /api/admin
```

### Money
Prices are stored as whole **paise** (₹1 = 100 paise) so there are no rounding errors. They are shown as rupees only on screen.

### Database collections
`users`, `tables`, `tableCarts` (auto-deleted after 12 h idle), `orders`, `payments`, `menuitems`, `categories`, and `loginAttempts` (rate limits).

---

## Deploying to Vercel

1. Push the project to GitHub and import it in Vercel.
2. Add all the environment variables above (set `SITE_URL` to your real address).
3. In MongoDB Atlas, allow Vercel to connect (Network Access → `0.0.0.0/0` is the usual choice on Vercel).
4. Deploy. The function region is Mumbai (`bom1`, see `vercel.json`).
5. If you ever change the domain, **print new table cards**: the address is inside every QR code.

---

## Good to know

- **Replacing a table's QR code** ("New QR code" in Manage Tables) also changes its 5-letter code and logs out every phone at that table.
- **A table with no activity for an hour** starts a new sitting for the next guests, so they never see the previous guests' orders. Unpaid bills still show for staff until the table is paid or reset.
- **A QR code lives 5 minutes.** If the bill grows (someone orders more) while the QR is open, a new QR with the new amount is made automatically.
- **The payer UPI id in the paid history is typed by staff** (there is no bank link to read it automatically).
- **Voice alerts** use the device's own voices. The list of voices depends on the phone or computer, and you can choose one from the dropdown on the Live orders page.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "JWT_SECRET is missing or too short" | Set `JWT_SECRET` to at least 32 characters. |
| Guests land on the "table help" page | The QR is old or the table is switched off. Print a new card. |
| "This table is full" | Four phones already sit at the table. Staff can press **Reset table**. |
| Payment says "pay at the staff" straight away | `UPI_ID` is missing or not a valid UPI id on Vercel. |
| No voice on the orders page | Tap the page once, press **Test voice**, raise the volume, and check the phone is not in a silent / low-power mode. |
| Staff opens a table link and sees "logged in as staff" | Expected. Staff browsers cannot order. Use a private window. |

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint the code |
| `node --env-file=.env.local scripts/create-accounts.mjs` | Create the café, admin and staff |

---

© Palate & Plume. All rights reserved.