# ChamaPesa

Smart chama (savings group) manager for Kenya. Automates M-Pesa collections, rotating payouts, goal-based savings pools, loan management, and anonymous voting.

## Requirements

- Node.js 22+
- Docker & Docker Compose
- ngrok (for M-Pesa callbacks)

## Installation

```bash
# 1. Clone and install dependencies
cd backend && npm install
cd ../dashboard && npm install

# 2. Start PostgreSQL
cd .. && docker-compose up -d

# 3. Push database schema
cd backend && npx prisma db push

# 4. Seed demo data (optional)
npm run seed
```

## Configuration

Copy `.env.example` to `.env` in the `backend/` folder and fill in:

```env
DATABASE_URL="postgresql://chamapesa:chamapesa@localhost:5432/chamapesa"
JWT_SECRET="change-this"

MPESA_CONSUMER_KEY="..."
MPESA_CONSUMER_SECRET="..."
MPESA_PASSKEY="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
MPESA_SHORTCODE="174379"
MPESA_ENV="sandbox"
MPESA_CALLBACK_URL="https://your-ngrok-url/api/mpesa/callback"
```

Get Daraja credentials at [developer.safaricom.co.ke](https://developer.safaricom.co.ke).

## Running

```bash
# Terminal 1 — expose backend for M-Pesa callbacks
ngrok http 3000

# Terminal 2 — backend API
cd backend && npm run dev

# Terminal 3 — dashboard
cd dashboard && npm run dev
```

- Backend: http://localhost:3000
- Dashboard: http://localhost:3001
- Landing page: http://localhost:3001/landing

## Demo credentials (after seeding)

| Name | Phone | PIN | Role |
|------|-------|-----|------|
| Amina Wanjiku | 0712345678 | 1234 | Admin |
| Brian Otieno | 0723456789 | 1234 | Treasurer |
| Cynthia Muthoni | 0734567890 | 1234 | Member |

## API

Health check: `GET /health`

See [PROGRESS.md](./PROGRESS.md) for full API reference.
