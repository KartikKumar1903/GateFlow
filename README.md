# GATE CSE Adaptive Planner

A MERN-stack study planner for GATE CSE aspirants with:

- Adaptive day scheduling based on comfort slots, coverage, difficulty, favorite subjects, and backlog urgency.
- Backlog tracking that automatically raises priority for missed work.
- A feedback loop that classifies reasons for incomplete tasks and changes the next plan.
- PYQ manager for year-wise and subject-wise practice.
- A calm, focused React interface designed for daily study use.

## Project Structure

```text
client/   React + Vite UI
server/   Express + MongoDB API
```

## Run Locally

Install dependencies from the repo root:

```bash
npm install
```

Create `server/.env`:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/gate-planner
PORT=5000
```

Start both apps:

```bash
npm run dev
```

The client runs on `http://localhost:5173` and the API runs on `http://localhost:5000`.
