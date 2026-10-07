# Cloud-Based Real-Time Multiplayer Quiz Platform

Minimal research prototype for evaluating concurrent-user performance of an AWS-hosted Socket.IO quiz.

## Local
1. `cd backend && npm install && cp .env.example .env && npm run dev`
2. In another terminal: `cd frontend && npm install && cp .env.example .env && npm run dev`
3. Open `http://localhost:5173`.
4. Test Host + 2 players, then 5 players.

## Load test
`cd load-test && npm install && node runner.js 10` (repeat for 25, 50, 100). The current runner records answer acknowledgement timing and errors; use the results as experimental data only, never as fabricated values.

## AWS
Set backend `DB_MODE=dynamodb`, configure the three DynamoDB tables, deploy Node.js to EC2, then build the frontend with `VITE_SOCKET_URL=<EC2 URL>` and upload `frontend/dist` to S3. See DEPLOYMENT.md.
