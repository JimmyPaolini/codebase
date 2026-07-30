# Deployment Models: Jobs vs Deployments

## Overview

Kubernetes offers different workload types for different use cases. This document explains when to use **Jobs** vs. **Deployments** and how PersistentVolumeClaims (PVCs) enable data persistence.

## Kubernetes Workload Types

### Jobs (Batch Processing)

**Purpose**: Run a task to completion, then terminate.

**Characteristics**:

- Executes once (or N times with `completions`)
- Terminates after successful completion (exit code 0)
- Retries on failure (up to `backoffLimit`)
- Can auto-delete after completion (`ttlSecondsAfterFinished`)

**Use Cases**:

- Data processing pipelines (e.g., caelundas astronomical calendar generation)
- Database migrations
- Report generation
- Backup tasks
- ETL workflows
- Any task that runs to completion

#### Example: caelundas

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: caelundas-20260226-143000
spec:
  completions: 1 # Run once
  backoffLimit: 1 # Retry once on failure
  ttlSecondsAfterFinished: 3600 # Delete after 1 hour
  template:
    spec:
      containers:
        - name: caelundas
          image: ghcr.io/jimmypaolini/caelundas:latest
          command: ["pnpm", "start"]
          volumeMounts:
            - name: output
              mountPath: /app/output
      volumes:
        - name: output
          persistentVolumeClaim:
            claimName: caelundas-output
      restartPolicy: OnFailure # Restart pod on failure, not Always
```

**Lifecycle**:

```text
Create Job → Pod Running → Task Completes → Pod Succeeded → Job Completed → (Auto-delete after TTL)
                             ↓
                        Task Fails → Retry (up to backoffLimit) → Job Failed
```

### Deployments (Long-Running Services)

**Purpose**: Keep a specified number of pods always running.

**Characteristics**:

- Always running (never terminates)
- Automatically restarts on failure
- Supports rolling updates
- Scales horizontally (replicas)
- Declares desired state (K8s reconciles to match)

**Use Cases**:

- Web servers (e.g., lexico SSR app)
- APIs and microservices
- Databases
- Message brokers
- Any service that serves requests continuously

#### Example: lexico (when deployed)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lexico
spec:
  replicas: 3 # Run 3 instances for high availability
  selector:
    matchLabels:
      app: lexico
  template:
    spec:
      containers:
        - name: lexico
          image: ghcr.io/jimmypaolini/lexico:latest
          ports:
            - containerPort: 3000
          livenessProbe: # Restart if unhealthy
            httpGet:
              path: /health
              port: 3000
          readinessProbe: # Remove from Service if not ready
            httpGet:
              path: /ready
              port: 3000
      restartPolicy: Always # Always restart on failure
```

**Lifecycle**:

```text
Create Deployment → Desired replicas (3) → K8s creates 3 pods → Pods running indefinitely
                                                ↓
                                          Pod crashes → K8s creates replacement pod
                                                ↓
                                          Update image → Rolling update (1 pod at a time)
```

## Decision Matrix

| Criterion            | Job                              | Deployment                          |
| -------------------- | -------------------------------- | ----------------------------------- |
| **Termination**      | Runs to completion               | Runs indefinitely                   |
| **Restart Policy**   | OnFailure or Never               | Always                              |
| **Retries**          | Configurable (backoffLimit)      | Infinite (K8s keeps restarting)     |
| **Scaling**          | Parallelism (concurrent runs)    | Replicas (multiple instances)       |
| **Use Case**         | Batch processing, one-time tasks | Web servers, APIs, daemons          |
| **Network Exposure** | Usually not needed               | Typically exposed via Service       |
| **Update Strategy**  | Not applicable (recreate Job)    | Rolling updates, canary, blue-green |
| **Auto-cleanup**     | TTL-based deletion               | Runs until manually deleted         |

## PersistentVolumeClaim (PVC) Strategy

### Why PVCs?

**Problem**: Kubernetes pods are ephemeral. When a pod terminates, its filesystem is lost.

**Solution**: PersistentVolumeClaims provide durable storage that survives pod restarts and deletions.

### Use Cases

1. **Job Output Storage** (caelundas pattern):
   - Job writes output files to PVC
   - Job completes and pod terminates
   - Output files persist in PVC
   - Retrieve files via temporary pod or `kubectl cp`

2. **Database Storage** (Deployments):
   - Database writes data to PVC
   - Pod restarts don't lose data
   - Data survives cluster maintenance

3. **Configuration Files**:
   - Mount read-only PVC with config files
   - Share config across multiple pods

### PVC Configuration

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: caelundas-output
spec:
  accessModes:
    - ReadWriteOnce # Single node can mount read-write
  storageClassName: standard # Dynamic provisioning
  resources:
    requests:
      storage: 2Gi # Request 2GB
```

**Access Modes**:

- **ReadWriteOnce (RWO)**: Single node, read-write (most common)
- **ReadOnlyMany (ROX)**: Multiple nodes, read-only
- **ReadWriteMany (RWX)**: Multiple nodes, read-write (requires NFS or similar)

### Mounting PVCs in Jobs

```yaml
spec:
  template:
    spec:
      containers:
        - name: caelundas
          image: ghcr.io/jimmypaolini/caelundas:latest
          volumeMounts:
            - name: output-volume
              mountPath: /app/output # Container path
      volumes:
        - name: output-volume
          persistentVolumeClaim:
            claimName: caelundas-output # PVC name
```

### Retrieving Files from PVCs

After job completion, retrieve files using `kubectl cp`:

```bash
# Method 1: kubectl cp from running pod
kubectl cp <pod-name>:/app/output ./local-output

# Method 2: Create temporary pod to mount PVC
kubectl run temp-pod --image=busybox --rm -it \
  --overrides='{"spec":{"volumes":[{"name":"output","persistentVolumeClaim":{"claimName":"caelundas-output"}}],"containers":[{"name":"busybox","image":"busybox","volumeMounts":[{"name":"output","mountPath":"/data"}],"command":["sh"]}]}}' \
  -- sh

# Inside temp pod
ls /data
cat /data/calendar.ics

# Method 3: Nx helper target (caelundas)
nx run caelundas:kubernetes-copy-files
```

### PVC Lifecycle Management

**Important**: PVCs are **not** automatically deleted when Jobs complete.

```bash
# List PVCs
kubectl get pvc

# Delete PVC manually
kubectl delete pvc caelundas-output

# Delete via Helm (if chart includes PVC)
helm uninstall caelundas-20260226-143000
```

**Best Practice**: Set a cleanup policy (manual or automated) to avoid orphaned PVCs consuming storage.

## Helm Chart Design Patterns

### kubernetes-job Chart

The codebase's [infrastructure/helm/kubernetes-job](../../infrastructure/helm/kubernetes-job) chart provides a reusable template for Jobs with PVCs:

**Key Features**:

- Auto-generated release names (timestamped)
- Optional PVC creation (`persistence.enabled`)
- Configurable backoff and TTL
- Environment variables from Secrets
- Resource limits and requests

**Usage**:

```bash
# Deploy with auto-generated name
RELEASE_NAME="caelundas-$(date +%Y%m%d-%H%M%S)"
helm upgrade --install "$RELEASE_NAME" infrastructure/helm/kubernetes-job/ \
  --values infrastructure/helm/kubernetes-job/values/caelundas-production.yaml \
  --set image.tag=1.2.3
```

**Benefits**:

- No naming conflicts (each run gets unique name)
- Easy parallel execution (multiple jobs concurrently)
- Clear job history (`helm list`)

## Project-Specific Patterns

### caelundas (Job Pattern)

**Architecture**:

- **Type**: Kubernetes Job
- **Execution**: One-time batch process
- **Input**: Environment variables (from K8s Secret)
- **Output**: iCalendar files written to PVC
- **Cleanup**: Manual deletion after file retrieval

**Workflow**:

```bash
# 1. Build and push image
nx run caelundas:docker-build
docker push ghcr.io/jimmypaolini/caelundas:latest

# 2. Deploy Job
nx run caelundas:helm-upgrade

# 3. Wait for completion
kubectl wait --for=condition=complete job/caelundas-20260226-143000 --timeout=600s

# 4. Retrieve output files
nx run caelundas:kubernetes-copy-files

# 5. Clean up
nx run caelundas:helm-uninstall
kubectl delete pvc caelundas-output
```

### lexico (Deployment Pattern - Future)

**Architecture** (when deployed to K8s):

- **Type**: Kubernetes Deployment
- **Execution**: Always running (3+ replicas)
- **Exposure**: Service + Ingress (HTTPS)
- **State**: Stateless app (session in cookies)

**Workflow**:

```bash
# Deploy or update
helm upgrade --install lexico ./charts/lexico \
  --set image.tag=1.2.3

# Rolling update (zero downtime)
kubectl rollout status deployment/lexico

# Rollback if needed
kubectl rollout undo deployment/lexico
```

## Summary

| Aspect       | Job (caelundas)        | Deployment (lexico)         |
| ------------ | ---------------------- | --------------------------- |
| **Pattern**  | Batch processing       | Web service                 |
| **Runs**     | To completion          | Indefinitely                |
| **Restarts** | Limited (backoffLimit) | Unlimited                   |
| **Output**   | Files in PVC           | HTTP responses              |
| **Scaling**  | Parallelism            | Replicas                    |
| **Cleanup**  | Manual deletion        | Manual deletion (when done) |
| **Updates**  | Recreate Job           | Rolling updates             |
| **Network**  | Not exposed            | Service + Ingress           |

**Key Takeaway**: Use Jobs for finite tasks that produce output artifacts. Use Deployments for services that handle requests continuously.
