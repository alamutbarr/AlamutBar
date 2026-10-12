# Xbar Driver Backend

Backend Node.js (Express + TypeScript) for the Xbar Driver Panel.

## API Endpoints

### Auth
- `POST /auth/request-otp` — `{ mobile }` → sends OTP code
- `POST /auth/verify-otp` — `{ mobile, code }` → `{ token, session }`

### Driver (requires `Authorization: Bearer <token>`)
- `GET /driver/profile` — driver info
- `GET /driver/vehicles` — driver's vehicles

### Missions (requires `Authorization: Bearer <token>`)
- `GET /driver/missions?status=offered|active|history` — list missions
- `GET /driver/missions/:id` — mission detail
- `POST /driver/missions/:id/accept` — accept offered mission
- `POST /driver/missions/:id/decline` — decline offered mission
- `POST /driver/missions/:id/arrive-pickup` — arrived at pickup
- `POST /driver/missions/:id/start-move` — start moving
- `POST /driver/missions/:id/near-destination` — near destination
- `POST /driver/missions/:id/gps/batch` — `{ points: [{lat,lng,ts,accuracy,speed,heading}] }` — batch GPS upload
- `GET /driver/missions/:id/gps/status` — GPS status
- `POST /driver/missions/:id/pod/request-otp` — request delivery OTP
- `POST /driver/missions/:id/pod/upload-photos` — `{ photos: [...] }` (min 3)
- `POST /driver/missions/:id/pod/verify-otp` — `{ code }` — verify delivery OTP
- `POST /driver/missions/:id/pod/otp-not-received` — `{ reason }` — exception path
- `POST /driver/missions/:id/events/log` — `{ type, payload }` — log event
- `GET /driver/missions/:id/events` — event log for mission

### Support
- `GET /support/operator-phone` — operator contact info

## Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Security Notes
- Destination exact address is hidden (`visibleDestinationExact=false`) until `WaybillIssued` status
- OTP rate-limited (3 requests/minute)
- JWT-based auth with 7-day expiry (per spec: no short session expiry for drivers)
- Mission state machine enforced server-side
- POD requires minimum 3 photos + OTP verification
