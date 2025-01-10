# Auto Drive Static Web App

This project is a static web app example built with [Next.js](https://nextjs.org), specifically modified for easy deployment to Auto Drive. It is bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Exporting the App for Auto Drive

To export the app as static files for Auto Drive, use the following command with your API key, based on your package manager:

```bash
npm run export -- --auto-drive-api-key=<API_KEY>
# or
yarn export --auto-drive-api-key=<API_KEY>
# or
pnpm export -- --auto-drive-api-key=<API_KEY>
# or
bun export --auto-drive-api-key=<API_KEY>
```

You can create an account and generate an API key on the [Auto Drive website](https://ai3.storage/).

This command executes the `export` script defined in the `package.json`:

```json
"export": "next build && ts-node export.ts"
```

## Getting Started

To start the development server, run:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result. You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
