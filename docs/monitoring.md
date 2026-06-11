# Prometheus & Grafana Monitoring Setup

This manual provides a guide for setting up:

- Prometheus
- Grafana
- Prometheus Node Exporter

The Master Node runs Prometheus and Grafana, whereas the Worker Nodes run the Prometheus Node Exporter.
The components and their purposes are displayed below:

| Component     | Purpose                         |
|---------------|---------------------------------|
| Prometheus    | Collects and stores metrics     |
| Grafana       | Visualizes collected metrics    |
| Node Exporter | Exposes hardware and OS metrics |

---

## Table of Contents
- [Requirements](#requirements)
- [Prometheus Installation](#prometheus-installation)
- [Grafana Installation](#grafana-installation)
- [Node Exporter Installation](#node-exporter-installation)
- [Prometheus Configuration](#prometheus-configuration)
- [Dashboard Configuration](#dashboard-configuration)
- [Grafana Setup](#grafana-setup)
- [Verification](#verification)
- [References](#references)

---

# Requirements

The following requirements need to be met on the Master node and on the worker nodes to set up everything:

1. Master Node
   - Raspberry Pi OS
   - Internet connection
   - SSH access to remote nodes


2. Raspberry Pi Worker Nodes
   - Raspberry Pi OS
   - SSH enabled
   - User `username` configured

---

# Prometheus Installation

1. Update the system packages:

```bash
sudo apt update && sudo apt upgrade -y
```

2. Install Prometheus:

```bash
sudo apt install prometheus
```

Check the Prometheus service status:

```bash
systemctl status prometheus
```

Allow Prometheus through the firewall:

```bash
sudo ufw allow 9090
```

The Prometheus Web Interface can be accessed at:

```text
http://<master-ip>:9090
```

---

# Grafana Installation

1. Create the keyring directory:

```bash
sudo mkdir -p /etc/apt/keyrings/
```

2. Import the Grafana GPG key:

```bash
sudo wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null
```

3. Add the Grafana repository:

```bash
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list
```

4. Update the package index:

```bash
sudo apt update
```

5. Install Grafana:

```bash
sudo apt install grafana
```

6. Enable and start the Grafana service:

```bash
sudo systemctl daemon-reload
```

```bash
sudo systemctl enable grafana-server
```

```bash
sudo systemctl start grafana-server
```

7. Check the Grafana service status:

```bash
sudo systemctl status grafana-server
```

The Grafana Web Interface can be accessed at:

```text
http://<master-ip>:3000
```

Default login credentials:

| Username | Password |
|----------|----------|
| admin    | admin    |

> Note: A prompt will appear on the first login, which asks to change the default password.

---

# Node Exporter Installation

To monitor remote systems, the Prometheus Node Exporter must be installed on every worker node.

1. Install the package:

```bash
sudo apt install prometheus-node-exporter
```

2. Enable and start the service:

```bash
sudo systemctl enable --now prometheus-node-exporter
```

3. Verify the service:

```bash
systemctl status prometheus-node-exporter
```

The Metrics endpoint can be accessed at:

```text
http://<worker-ip>:9100/metrics
```

---

# Prometheus Configuration

To monitor the exporters, the Prometheus configuration file on the master node needs to be updated.

1. Open the configuration file:

```bash
sudo nano /etc/prometheus/prometheus.yml
```

Example configuration:

```yaml
scrape_configs:
  - job_name: 'node-worker1'
    static_configs:
      - targets: ['worker-ip1:9100']

  - job_name: 'node-worker2'
    static_configs:
      - targets: ['worker-ip2:9100']

  - job_name: 'node-worker3'
    static_configs:
      - targets: ['worker-ip3:9100']
```

Restart Prometheus after editing:

```bash
sudo systemctl restart prometheus
```

---

# Grafana Setup

1. Add a Data Source:

```text
Connections -> Data Sources -> Add new Data Source
```

2. Select `Prometheus` as a Data Source:


3. Afterward, configure the URL:

```text
http://localhost:9090
```

4. Save and test the connection.

---

# Dashboard Configuration

The recommended dashboard ID is the following:
```text
1860
```

To import the dashboard, the following steps need to be performed:

1. Got to Dashboards
2. Click on New and select Import
3. Enter the Dashboard ID
4. Select the Prometheus Data Source
5. Import

---

# Verification

After all the steps have been carried out, the verification step needs to be performed to ensure that everything is working properly. Therefore, open the following link:

```text
http://master-ip:9090/classic/targets
```

If everything is working properly, the nodes should appear in the list and the status should be:

```text
UP
```

--- 
# References

- Prometheus Documentation: https://prometheus.io
- Grafana Documentation: https://grafana.com
- Prometheus Node Exporter Documentation: https://prometheus.io/docs/guides/node-exporter/