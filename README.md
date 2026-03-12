# Eyebrow Tetris

Control Tetris using your facial expressions! Raise your eyebrows to move pieces, open your mouth to hard drop.

## Features

- **Face-controlled gameplay**: Use your webcam and facial expressions to play Tetris
- **Keyboard backup**: WASD/Arrow keys work too
- **Global leaderboard**: Submit your scores and compete with others
- **Progressive difficulty**: Speed increases with each level
- **Responsive design**: Works on desktop and mobile

## How to Play

| Gesture | Action |
|---------|--------|
| Left eyebrow up | Move left |
| Right eyebrow up | Move right |
| Both eyebrows up | Rotate |
| Open mouth | Hard drop |

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS v4
- **Face Detection**: MediaPipe Face Landmarker
- **Database**: Supabase (for leaderboard)
- **Hosting**: GitHub Pages (static export)

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/sanderdesnaijer/eyebrow-tetris.git
   cd eyebrow-tetris
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment example and configure:
   ```bash
   cp .env.example .env.local
   ```

4. (Optional) Set up Supabase for leaderboard:
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL from `supabase-schema.sql` in the SQL Editor
   - Copy your project URL and anon key to `.env.local`

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Deployment

The site automatically deploys to GitHub Pages when you push to the `main` branch.

### GitHub Secrets Required

For the leaderboard to work in production, add these secrets to your repository:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Project Structure

```
src/
├── app/
│   ├── page.tsx           # Home page with game
│   ├── leaderboard/       # Leaderboard page
│   ├── how-to-play/       # Instructions
│   ├── privacy/           # Privacy policy
│   └── changelog/         # Version history
├── components/
│   ├── GameScreen.tsx     # Camera + face detection
│   ├── TetrisOverlay.tsx  # Tetris game logic
│   ├── Navigation.tsx     # Site navigation
│   └── ScoreSubmitModal.tsx
└── lib/
    ├── supabase.ts        # Database client
    └── github.ts          # GitHub releases fetcher
```

## Versioning

This project uses semantic versioning. Every push to `main` automatically creates a new release with an incremented patch version.

To control version bumps, use conventional commits:
- `feat:` - Minor version bump
- `fix:` - Patch version bump
- `BREAKING CHANGE:` - Major version bump

## Privacy

- Camera data is processed entirely in your browser
- No video is ever sent to any server
- Only leaderboard data (nickname, score) is stored
- See the [Privacy Policy](/privacy) for details

## License

MIT
