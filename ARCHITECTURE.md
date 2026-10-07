# Architecture
Local: React/Vite -> Node/Express/Socket.IO -> SQLite.
AWS: S3 React frontend -> EC2 Node/Express/Socket.IO -> DynamoDB.
The server is authoritative for room state, questions, timers and scores. Correct answers never enter the player question payload.
