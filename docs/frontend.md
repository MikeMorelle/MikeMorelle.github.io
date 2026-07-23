# Frontend Dashboard – Setup Guide

This manual explains how to set up, run, and deploy the React frontend for the edge computing monitoring system. The dashboard displays threat events, a map, system health, and connects to the backend API.

---

## Table of Contents

- [What the Frontend Does](#what-the-frontend-does)
- [Requirements](#requirements)
- [Local Setup (Development)](#local-setup-development)
- [Connecting to the Backend](#connecting-to-the-backend)
- [Docker Deployment](#docker-deployment)
- [Kubernetes (k3s) Deployment](#kubernetes-k3s-deployment)
- [Project Files Overview](#project-files-overview)
- [Troubleshooting](#troubleshooting)
- [Verification](#verification)
- [References](#references)

---

## What the Frontend Does

The dashboard shows everything happening in the edge monitoring system:

| Feature           | What It Shows                                 |
|-------------------|-----------------------------------------------|
| Dashboard         | Event statistics, map, event log              |
| Events page       | Full list of all detected events with filters |
| Map view          | Event locations on an interactive map         |
| Cameras page      | Connected sensor nodes and their status       |
| Settings          | Backend URL, refresh rate, theme toggle       |
| Notification bell | Last 5 events with new event badge            |
| System health     | Node connection status                        |

---

## Requirements

**On your computer**

- Node.js 18 or later
- npm (comes with Node.js)

**For deployment**

- Docker (for container testing)
- kubectl (for k3s deployment)

**Note:** The backend must already be running at `http://<ip>:8000`, since the dashboard retrieves all data from it.

The dashboard is supported on Google Chrome and Microsoft Edge (desktop).

---

## Local Setup (Development)

### 1. Clone the repository

```bash
git clone https://github.com/MikeMorelle/MikeMorelle.github.io.git
cd MikeMorelle.github.io/code/Frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
PORT=3001 npm start
```

**Why port 3001?** Grafana already uses port 3000 on the Raspberry Pi.

### 4. Open the dashboard

Open your browser and go to:

```
http://localhost:3001
```

> **Screenshot:** Dashboard main page with stats, event log, and map

<img width="1423" height="737" alt="Screenshot 2026-07-16 at 12 49 49" src="https://github.com/user-attachments/assets/16692584-3009-4adf-a20b-ec268f60ad1d" />


---

## Connecting to the Backend

1. Open **Settings** from the sidebar.
2. Enter the backend URL.

**Examples**

- Local development: `http://localhost:8000`
- Raspberry Pi (live system): `http://100.95.198.3:8000`

3. Click **Test Connection**.

If successful, the dashboard displays:

```
✅ Backend connected!
```

The frontend checks the backend every 30 seconds by default. This interval can be changed in Settings.

> **Screenshot:** Settings page with Test Connection success

<img width="1423" height="737" alt="Screenshot 2026-07-16 at 12 50 01" src="https://github.com/user-attachments/assets/748b1edb-f282-479f-95d3-58a522204f4d" />


### Example API requests

```bash
curl http://100.95.198.3:8000/health
curl http://100.95.198.3:8000/events/
```

---

## Docker Deployment

### 1. Build and start

```bash
docker compose up -d --build
```

The dashboard becomes available at:

```
http://100.95.198.3:3001
```

### 2. Stop the containers

```bash
docker compose down
```

### What Docker does

- Builds the React application into static files.
- Uses Nginx to serve the files.
- Maps port 3001 on the host to port 80 inside the container.
- Injects the backend URL at build time via a build argument (see `docker-compose.yml`).

### nginx.conf

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> **Screenshot:** Docker Desktop showing `docker ps` output on the master node

<img width="1435" height="238" alt="Screenshot 2026-07-16 at 12 56 51" src="https://github.com/user-attachments/assets/6758d7c0-13ba-4735-bd4a-f5f41ddd0114" />


---

## Kubernetes (k3s) Deployment

**Current status (July 2026):** The k3s cluster was not yet available on the master node, so the manifests below have been prepared and tested locally with Rancher Desktop. When the cluster is operational, the frontend can be deployed with the following steps.

The `k8s-deployment.yaml` file creates:

- A **Deployment** with 2 frontend replicas
- A **Service** exposed on NodePort 30081
- An **Ingress** for routing traffic

### Port configuration

| Component              | Port                  |
|------------------------|-----------------------|
| Backend NodePort       | 30080                 |
| Frontend NodePort      | 30081                 |
| Backend inside cluster | `http://backend:8000` |

### 1. Deploy

```bash
kubectl apply -f k8s-deployment.yaml
```

> **Screenshot:** Terminal output showing the deployment and service creation (from Rancher Desktop test)

<img width="1435" height="149" alt="Screenshot 2026-07-16 at 13 19 50" src="https://github.com/user-attachments/assets/0565f5c6-890f-46e1-8cc8-af53b5a029e1" />


### 2. Verify the pods

```bash
kubectl get pods -l app=frontend
```

> **Screenshot:** Expected output `kubectl get pods` showing 2 frontend pods with status of `Running`  (from Rancher Desktop test)

<img width="1435" height="149" alt="Screenshot 2026-07-16 at 13 22 02" src="https://github.com/user-attachments/assets/25202821-a897-476d-bd86-9efafba3b4cc" />


### 3. Access the dashboard

```
http://<node-ip>:30081
```

> **Screenshot:** Browser window showing the dashboard loaded on `localhost:30081` (from Rancher Desktop test)

<img width="1435" height="820" alt="Screenshot 2026-07-16 at 13 23 35" src="https://github.com/user-attachments/assets/e132de35-20fd-41d4-ab23-f599f84730cc" />


---

## Project Files Overview

```
Frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx          # Main dashboard
│   │   ├── Sidebar.jsx            # Navigation
│   │   ├── EventLog.jsx           # Event list
│   │   ├── EventCard.jsx          # Individual event
│   │   ├── EventMap.jsx           # Interactive map
│   │   ├── StatsCards.jsx         # Statistics
│   │   ├── SystemHealth.jsx       # Node status
│   │   └── NotificationBell.jsx   # Recent events
│   ├── hooks/
│   │   └── useApi.js              # Polling logic
│   ├── services/
│   │   └── api.js                 # Backend API
│   ├── styles/
│   │   └── dashboard.css          # Styling
│   ├── App.js
│   └── index.js
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── k8s-deployment.yaml
└── package.json
```

---

## Troubleshooting

| Problem                                 | Cause                                               | Fix                                                                                                                 |
|-----------------------------------------|-----------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| Frontend shows blank page on first load | Old localStorage value overrides the backend URL    | Open an incognito window or clear browser storage for the dashboard URL.                                            |
| Port 3000 already in use                | Grafana uses port 3000                              | The frontend uses port 3001 for development and Docker, avoiding the conflict.                                      |
| Map always empty                        | Backend does not provide lat/lng fields             | Added an empty-state message in the UI; the backend team has been asked to add location data.                       |
| System Health shows no CPU/memory       | Backend `/nodes/` endpoint only returns name/status | The dashboard displays what is available; CPU/memory bars are placeholders until the backend provides such metrics. |

---

## Verification
(Under Process)
1. Start the backend on `localhost:8000` (or confirm it is running on the master node at `100.95.198.3:8000`).
2. Start the frontend (dev or Docker) and open the appropriate URL.
3. Open **Settings** → **Test Connection**.

You should see:

```
✅ Backend connected!
```

4. Create a test event:

```bash
curl -X POST http://100.95.198.3:8000/events/ \
  -F "event_type=intrusion" \
  -F "node_id=cam-1" \
  -F "file=@/tmp/test-image.png"
```

5. Refresh the dashboard – the event should appear within 30 seconds.
6. Open the **Cameras** page to verify node registration.

> **Insert screenshot:** Dashboard showing a real event, map, and stats
> **Insert screenshot:** Cameras page with registered nodes

---

## References

- [React](https://react.dev)
- [Docker](https://docs.docker.com)
- [Kubernetes](https://kubernetes.io/docs)
- [k3s](https://docs.k3s.io)
- [Leaflet](https://leafletjs.com)
- [Nginx](https://nginx.org/en/docs/)
