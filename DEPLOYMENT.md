# AWS deployment
1. Create an EC2 instance using the smallest practical eligible instance for your account/region; verify current Free Tier/credits and pricing before launch.
2. Install Node.js and clone/copy `backend`.
3. Create DynamoDB tables `QuizRooms`, `QuizPlayers`, `QuizResults` with the keys used by the application.
4. Set backend environment variables: `DB_MODE=dynamodb`, `AWS_REGION`, table names, `CORS_ORIGIN`.
5. Run `npm install && npm start` on EC2. Allow TCP 3000 only as needed for testing; restrict SSH to your IP.
6. In frontend `.env`, set `VITE_SOCKET_URL=http://<EC2-public-ip>:3000`, run `npm install && npm run build`.
7. Create an S3 bucket configured for static website hosting as appropriate for your account, and upload `frontend/dist`.
8. Test `/health`, host/player functionality, then run experiments.
9. After experiments, stop/terminate EC2 and remove unused S3/DynamoDB resources to control cost. Check AWS Billing/Cost Management.
