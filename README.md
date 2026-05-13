# capacitor-firebase-firestore-docref-web-repro

Minimal reproduction of a `RangeError: Maximum call stack size exceeded`
thrown from `@capacitor-firebase/firestore@8.2.0`'s web `deserializeData`
when reading a document containing a `DocumentReference` field.

## Symptom

Calling `FirebaseFirestore.getDocument({ reference: 'mre/parent' })` on
a document whose data looks like `{ child: <DocumentReference> }` throws:

```
RangeError: Maximum call stack size exceeded
    at FirebaseFirestoreWeb.deserializeData (node_modules/@capacitor-firebase/firestore/dist/esm/web.js:...)
```

Root cause: `deserializeData` in `packages/firestore/src/web.ts` has
branches for `Timestamp`, `GeoPoint`, arrays, and generic objects but
no branch for `DocumentReference`. The generic `typeof === 'object'`
branch enumerates `Object.keys(data)` and recurses, which (a) drops
`id` and `path` since both are prototype getters, and (b) walks into
the `DocumentReference`'s `firestore` back-reference, causing infinite
recursion.

## Setup

1. `npm install`
2. Create a Firebase project, enable Cloud Firestore in **test mode**
   (so unauthenticated reads/writes succeed).
3. `cp src/firebase-config.example.ts src/firebase-config.ts` and fill
   in your project's web config.
4. `npm run dev`
5. Open the URL Vite prints in a desktop browser.
6. Click **Run repro**.

## Expected

`getDocument` returns the parent document, with `snapshot.data.child`
deserialized to something like `{ id: 'child', path: 'mre/child' }`
(consistent with the existing handling of `Timestamp`/`GeoPoint` and
with the native Android/iOS serializers).

## Actual

`RangeError: Maximum call stack size exceeded`, originating in
`@capacitor-firebase/firestore`'s `deserializeData`.

## Versions

- `@capacitor-firebase/firestore`: `8.2.0`
- `@capacitor/core`: `8.x`
- `firebase`: `12.x`
- Platform: Web (desktop browser)

## Related

- Issue #818 — same bug class, fixed only for the Android native
  serializer; web variant was unchecked.
- PR #956 — introduced the `__type__` deserialization pattern for
  `Timestamp` / `GeoPoint` / `FieldValue` but did not add a
  corresponding `DocumentReference` branch.

## Proposed fix

Add a `DocumentReference` branch to `deserializeData`, mirroring the
existing `Timestamp` / `GeoPoint` pattern:

```ts
import { DocumentReference, /* ... */ } from 'firebase/firestore';

// inside deserializeData(data):
if (data instanceof DocumentReference) {
    return {
        __type__: 'reference',
        id: data.id,
        path: data.path,
    };
}
```
