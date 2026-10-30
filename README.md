# Cloud Quiz: Cloud-Based Real-Time Multiplayer Quiz Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v22.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18.x-61dafb.svg)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.x-black.svg)](https://socket.io/)
[![Deployment](https://img.shields.io/badge/Render-Deployed-purple.svg)](https://render.com/)

An interactive, high-concurrency real-time multiplayer quiz engine designed for classroom assessment, gamified learning, and audience engagement. Built with a decoupled architecture utilizing **React/Vite**, **Node.js/Express**, **Socket.IO**, and an embedded **SQLite** data store, deployed seamlessly on **Render**.

This platform was rigorously benchmarked and evaluated as part of an academic research paper examining low-latency full-duplex state synchronization and tail-latency characteristics under concurrent load ($N = 1$ to $25$ concurrent players).

---

## Key Features

- **Real-Time State Synchronization**: Synchronized question delivery, timer synchronization, score updates, and live leaderboards via persistent WebSockets (Socket.IO).
- **Session Room Isolation**: Dynamic 6-character room code generation enabling hosts to isolate multiple concurrent quiz sessions.
- **Low-Latency Transaction ACKs**: Immediate answer submission acknowledgments with instant database logging.
- **Decoupled Architecture**: Independent frontend (React + Vite) and backend (Node.js + Express) microservices for modular cloud deployment.
- **Automated Load Profiling Integration**: Built-in headless runner hooks designed for benchmarking $p_{50}$ and $p_{95}$ acknowledgment latencies.

---

## 🚀 Live Demo

Experience the platform live:
* **Frontend App:** [https://your-frontend-url.onrender.com](https://your-frontend-url.onrender.com)
* **Backend API / Socket Endpoint:** [https://your-backend-url.onrender.com](https://your-backend-url.onrender.com)

> **Note:** Because the backend is hosted on a free Render tier instance, it may take ~50 seconds to spin up if it has been inactive[cite: 16].

---

## Technical Architecture & Methodology

```text
+-------------------+           WebSocket / Socket.IO          +-----------------------+
|  Host & Player    | <======================================> |   Node.js / Express   |
|  React/Vite Web   |           Full-Duplex Events             |     Backend Engine    |
+-------------------+                                          +-----------------------+
                                                                           |
                                                                  Synchronous Writes
                                                                           v
                                                               +-----------------------+
                                                               |   Embedded SQLite DB  |
                                                               +-----------------------+

