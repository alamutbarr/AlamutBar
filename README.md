# Alamut Transportation Landing Page

A standalone React + Vite project for the Alamut Company landing page.

## Requirements

- Node.js 20.19 or newer
- npm (included with Node.js)

## Run locally

```sh
npm install
npm run dev
```

Vite prints the local development URL when it starts.

## Build and preview

```sh
npm run build
npm run preview
```

The production build is written to `dist/`.

## Note about inquiries

The contact form currently demonstrates the client-side confirmation state; it is not connected to an email service or backend endpoint.

## Localization

The site is Persian (`fa`) and right-to-left (`dir="rtl"` in `index.html`). Font: Vazirmatn (Google Fonts link in `index.html`; self-host it if Google Fonts is unreliable for your audience). Dates and numbers use `fa-IR` (Jalali year in the footer).
