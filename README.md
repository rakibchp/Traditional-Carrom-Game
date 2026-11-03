# Carrom Club

A responsive, browser-playable carrom game inspired by the familiar board at a neighbourhood tea stall. Two local players take turns flicking a striker, pocketing their colour, and chasing the queen.

## Features

- **Interactive canvas board** rendered at a crisp high-DPI resolution.
- **Pointer and touch controls** for aiming, pulling back, and releasing the striker.
- **Basic 2D physics** with striker and coin collisions, cushion rebounds, friction, and corner pockets.
- **Pass-and-play scoring** for two players, with a foul penalty, queen bonus, and a first-to-nine finish.
- **Responsive layout** designed for desktop, tablet, and phone screens.
- **No accounts, network calls, or additional runtime packages.**

## How to play

1. Player one uses the ivory coins; player two uses the charcoal coins.
2. Click or tap along your baseline to choose where to place the striker.
3. Drag the striker backwards to aim and set power, then release to shoot. Pull farther for a stronger shot.
4. Pocketing your own coin keeps your turn. Otherwise, play passes to the other player.
5. Pocketing the queen awards three points. Pocketing the striker is a foul and deducts one point.
6. The first player to reach nine points wins. If every coin is pocketed first, the higher score wins.
7. Select **New game** at any time to reset the board and score.

The game uses a deliberately approachable, simplified scoring model for quick local matches; it is not intended as a tournament-rules adjudicator.

## Tech stack

- [Next.js](https://nextjs.org/) App Router
- [React](https://react.dev/) with TypeScript
- [Tailwind CSS](https://tailwindcss.com/) 4, with app-specific responsive styling
- HTML5 Canvas API for board rendering and animation

The interactive game is a client component because it uses React state, pointer events, `requestAnimationFrame`, `ResizeObserver`, and the Canvas API. The route and root layout remain server-rendered.

## Project structure

```text
app/
  components/
    carrom-game.tsx      Interactive game UI, canvas rendering, and input
  lib/
    carrom-physics.ts    Board setup, collision simulation, and scoring
  globals.css            Theme tokens and responsive component styles
  layout.tsx             Root layout and page metadata
  page.tsx               Home route
```

## Requirements

- Node.js 20.9 or later
- npm (the repository includes `package-lock.json`)

## Run locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

Run the configured lint check and production build:

```bash
npm run lint
npm run build
```

## Production

Build the application and start the production server:

```bash
npm run build
npm run start
```

The game is a client-side local match and does not require a backend or persistent storage.
