<<<<<<< HEAD
# vamsiandnamrathawedding
=======
# Custom Wedding Website

A simple Node.js + Express + MongoDB site using EJS templates. The home page is a full-screen hero image with your names and date, plus navigation to Our Story, Gallery, Ceremony, RSVP, and Registry. The RSVP form saves submissions to MongoDB.

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create `.env`

```bash
cp .env.example .env
# edit .env to set COUPLE_NAMES, WEDDING_DATE, and MONGODB_URI
```

3. Place your hero image at `public/images/hero.jpg` (we've created the folder). Use a large, wide image.

4. Start MongoDB (use Docker or local service). Example using Docker:

```bash
docker run -d --name mongo -p 27017:27017 -v "$PWD/mongo-data":/data/db mongo:7
```

5. Run the dev server

```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

- `src/server.js` — Express app and routes
- `src/models/Rsvp.js` — Mongoose model for RSVP
- `src/tabs/rsvp.js` — RSVP routes (GET form, POST submit)
- `views/` — EJS views and partials
- `public/` — Static assets (CSS, images, JS)

### Gallery images

Place any number of images inside `public/images/gallery/` (jpg, jpeg, png, gif, webp, avif). The gallery page automatically lists them and applies a subtle rotate-in effect on scroll.

### Proposal Gallery images

- Background image: save as `public/images/proposal-bg.jpg` (or .jpeg/.png/.webp/.avif/.gif). Alternatively, put `proposal-bg.*` inside `public/images/proposal/`.
- Grid photos: place in `public/images/proposal/`. Filenames can be anything.

## Notes

- Update navigation labels/links in `views/partials/nav.ejs` if you prefer different casing.
- Edit copy on each page under `views/`.
- To view RSVPs in MongoDB shell: connect to the DB and inspect the `rsvps` collection.
>>>>>>> 640928f (Initial Wesbite Design)
