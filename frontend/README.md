# NEXT js , Tailwind v4 , Shadcn boilerplate 

[![GitHub Repo stars](https://img.shields.io/github/stars/walleeva2018/nextjs-tailwind-shadcn-latest-boilerplate?style=social)](https://github.com/walleeva2018/nextjs-tailwind-shadcn-latest-boilerplate)
[![GitHub forks](https://img.shields.io/github/forks/walleeva2018/nextjs-tailwind-shadcn-latest-boilerplate?style=social)](https://github.com/walleeva2018/nextjs-tailwind-shadcn-latest-boilerplate)
[![GitHub issues](https://img.shields.io/github/issues/walleeva2018/nextjs-tailwind-shadcn-latest-boilerplate)](https://github.com/walleeva2018/nextjs-tailwind-shadcn-latest-boilerplate/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/walleeva2018/nextjs-tailwind-shadcn-latest-boilerplate)](https://github.com/walleeva2018/nextjs-tailwind-shadcn-latest-boilerplate/pulls)

[![MIT License](https://img.shields.io/github/license/walleeva2018/nextjs-tailwind-shadcn-latest-boilerplate)](LICENSE)

A modern, high-performance frontend boilerplate built with Next.js 15, React 19, Tailwind CSS v4, and shadcn/ui components.

## Tech Stack

- **Next.js**: v15.3.2
- **React**: v19.0.0
- **Tailwind CSS**: v4.1.6
- **TypeScript**: v5+
- **shadcn/ui**: Latest components
- **Lucide React**: v0.510.0
- **ESLint**: v9

## Features

- **App Router Architecture** - Built on Next.js 15's recommended App Router pattern
- **Server Components** - Leverages React 19's server component model
- **Tailwind CSS v4** - Enhanced styling with the latest Tailwind version
- **shadcn/ui Integration** - Beautiful, accessible components ready to use
- **TypeScript Support** - Full type safety throughout the codebase
- **Modern Animation** - Includes tw-animate-css for sleek transitions
- **Code Quality Tools** - Configured with ESLint for clean, consistent code
- **Performance Optimized** - Built with performance best practices

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/bdseeker-frontend.git
cd bdseeker-frontend
```

2. Install dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Start the development server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
bdseeker-frontend/
├── public/             # Static assets
├── src/
│   ├── app/            # App Router routes and layouts
│   │   ├── api/        # API routes
│   │   ├── globals.css # Global styles
│   │   ├── layout.tsx  # Root layout
│   │   └── page.tsx    # Home page
│   ├── components/     # React components
│   │   ├── ui/         # shadcn/ui components
│   │   └── ...         # Custom components
│   ├── lib/            # Utility functions
│   └── types/          # TypeScript type definitions
├── .eslintrc.js        # ESLint configuration
├── postcss.config.js   # PostCSS configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Project dependencies and scripts
```

## Configuration

### Tailwind CSS

This boilerplate uses Tailwind CSS v4. The configuration is in `tailwind.config.js`.

### PostCSS

PostCSS is configured to work with Tailwind CSS v4 in `postcss.config.js`.

### shadcn/ui Components

To add more shadcn/ui components, use the CLI:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
# etc.
```

## Customizing

### Styling

Modify the Tailwind configuration in `tailwind.config.js` to customize colors, spacing, and other design tokens.

### Components

Create custom components in the `src/components` directory. Use shadcn/ui components as building blocks.

### Layouts

Modify the root layout in `src/app/layout.tsx` or create new layouts for different sections of your application.

## Adding Dependencies

```bash
npm install package-name
# or
yarn add package-name
# or
pnpm add package-name
# or
bun add package-name
```

## Deployment

The project is ready to be deployed to Vercel or any other hosting platform that supports Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Learn More

To learn more about the technologies used in this template:

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## License

This project is open-source and available under the MIT License.

---

Created and maintained by people.