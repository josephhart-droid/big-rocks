# BIG ROCKS - Roadmap Software

Roadmap software that forces clarity. Put the big rocks first.

## Deployment Instructions

### Option 1: Deploy to Vercel (Recommended)

1. Push this code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up with GitHub
3. Click "Import Project" and select this repository
4. Vercel will auto-detect React and deploy
5. Add your custom domain in Settings → Domains

### Option 2: Deploy to Netlify

1. Push this code to GitHub
2. Go to [netlify.com](https://netlify.com) and sign up
3. Click "Import from Git" and select this repository
4. Build command: `npm run build`
5. Publish directory: `build`
6. Click Deploy

## Local Development

```bash
npm install
npm start
```

Opens on `http://localhost:3000`

## Tech Stack

- React 18
- html2canvas (for PNG export)
- localStorage (for data persistence)
- No backend required!
