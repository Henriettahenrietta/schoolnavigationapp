# Brand assets

Every visual reference to the institution resolves through `lib/branding.ts`. Replace the
files here (keeping the filenames) to re-skin the whole app. No component changes needed.

| File               | Used for                                                     | Status              |
| ------------------ | ------------------------------------------------------------ | ------------------- |
| `yibs-logo.svg`    | Navbar, sidebar, auth screens, footer, printed/PDF headers    | Vector stand-in     |
| `yibs-building.jpg`| Landing-page hero and sign-in background photo                | **Not supplied yet**|

## Supplying the real assets

**Logo.** `yibs-logo.svg` is a hand-built vector approximation of the YIBS crest (blue
shield, quartered with book / key / stars / globe, grey laurel wreath). It is deliberately
a vector so it stays crisp in print exports. To use the official artwork instead, save it
as `yibs-logo.png` here and point `LOGO_SRC` in `lib/branding.ts` at it:

```ts
export const LOGO_SRC = "/brand/yibs-logo.png";
```

**Building photo.** Save the school building photograph as `yibs-building.jpg` in this
folder. Nothing else needs to change, because the hero and sign-in screens already reference it.

Until that file exists the layered CSS background falls back to a blue-sky gradient in the
same palette, so the pages render correctly either way (no broken-image state). Aim for a
landscape crop around 1920×1280 and keep it under ~400 KB so the hero stays fast.
