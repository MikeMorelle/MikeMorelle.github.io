# Raspberry Pi MPI Cluster Performance

---

This documentation describes the MPI configuration, benchmark applications, measurement methodology, and scalability analysis of the Raspberry Pi compute cluster.

The underlying cluster infrastructure — including DHCP, TFTP, NFS, network boot, storage, Internet routing, and remote access through Tailscale — is documented separately in the **Cluster Infrastructure and Remote Access** documentation.

This document focuses specifically on:

- OpenMPI installation and configuration,
- passwordless SSH required for distributed MPI execution,
- MPI process distribution,
- Monte Carlo π,
- distributed matrix multiplication,
- High Performance LINPACK (HPL),
- automated benchmark collection,
- strong scaling according to Amdahl's Law,
- scaled workload experiments according to Gustafson's Law,
- speedup and efficiency,
- communication and memory bottlenecks.

---

## Table of Contents

- [1. MPI Test Environment](#1-mpi-test-environment)
- [2. MPI Configuration](#2-mpi-configuration)
- [3. MPI Benchmark Applications](#3-mpi-benchmark-applications)
- [4. Benchmark Automation and HPL](#4-benchmark-automation-and-hpl)
- [5. Experimental Methodology and Scalability](#5-experimental-methodology-and-scalability)
- [6. Results and Bottleneck Analysis](#6-results-and-bottleneck-analysis)
- [7. Conclusion](#7-conclusion)
- [References](#references)

---

# 1. MPI Test Environment

The MPI and HPL experiments were executed on the existing Raspberry Pi compute cluster.

For the performance experiments, the relevant hardware configuration is:

| Property | Configuration |
|---|---|
| Head Node | Raspberry Pi 5 |
| Compute Workers | 8 × Raspberry Pi 3 Model B v1.2 |
| Operating System | Debian 13 (Trixie) |
| Architecture | ARM64 / aarch64 |
| Worker Nodes | `rpi1` to `rpi8` |
| Internal Network | `192.168.50.0/24` |
| MPI Interface | `eth0` |

The Raspberry Pi 5 is primarily used for:

- cluster administration,
- compilation,
- starting distributed jobs,
- collecting benchmark results.

The final scalability measurements use the Raspberry Pi 3 Worker Nodes as the compute resources.

This distinction is important because the Raspberry Pi 5 provides significantly more computational performance than the Raspberry Pi 3 systems. Mixing both hardware generations in the final scaling measurements would make the comparison between 1, 2, 4, and 8 workers less consistent.

MPI communication between the Worker Nodes uses the physical Ethernet interface:

```text
eth0
```

The configuration of the underlying private network is part of the separate infrastructure documentation and is therefore not repeated here.

---

# 2. MPI Configuration

## 2.1 Passwordless SSH

OpenMPI starts processes on remote Worker Nodes through SSH.

Passwordless SSH authentication was therefore configured between the Head Node and all Worker Nodes.

Generate an SSH key on the Head Node:

```bash
ssh-keygen -t ed25519
```

Copy the public key to all workers:

```bash
ssh-copy-id pi@rpi1
ssh-copy-id pi@rpi2
ssh-copy-id pi@rpi3
ssh-copy-id pi@rpi4
ssh-copy-id pi@rpi5
ssh-copy-id pi@rpi6
ssh-copy-id pi@rpi7
ssh-copy-id pi@rpi8
```

The SSH configuration is stored in:

```text
~/.ssh/config
```

Configuration:

```text
Host rpi1 rpi2 rpi3 rpi4 rpi5 rpi6 rpi7 rpi8
    User pi
    IdentityFile ~/.ssh/id_ed25519
```

Set the required permissions:

```bash
chmod 600 ~/.ssh/config
```

Verify connectivity:

```bash
for NODE in rpi1 rpi2 rpi3 rpi4 rpi5 rpi6 rpi7 rpi8
do
    ssh pi@$NODE hostname
done
```

Every Worker Node should return its hostname without requesting a password.

This is required so that MPI processes can be started automatically without interactive authentication.

---

## 2.2 OpenMPI Installation

OpenMPI was installed on the Head Node:

```bash
sudo apt update
sudo apt install -y openmpi-bin libopenmpi-dev
```

The same packages were installed on all Worker Nodes:

```bash
for NODE in rpi1 rpi2 rpi3 rpi4 rpi5 rpi6 rpi7 rpi8
do
    ssh -t pi@$NODE \
      "sudo apt install -y openmpi-bin libopenmpi-dev"
done
```

Verify the local installation:

```bash
mpirun --version
mpicc --version
```

Verify OpenMPI on all workers:

```bash
for NODE in rpi1 rpi2 rpi3 rpi4 rpi5 rpi6 rpi7 rpi8
do
    ssh pi@$NODE "mpirun --version | head -n 1"
done
```

The documented cluster installation used:

```text
Open MPI 5.0.7
```

---

## 2.3 MPI Hostfile

The MPI hostfile specifies which Worker Nodes may participate in distributed jobs.

The file is located at:

```text
/home/cloud-computing/hosts
```

Content:

```text
rpi1 slots=1
rpi2 slots=1
rpi3 slots=1
rpi4 slots=1
rpi5 slots=1
rpi6 slots=1
rpi7 slots=1
rpi8 slots=1
```

Each Worker Node provides one MPI slot.

Verify that all workers can be reached:

```bash
mpirun \
  --hostfile /home/cloud-computing/hosts \
  -np 8 \
  hostname
```

A successful execution returns the hostnames of the participating workers.

---

## 2.4 MPI Verification Program

Before running the benchmark applications, a small MPI test program was used to verify distributed execution.

File:

```text
hello_mpi.c
```

Source:

```c
#include <mpi.h>
#include <stdio.h>

int main(int argc, char** argv)
{
    MPI_Init(&argc, &argv);

    int rank;
    int size;

    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);

    char processor_name[MPI_MAX_PROCESSOR_NAME];
    int name_len;

    MPI_Get_processor_name(processor_name, &name_len);

    printf(
        "Hello from rank %d out of %d running on %s\n",
        rank,
        size,
        processor_name
    );

    MPI_Finalize();

    return 0;
}
```

Compile:

```bash
mpicc hello_mpi.c -o hello_mpi
```

Copy the executable to all Worker Nodes:

```bash
for NODE in rpi1 rpi2 rpi3 rpi4 rpi5 rpi6 rpi7 rpi8
do
    scp hello_mpi $NODE:/home/pi/
done
```

Execute:

```bash
mpirun \
  --hostfile /home/cloud-computing/hosts \
  -np 8 \
  /home/pi/hello_mpi
```

Each MPI rank reports the physical Raspberry Pi on which it is running.

This verifies:

- SSH communication,
- OpenMPI installation,
- remote process startup,
- MPI rank distribution,
- communication between physical nodes.

---

## 2.5 Locale Configuration

Remote MPI processes initially produced locale warnings such as:

```text
bash: warning: setlocale:
LC_ALL: cannot change locale (en_US.UTF-8)
```

The existing locale configuration was checked using:

```bash
locale
locale -a
```

If required, `en_US.UTF-8` was enabled:

```bash
sudo sed -i \
  's/^# *en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' \
  /etc/locale.gen
```

Generate the locale:

```bash
sudo locale-gen
```

Set the default language:

```bash
sudo env -u LC_ALL \
  update-locale LANG=en_US.UTF-8
```

`LC_ALL` was intentionally not configured permanently because it overrides the remaining locale configuration.

The benchmark scripts therefore use:

```bash
export LANG=en_US.UTF-8
unset LC_ALL
```

---

## 2.6 OpenMPI SSH Warning

During MPI startup, the following warning occurred:

```text
plm:ssh: Warning:
setpgid(...) failed in parent
with errno=Permission denied(13)
```

The MPI applications still executed, but the warning generated unnecessary output in the benchmark logs.

The following OpenMPI MCA option was used:

```bash
--mca plm_rsh_no_tree_spawn 1
```

This setting was later included in the permanent OpenMPI configuration.

---

## 2.7 OpenMPI Network Interface Selection

The Head Node contains several network interfaces.

During debugging, the system included interfaces such as:

```text
lo
eth0
wlan0
tailscale0
docker_gwbridge
docker0
veth...
```

After a restart, basic MPI commands such as:

```bash
mpirun \
  --hostfile /home/cloud-computing/hosts \
  -np 8 \
  hostname
```

still succeeded.

However, actual MPI applications failed with errors such as:

```text
WARNING: Open MPI failed to TCP connect to a peer MPI process.

connect() to 172.17.0.1:1025 failed
Error: Connection refused (111)
```

The available interfaces were inspected using:

```bash
ip -br addr
```

The address:

```text
172.17.0.1
```

belonged to a Docker network.

The intended MPI communication interface is:

```text
eth0
```

OpenMPI was therefore explicitly restricted to this interface:

```bash
--mca btl_tcp_if_include eth0
--mca oob_tcp_if_include eth0
```

A test execution used:

```bash
mpirun \
  --mca plm_rsh_no_tree_spawn 1 \
  --mca btl_tcp_if_include eth0 \
  --mca oob_tcp_if_include eth0 \
  --hostfile /home/cloud-computing/hosts \
  -np 8 \
  /home/pi/montecarlo_pi \
  10000 \
  "test"
```

After successful verification, the settings were stored permanently.

Create the configuration directory:

```bash
mkdir -p ~/.openmpi
```

Configuration file:

```text
/home/cloud-computing/.openmpi/mca-params.conf
```

Content:

```text
plm_rsh_no_tree_spawn = 1
btl_tcp_if_include = eth0
oob_tcp_if_include = eth0
```

This prevents OpenMPI from selecting unrelated interfaces such as Docker, WLAN, or Tailscale for communication between the compute nodes.

---

# 3. MPI Benchmark Applications

Two MPI applications with different parallel characteristics were selected.

| Property | Monte Carlo π | Matrix Multiplication |
|---|---|---|
| Independent calculations | Very high | Lower |
| Communication overhead | Very low | Higher |
| Network dependency | Low | Higher |
| Memory dependency | Low | High |
| Expected scalability | Close to linear | More limited |
| Purpose | Highly parallel reference workload | Communication- and memory-intensive workload |

The combination of both applications allows the scalability of the cluster to be evaluated under different computational conditions.

---

## 3.1 Monte Carlo π

The first MPI application estimates π using the Monte Carlo method.

Random points are generated inside a square.

A point is inside the unit circle if:

```text
x² + y² <= 1
```

The approximation is calculated using:

```text
π ≈ 4 × points_inside / total_points
```

Individual random points can be evaluated independently.

The total number of points can therefore be divided across MPI processes with very little communication.

Only the final partial results must be combined using:

```text
MPI_Reduce
```

This makes Monte Carlo an almost embarrassingly parallel workload.

The program was adapted for automated benchmarking.

Source:

```c
#include <mpi.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int main(int argc, char** argv)
{
    MPI_Init(&argc, &argv);

    int rank;
    int size;

    long long total_points = 100000000;
    long long local_points;
    long long remainder;

    long long local_inside = 0;
    long long global_inside = 0;

    const char* timestamp = "unknown";

    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);

    if (argc > 1)
    {
        total_points = atoll(argv[1]);
    }

    if (argc > 2)
    {
        timestamp = argv[2];
    }

    local_points = total_points / size;
    remainder = total_points % size;

    if (rank < remainder)
    {
        local_points++;
    }

    unsigned int seed =
        time(NULL) + rank * 1337;

    double start = MPI_Wtime();

    for (long long i = 0; i < local_points; i++)
    {
        double x =
            (double)rand_r(&seed) / RAND_MAX;

        double y =
            (double)rand_r(&seed) / RAND_MAX;

        if (x * x + y * y <= 1.0)
        {
            local_inside++;
        }
    }

    MPI_Reduce(
        &local_inside,
        &global_inside,
        1,
        MPI_LONG_LONG,
        MPI_SUM,
        0,
        MPI_COMM_WORLD
    );

    double end = MPI_Wtime();

    if (rank == 0)
    {
        double pi =
            4.0 * global_inside / total_points;

        double runtime = end - start;

        printf(
            "%d,%lld,%.10f,%.6f,%s\n",
            size,
            total_points,
            pi,
            runtime,
            timestamp
        );
    }

    MPI_Finalize();

    return 0;
}
```

Compile:

```bash
mpicc montecarlo.c \
  -o /home/pi/montecarlo_pi
```

Example execution:

```bash
mpirun \
  --mca plm_rsh_no_tree_spawn 1 \
  --mca btl_tcp_if_include eth0 \
  --mca oob_tcp_if_include eth0 \
  --hostfile /home/cloud-computing/hosts \
  -np 8 \
  /home/pi/montecarlo_pi \
  10000000 \
  "test"
```

Only rank 0 outputs the final result, producing one CSV-compatible record per run.

---

## 3.2 Matrix Multiplication

The second MPI application performs distributed matrix multiplication.

Source file:

```text
mpi_matrix_mul.c
```

Compile:

```bash
mpicc \
  mpi_matrix_mul.c \
  -o /home/pi/mpi_matrix_mul
```

Example execution:

```bash
mpirun \
  --mca plm_rsh_no_tree_spawn 1 \
  --mca btl_tcp_if_include eth0 \
  --mca oob_tcp_if_include eth0 \
  --hostfile /home/cloud-computing/hosts \
  -np 4 \
  /home/pi/mpi_matrix_mul \
  800
```

Unlike Monte Carlo, distributed matrix multiplication requires significantly more communication and memory access.

Collective MPI operations used by the application include:

```text
MPI_Bcast
MPI_Scatter
MPI_Gather
```

The application is therefore influenced by:

- communication,
- synchronization,
- memory bandwidth,
- cache behavior,
- data distribution.

This makes matrix multiplication a useful counterpart to the highly parallel Monte Carlo workload.

---

## 3.3 Benchmark Comparison

The expected behavior of the two applications is different.

Monte Carlo performs almost all calculations locally and requires only a small final communication step.

Matrix multiplication moves significantly more data between processes.

The expected result is therefore:

```text
Monte Carlo:
high parallel efficiency

Matrix Multiplication:
lower efficiency due to communication and memory overhead
```

The final measurements confirm this difference.

---

# 4. Benchmark Automation and HPL

## 4.1 Automated Monte Carlo Benchmarking

The Monte Carlo application was initially used for automated benchmark collection.

The automated series tested:

```text
MPI processes:
1, 2, 4, 8
```

and:

```text
Point counts:
10,000
100,000
1,000,000
10,000,000
```

Each series therefore contained:

```text
4 process counts × 4 point counts = 16 executions
```

The benchmark script is located at:

```text
/home/cloud-computing/run_montecarlo_benchmark.sh
```

Script:

```bash
#!/bin/bash

export LANG=en_US.UTF-8
unset LC_ALL

export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin

HOSTFILE="/home/cloud-computing/hosts"
PROGRAM="/home/pi/montecarlo_pi"

LOGDIR="/home/cloud-computing/benchmarks"
CSVFILE="$LOGDIR/montecarlo_benchmark.csv"
ERRORFILE="$LOGDIR/montecarlo_errors.log"

mkdir -p "$LOGDIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

if [ ! -s "$CSVFILE" ]; then
    echo \
    "Anzahl Nodes,Anzahl Punkte,Pi,Laufzeit,Durchlauf Zeitstempel" \
    >> "$CSVFILE"
fi

for NODES in 1 2 4 8
do
    for POINTS in \
        10000 \
        100000 \
        1000000 \
        10000000
    do

        mpirun \
          --mca plm_rsh_no_tree_spawn 1 \
          --mca btl_tcp_if_include eth0 \
          --mca oob_tcp_if_include eth0 \
          --hostfile "$HOSTFILE" \
          -np "$NODES" \
          "$PROGRAM" \
          "$POINTS" \
          "$TIMESTAMP" \
          >> "$CSVFILE" \
          2>> "$ERRORFILE"

    done
done
```

Make the script executable:

```bash
chmod +x \
  /home/cloud-computing/run_montecarlo_benchmark.sh
```

Execute manually:

```bash
/home/cloud-computing/run_montecarlo_benchmark.sh
```

---

## 4.2 Benchmark Logging

The automated Monte Carlo results are stored in:

```text
/home/cloud-computing/benchmarks/montecarlo_benchmark.csv
```

The columns are:

| Column | Purpose |
|---|---|
| Anzahl Nodes | Number of MPI processes |
| Anzahl Punkte | Number of Monte Carlo samples |
| Pi | Calculated approximation of π |
| Laufzeit | Runtime in seconds |
| Durchlauf Zeitstempel | Identifier of the benchmark series |

Check the latest results:

```bash
tail -n 20 \
  /home/cloud-computing/benchmarks/montecarlo_benchmark.csv
```

MPI errors are written to:

```text
/home/cloud-computing/benchmarks/montecarlo_errors.log
```

Check the error log:

```bash
cat \
  /home/cloud-computing/benchmarks/montecarlo_errors.log
```

---

## 4.3 Automated Data Collection and Final Measurement Strategy

The Monte Carlo benchmark was initially configured to execute automatically every six hours.

The original cron job was:

```cron
0 */6 * * * /home/cloud-computing/run_montecarlo_benchmark.sh >> /home/cloud-computing/benchmarks/cron.log 2>&1
```

This generated benchmark series at:

```text
00:00
06:00
12:00
18:00
```

The purpose of the automation was to demonstrate unattended benchmark collection and to create measurements over time.

After consultation with the professor, the final measurement strategy was adjusted.

Instead of relying mainly on measurements distributed over a long period, the final scalability evaluation was performed during a focused measurement period of approximately two to three days.

The final analysis therefore uses deliberately executed benchmark series under more comparable conditions.

The six-hour cron job remains part of the implemented automation, but it is not the primary basis of the final scalability evaluation.

---

## 4.4 HPL Installation

High Performance LINPACK was installed to measure floating-point performance in GFLOPS.

Install the required dependencies:

```bash
sudo apt install -y \
  build-essential \
  gfortran \
  libblas-dev \
  liblapack-dev \
  wget
```

The HPL 2.3 sources were downloaded from Netlib:

```bash
mkdir -p ~/hpl
cd ~/hpl

wget \
  https://www.netlib.org/benchmark/hpl/hpl-2.3.tar.gz

tar -xzf hpl-2.3.tar.gz
cd hpl-2.3
```

---

## 4.5 HPL Build and Runtime Environment

An ARM64-specific configuration was created:

```text
Make.Linux_ARM64
```

It defines the compiler, MPI environment, BLAS/LAPACK libraries, and build parameters.

Compile HPL:

```bash
make arch=Linux_ARM64
```

The resulting binary is:

```text
bin/Linux_ARM64/xhpl
```

A separate runtime directory was created:

```text
/home/pi/hpl-run
```

It contains:

```text
xhpl
HPL.dat
```

The relevant `HPL.dat` parameters are:

| Parameter | Description |
|---|---|
| `N` | Matrix dimension |
| `NB` | Block size |
| `P` | Process-grid rows |
| `Q` | Process-grid columns |

The process grid satisfies:

```text
P × Q = number of MPI processes
```

The configurations used were:

| Workers | P | Q |
|---:|---:|---:|
| 1 | 1 | 1 |
| 2 | 1 | 2 |
| 4 | 2 | 2 |
| 8 | 2 | 4 |

The block size was:

```text
NB = 192
```

---

## 4.6 Initial HPL Validation

Before the final worker measurements, HPL was tested locally on the Raspberry Pi 5 Head Node.

Configuration:

```text
N  = 8000
NB = 192
P  = 1
Q  = 1
```

Execution:

```bash
cd /home/pi/hpl-run
mpirun -np 1 ./xhpl
```

The initial validation produced:

```text
Runtime     = 206.15 seconds
Performance = 1.6562 GFLOPS
Status      = PASSED
```

This result was used only to verify that HPL was functioning.

It is not used as the baseline of the final scaling analysis because the final measurements use Raspberry Pi 3 Worker Nodes.

---

## 4.7 Distributed HPL Execution

Example distributed execution with eight workers:

```bash
mpirun \
  --mca plm_rsh_no_tree_spawn 1 \
  --mca btl_tcp_if_include eth0 \
  --mca oob_tcp_if_include eth0 \
  --hostfile /home/cloud-computing/hosts \
  --wdir /home/pi/hpl-run \
  -np 8 \
  /home/pi/hpl-run/xhpl
```

During the first distributed attempts, HPL failed because the remote processes could not find:

```text
HPL.dat
```

The option:

```text
--wdir /home/pi/hpl-run
```

was added so that every MPI process starts in the directory containing both:

```text
xhpl
HPL.dat
```

---

## 4.8 Repeated Benchmark Runs

Where technically possible, each final configuration was executed five times.

Example:

```bash
for RUN in {1..5}
do
    echo "========== RUN $RUN of 5 =========="
    date

    mpirun \
      --mca plm_rsh_no_tree_spawn 1 \
      --mca btl_tcp_if_include eth0 \
      --mca oob_tcp_if_include eth0 \
      --hostfile /home/cloud-computing/hosts \
      --wdir /home/pi/hpl-run \
      -np <PROCESSES> \
      /home/pi/hpl-run/xhpl

    echo "========== RUN $RUN FINISHED =========="
    date
done
```

Repeated runs allow the calculation of:

- arithmetic mean,
- sample standard deviation,
- speedup,
- efficiency.

---

# 5. Experimental Methodology and Scalability

## 5.1 Measurement Methodology

After consultation with the professor, the final benchmark data was collected during a focused measurement period of approximately two to three days instead of relying primarily on measurements distributed over a much longer period.

The purpose of this approach was to create more comparable test conditions while still collecting enough repeated measurements for statistical evaluation.

The previously configured six-hour cron job remains part of the benchmark automation. However, the final scalability analysis is based primarily on deliberately executed benchmark series within this shorter measurement period.

The experiments use **1, 2, 4, and 8 MPI workers**.

Where technically possible, every configuration was executed five times.

Repeated measurements reduce the influence of temporary variations caused by:

- operating system scheduling,
- background processes,
- cache state,
- network activity,
- CPU frequency changes,
- temperature,
- thermal throttling.

The arithmetic mean is used as the representative runtime.

The sample standard deviation describes the variation between the individual runs.

---

## 5.2 Speedup and Parallel Efficiency

Strong-scaling speedup is calculated as:

```text
S(p) = T(1) / T(p)
```

where:

```text
T(1) = mean runtime with one worker
T(p) = mean runtime with p workers
```

Parallel efficiency is:

```text
E(p) = S(p) / p
```

or as a percentage:

```text
E(p) = S(p) / p × 100 %
```

Ideal scaling would produce:

| Workers | Ideal Speedup | Ideal Efficiency |
|---:|---:|---:|
| 1 | 1 | 100 % |
| 2 | 2 | 100 % |
| 4 | 4 | 100 % |
| 8 | 8 | 100 % |

---

## 5.3 Amdahl's Law – Strong Scaling

Amdahl's Law describes the acceleration of a fixed-size problem when additional computing resources are added.

The defining condition is:

```text
Problem size remains constant.
Worker count increases.
```

The theoretical speedup is:

```text
S(p) = 1 / (α + (1 - α) / p)
```

where:

```text
p = number of workers
α = serial or non-scaling fraction
```

The serial fraction can be estimated from measured speedup using:

```text
α = (1 / S(p) - 1 / p) / (1 - 1 / p)
```

The two strong-scaling experiments were:

### Monte Carlo

```text
Total samples = 100,000,000
Workers       = 1, 2, 4, 8
```

### Matrix Multiplication

```text
Matrix N = 800
Workers  = 1, 2, 4, 8
```

---

## 5.4 Gustafson's Law – Scaled Workloads

Gustafson's Law considers a different scenario.

Instead of keeping the problem size constant, additional processors are used to process a larger workload.

The scaled speedup is:

```text
S_G(p) = p - α(p - 1)
```

### Monte Carlo

The sample count was increased proportionally to the number of workers:

| Workers | Total Samples |
|---:|---:|
| 1 | 100,000,000 |
| 2 | 200,000,000 |
| 4 | 400,000,000 |
| 8 | 800,000,000 |

Each worker therefore receives approximately:

```text
100,000,000 samples
```

The ideal result is an approximately constant runtime.

### Matrix Multiplication

Classical matrix multiplication has approximately:

```text
O(N³)
```

computational complexity.

The matrix dimension was therefore increased approximately according to:

```text
N(p) ≈ N(1) × p^(1/3)
```

The tested dimensions were:

| Workers | Matrix N |
|---:|---:|
| 1 | 800 |
| 2 | 1008 |
| 4 | 1272 |
| 8 | 1600 |

This produces approximately:

```text
1×
2×
4×
8×
```

the computational workload.

For the scaled workload experiments, weak-scaling efficiency is calculated as:

```text
E_weak(p) = T(1) / T(p)
```

An ideal value is:

```text
100 %
```

---

## 5.5 HPL Scaling

HPL was tested with:

```text
N = 5000
N = 8000
N = 18000
```

`N = 5000` and `N = 8000` were executed with:

```text
1, 2, 4, and 8 workers
```

`N = 18000` exceeded the available memory with one and two workers.

This experiment therefore also demonstrates the effect of distributed memory capacity.

---

# 6. Results and Bottleneck Analysis

## 6.1 HPL Results

### N = 5000

| Workers | Mean GFLOPS | Std. Dev. GFLOPS | Mean Time [s] | Speedup | Efficiency |
|---:|---:|---:|---:|---:|---:|
| 1 | 0.16837 | 0.00005 | 495.157 | 1.000 | 100.0 % |
| 2 | 0.29600 | 0.00003 | 281.658 | 1.758 | 87.9 % |
| 4 | 0.53494 | 0.00064 | 155.848 | 3.177 | 79.4 % |
| 8 | 0.93857 | 0.00128 | 88.830 | 5.574 | 69.7 % |

Three valid runs were available for the one-worker configuration. The other configurations contain five runs.

With eight workers, the runtime decreases from approximately 495.2 seconds to 88.8 seconds.

The measured speedup is 5.57, corresponding to an efficiency of 69.7 %.

---

### N = 8000

| Workers | Mean GFLOPS | Std. Dev. GFLOPS | Mean Time [s] | Speedup | Efficiency |
|---:|---:|---:|---:|---:|---:|
| 1 | 0.16825 | 0.00007 | 2029.314 | 1.000 | 100.0 % |
| 2 | 0.30932 | 0.00002 | 1103.826 | 1.838 | 91.9 % |
| 4 | 0.57496 | 0.00148 | 593.832 | 3.417 | 85.4 % |
| 8 | 1.01614 | 0.00483 | 336.014 | 6.039 | 75.5 % |

The larger workload produces better parallel efficiency than `N = 5000`.

With eight workers:

```text
Performance = 1.016 GFLOPS
Speedup     = 6.04
Efficiency  = 75.5 %
```

The larger problem provides a better computation-to-communication ratio.

---

### N = 18000

| Workers | Mean GFLOPS | Std. Dev. GFLOPS | Mean Time [s] | Result |
|---:|---:|---:|---:|---|
| 1 | – | – | – | HPL memory allocation failed |
| 2 | – | – | – | Linux OOM killer terminated `xhpl` |
| 4 | 0.61665 | 0.01749 | 6310.000 | Successful |
| 8 | 1.15298 | 0.01264 | 3372.816 | Successful |

A conventional speedup relative to one worker cannot be calculated because no valid single-worker baseline exists.

Increasing from four to eight workers reduces the runtime from 6310.0 seconds to 3372.8 seconds, corresponding to an improvement of approximately 1.87×.

The highest measured mean HPL performance was:

```text
1.153 GFLOPS
```

with eight workers.

The experiment also demonstrates the benefit of distributed memory: a problem that could not be executed with one or two Raspberry Pis became executable with four and eight workers.

---

## 6.2 Monte Carlo – Amdahl / Strong Scaling

The fixed workload was:

```text
100,000,000 samples
```

Results:

| Workers | Mean Runtime [s] | Std. Dev. [s] | Speedup | Efficiency |
|---:|---:|---:|---:|---:|
| 1 | 9.9885 | 0.0051 | 1.000 | 100.0 % |
| 2 | 5.0088 | 0.0035 | 1.994 | 99.7 % |
| 4 | 2.5329 | 0.0126 | 3.944 | 98.6 % |
| 8 | 1.3010 | 0.0105 | 7.678 | 96.0 % |

With eight workers:

```text
Speedup    = 7.68
Efficiency = 96.0 %
```

The average estimated serial fraction is approximately:

```text
α ≈ 0.00456
```

or:

```text
0.46 %
```

The Monte Carlo application therefore exhibits nearly ideal strong scaling.

---

## 6.3 Matrix Multiplication – Amdahl / Strong Scaling

The fixed matrix dimension was:

```text
N = 800
```

Results:

| Workers | Mean Runtime [s] | Std. Dev. [s] | Speedup | Efficiency |
|---:|---:|---:|---:|---:|
| 1 | 56.1510 | 2.5388 | 1.000 | 100.0 % |
| 2 | 28.9250 | 0.8325 | 1.941 | 97.1 % |
| 4 | 16.1230 | 0.4480 | 3.483 | 87.1 % |
| 8 | 10.9295 | 0.0542 | 5.138 | 64.2 % |

With eight workers:

```text
Speedup    = 5.14
Efficiency = 64.2 %
```

The average estimated serial or non-scaling fraction is approximately:

```text
α ≈ 0.0531
```

or:

```text
5.31 %
```

The lower efficiency compared with Monte Carlo reflects the larger communication and memory requirements of matrix multiplication.

---

## 6.4 Amdahl Comparison

| Workers | Monte Carlo Speedup | Matrix Speedup |
|---:|---:|---:|
| 1 | 1.000 | 1.000 |
| 2 | 1.994 | 1.941 |
| 4 | 3.944 | 3.483 |
| 8 | 7.678 | 5.138 |

At eight workers:

| Metric | Monte Carlo | Matrix Multiplication |
|---|---:|---:|
| Speedup | 7.678 | 5.138 |
| Efficiency | 96.0 % | 64.2 % |
| Estimated serial fraction | 0.46 % | 5.31 % |

Monte Carlo remains close to ideal linear scaling.

Matrix multiplication increasingly deviates from the ideal result as the number of workers increases.

---

## 6.5 Monte Carlo – Gustafson / Scaled Workload

| Workers | Total Samples | Mean Runtime [s] | Std. Dev. [s] | Weak Efficiency | Gustafson S_G |
|---:|---:|---:|---:|---:|---:|
| 1 | 100,000,000 | 9.9882 | 0.0042 | 100.0 % | 1.000 |
| 2 | 200,000,000 | 10.0024 | 0.0085 | 99.9 % | 1.995 |
| 4 | 400,000,000 | 10.0168 | 0.0073 | 99.7 % | 3.986 |
| 8 | 800,000,000 | 10.3206 | 0.1643 | 96.8 % | 7.968 |

The workload increases by a factor of eight while the runtime increases only from approximately 9.99 seconds to 10.32 seconds.

With eight workers:

```text
Weak efficiency = 96.8 %
Gustafson S_G   = 7.97
```

This demonstrates very good scaled workload behavior.

---

## 6.6 Matrix Multiplication – Gustafson / Scaled Workload

| Workers | Matrix N | Mean Runtime [s] | Std. Dev. [s] | Weak Efficiency | Gustafson S_G |
|---:|---:|---:|---:|---:|---:|
| 1 | 800 | 57.7126 | 1.0771 | 100.0 % | 1.000 |
| 2 | 1008 | 116.8567 | 2.4913 | 49.4 % | 1.947 |
| 4 | 1272 | 121.4670 | 1.4845 | 47.5 % | 3.841 |
| 8 | 1600 | 131.3311 | 3.3267 | 43.9 % | 7.628 |

The computational workload increases approximately with the worker count, but the runtime does not remain constant.

At eight workers:

```text
Weak efficiency = 43.9 %
Gustafson S_G   = 7.63
```

The measured runtime therefore shows that communication, synchronization, and memory overhead increase substantially with the matrix size.

---

## 6.7 Gustafson Comparison

| Metric at 8 Workers | Monte Carlo | Matrix Multiplication |
|---|---:|---:|
| Workload increase | 8× | approximately 8× |
| Mean runtime | 10.321 s | 131.331 s |
| Weak efficiency | 96.8 % | 43.9 % |
| Gustafson S_G | 7.968 | 7.628 |

Monte Carlo processes approximately eight times more work with almost the same runtime.

Matrix multiplication cannot maintain constant runtime because its communication and memory requirements increase together with the problem size.

---

## 6.8 Bottleneck Analysis

### Communication

Monte Carlo requires very little MPI communication.

Each worker performs almost all calculations independently, and only the final partial results are combined.

Matrix multiplication and HPL require significantly more communication.

As additional workers participate, communication becomes a larger fraction of the total runtime.

### Synchronization

Collective MPI operations require participating processes to synchronize.

If one process reaches a synchronization point later than the others, the remaining processes must wait.

This effect becomes more relevant as the number of participating workers increases.

### Ethernet Network

Communication between physical workers takes place through the Ethernet cluster network.

Distributed applications are therefore affected by:

- network bandwidth,
- network latency,
- message size,
- number of messages.

This is especially relevant for matrix multiplication and HPL.

### Memory Bandwidth and Data Locality

Matrix multiplication and HPL process large matrix datasets.

Performance therefore depends not only on CPU speed but also on:

- memory bandwidth,
- cache behavior,
- data locality.

These factors contribute to the lower scalability compared with Monte Carlo.

### Memory Capacity

The HPL `N = 18000` experiment demonstrated a memory-capacity limitation.

The workload failed with one worker and two workers but executed successfully with four and eight workers.

Distributed execution therefore provides not only additional processing resources but also additional aggregate memory capacity.

### Workload Size

The HPL results show that larger workloads use additional workers more efficiently.

At eight workers:

```text
N = 5000 -> 69.7 % efficiency
N = 8000 -> 75.5 % efficiency
```

A larger computational workload reduces the relative influence of fixed communication overhead.

### Hardware Differences

The Raspberry Pi 5 Head Node provides substantially higher computational performance than the Raspberry Pi 3 Worker Nodes.

For this reason, the local HPL validation result on the Head Node is not used as the baseline for the final worker scaling analysis.

### System Effects

Benchmark results can additionally be influenced by:

- operating system scheduling,
- background processes,
- CPU frequency scaling,
- cache state,
- temperature,
- thermal throttling.

Repeated benchmark runs and statistical evaluation reduce the influence of individual temporary variations.

---

## 6.9 Important Files

| Purpose | Path |
|---|---|
| MPI Hostfile | `/home/cloud-computing/hosts` |
| OpenMPI Configuration | `/home/cloud-computing/.openmpi/mca-params.conf` |
| Monte Carlo Executable | `/home/pi/montecarlo_pi` |
| Monte Carlo Benchmark Script | `/home/cloud-computing/run_montecarlo_benchmark.sh` |
| Monte Carlo Results | `/home/cloud-computing/benchmarks/montecarlo_benchmark.csv` |
| Monte Carlo Error Log | `/home/cloud-computing/benchmarks/montecarlo_errors.log` |
| Cron Log | `/home/cloud-computing/benchmarks/cron.log` |
| Matrix Multiplication Executable | `/home/pi/mpi_matrix_mul` |
| HPL Runtime Directory | `/home/pi/hpl-run` |
| HPL Executable | `/home/pi/hpl-run/xhpl` |
| HPL Configuration | `/home/pi/hpl-run/HPL.dat` |

---

# 7. Conclusion

The Raspberry Pi cluster was successfully configured for distributed execution using OpenMPI and evaluated using several benchmark workloads.

The MPI environment required:

- passwordless SSH between the Head Node and Worker Nodes,
- identical OpenMPI installations,
- a defined MPI hostfile,
- consistent executables on the workers,
- correct remote working directories,
- explicit selection of the Ethernet interface.

One important configuration issue occurred because OpenMPI detected multiple available network interfaces and attempted to use a Docker network.

Restricting OpenMPI to:

```text
eth0
```

provided stable communication between the Worker Nodes.

The benchmark results show that scalability strongly depends on application characteristics.

Monte Carlo represents an almost ideal parallel workload.

With a fixed workload of 100 million samples, eight workers achieved:

```text
Speedup    = 7.68
Efficiency = 96.0 %
```

For the scaled workload experiment, eight workers processed 800 million samples with:

```text
Weak efficiency = 96.8 %
```

Matrix multiplication also benefits from additional workers, but communication and memory effects limit its scalability.

With `N = 800`, eight workers achieved:

```text
Speedup    = 5.14
Efficiency = 64.2 %
```

In the scaled matrix experiment, the weak-scaling efficiency decreased to:

```text
43.9 %
```

HPL produced similar evidence of non-ideal scaling.

For `N = 8000`, eight workers achieved:

```text
Performance = 1.016 GFLOPS
Speedup     = 6.04
Efficiency  = 75.5 %
```

The highest measured mean HPL performance was:

```text
1.153 GFLOPS
```

with:

```text
N = 18000
8 workers
```

The `N = 18000` experiment also demonstrates the memory advantage of distributed execution. The workload could not be executed with one or two workers but completed successfully with four and eight workers.

Overall, the experiments demonstrate the central concepts of distributed-memory scalability:

- highly independent workloads can approach linear speedup,
- communication reduces parallel efficiency,
- synchronization becomes increasingly relevant with more workers,
- memory behavior can become a limiting factor,
- larger workloads can improve the computation-to-communication ratio,
- distributed systems can provide both additional processing power and additional aggregate memory.

The results therefore provide practical examples of Amdahl's Law, Gustafson's Law, and the performance limitations of distributed computing on resource-constrained edge devices.

---

# References

- Open MPI Documentation: https://docs.open-mpi.org/
- High Performance LINPACK: https://www.netlib.org/benchmark/hpl/
- MPI Forum: https://www.mpi-forum.org/
- Debian Documentation: https://www.debian.org/doc/
