# lol-tracker-gordos-frontend

A League of Legends match tracker frontend application built with Next.js and TypeScript.

## Features

- View recent match history from MongoDB database
- Display detailed player statistics
- Responsive design with dark theme
- Real-time data fetching

## MongoDB Configuration

To connect to your MongoDB database, create a `.env.local` file in the root directory with the following variables:

```env
MONGODB_HOST=your_mongodb_host
MONGODB_PORT=27017
MONGODB_USERNAME=your_username
MONGODB_PASSWORD=your_password
MONGODB_DATABASE=lol_tracker
```

## Database Schema

The application expects a MongoDB collection called `matches` with the following schema:

```javascript
{
  "match_id": "NA1_1234567890",
  "timestamp": "2025-07-22T00:00:00.000Z",
  "num_tracked_summoners": 3,
  "game_duration_seconds": 1800,
  "game_mode_id": 450,
  "queue_id": 420,
  "teams": [
    {
      "team_id": 100,
      "win": true,
      "objectives": { /* objectives data */ },
      "bans": [{"champion_id": 157}]
    }
  ],
  "players": [
    {
      "match_id": "NA1_1234567890",
      "puuid": "example-puuid-123",
      "summoner_name": "CoolGuy123",
      "real_name": "John Doe",
      "champion_name": "Ahri",
      "champion_id": 103,
      "kills": 10,
      "deaths": 2,
      "assists": 8,
      "position": "mid",
      "gold_earned": 14500,
      "total_dmg_dealt": 20000,
      "mvp_score": 2.7,
      "team_id": 100
      // ... other player fields
    }
  ]
}
```

## Installation

1. Install dependencies:
```bash
npm install
# or
pnpm install
```

2. Create `.env.local` file with your MongoDB configuration

3. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

