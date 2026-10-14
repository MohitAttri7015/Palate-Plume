// scripts/create-accounts.mjs
// Creates your cafe and TWO accounts: one "admin" and one "staff".
// Each account has only: username, password, role.
//
// Run from your project folder:
//   node --env-file=.env.local scripts/create-accounts.mjs
//
// Needs:  npm i mongoose bcryptjs     (Node 20.6 or newer)
//
// Safety: passwords are typed hidden, never saved in any file, and only a
// scrambled version (bcrypt hash) is stored in the database.

import readline from "node:readline/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;
const MAX_BYTES = 72; // bcrypt only reads the first 72 bytes

function fail(msg) {
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) fail("MONGODB_URI is missing. Add it to your .env.local file first.");
if (!process.stdin.isTTY) fail("Run this in a normal terminal window.");

// Asks for a password and shows nothing while you type.
function askHidden(label) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(label);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (ch === "\u0003") {
          process.stdout.write("\n");
          process.exit(1); // Ctrl+C
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function checkUsername(u, label) {
  if (!/^[a-z0-9._]{3,20}$/.test(u))
    fail(`${label} username must be 3-20 characters: small letters, numbers, dot or underscore only.`);
}

function checkPassword(p, min, label) {
  if (p.length < min) fail(`${label} password must be at least ${min} characters.`);
  if (Buffer.byteLength(p, "utf8") > MAX_BYTES) fail(`${label} password is too long (max ${MAX_BYTES}).`);
  if (/^(.)\1+$/.test(p)) fail(`${label} password cannot be one repeated character.`);
}

// ---- 1. Questions (visible ones first) ----
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const cafeName = (await rl.question("Cafe name: ")).trim();
if (cafeName.length < 2) fail("Cafe name is too short.");
const slug = slugify(cafeName);
if (!slug) fail("Cafe name must contain letters or numbers.");

const adminUser = (await rl.question("ADMIN username (for the owner): ")).trim().toLowerCase();
checkUsername(adminUser, "Admin");
const staffUser = (await rl.question("STAFF username (for the kitchen): ")).trim().toLowerCase();
checkUsername(staffUser, "Staff");
if (adminUser === staffUser) fail("Admin and staff usernames must be different.");
rl.close();

// ---- 2. Passwords (hidden) ----
const adminPass = await askHidden("ADMIN password (at least 6 characters): ");
const adminPass2 = await askHidden("ADMIN password again: ");
if (adminPass !== adminPass2) fail("Admin passwords do not match.");
checkPassword(adminPass, 6, "Admin");
if (adminPass.toLowerCase().includes(adminUser)) fail("Admin password must not contain the username.");

const staffPass = await askHidden("STAFF password (at least 6 characters): ");
const staffPass2 = await askHidden("STAFF password again: ");
if (staffPass !== staffPass2) fail("Staff passwords do not match.");
checkPassword(staffPass, 6, "Staff");
if (staffPass.toLowerCase().includes(staffUser)) fail("Staff password must not contain the username.");
if (staffPass === adminPass) fail("Staff and admin passwords must be different.");

// ---- 3. Connect to the database ----
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
} catch (err) {
  fail(`Could not connect to MongoDB: ${err.message}\nCheck the password in MONGODB_URI and Atlas > Network Access.`);
}

const dbName = mongoose.connection.name;
if (!dbName || dbName === "test") {
  await mongoose.disconnect();
  fail("MONGODB_URI has no database name. Add /tabletap right before the ? sign.");
}
console.log(`\nConnected to database: ${dbName}`);

const cafes = mongoose.connection.collection("cafes");
const users = mongoose.connection.collection("users");

await users.createIndex({ username: 1 }, { unique: true });
await cafes.createIndex({ slug: 1 }, { unique: true });

// Stop before saving anything if a username is already taken.
for (const u of [adminUser, staffUser]) {
  if (await users.findOne({ username: u })) {
    await mongoose.disconnect();
    fail(`The username "${u}" already exists. Run again and choose a different one.`);
  }
}

// ---- 4. Save ----
const now = new Date();
let cafe = await cafes.findOne({ slug });
if (!cafe) {
  const res = await cafes.insertOne({
    name: cafeName,
    slug,
    currency: "INR",
    taxPercent: 0, // set the real tax later in Settings
    paymentModes: ["COUNTER"],
    isActive: true,
    createdAt: now,
  });
  cafe = { _id: res.insertedId };
} else {
  console.log(`Using the existing cafe "${slug}".`);
}

const [adminHash, staffHash] = await Promise.all([
  bcrypt.hash(adminPass, BCRYPT_COST),
  bcrypt.hash(staffPass, BCRYPT_COST),
]);

await users.insertMany([
  { cafeId: cafe._id, username: adminUser, passwordHash: adminHash, role: "admin", createdAt: now },
  { cafeId: cafe._id, username: staffUser, passwordHash: staffHash, role: "staff", createdAt: now },
]);

console.log(`\nDone! Created for "${cafeName}":`);
console.log(`  admin : ${adminUser}   (role: admin)`);
console.log(`  staff : ${staffUser}   (role: staff)`);
console.log("Passwords were NOT saved anywhere except as scrambled hashes in the database.");

await mongoose.disconnect();
