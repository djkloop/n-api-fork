# 1Panel 单命令部署

该脚本用于当前 1Panel 生产目录，自动完成：

1. 拉取 `origin/main` 的最新提交。
2. 使用提交号构建 `new-api-custom:<commit>` 镜像。
3. 备份线上 `docker-compose.yml`。
4. 只重建 `new-api` 服务，不操作 MySQL、Redis 或数据卷。
5. 等待容器健康检查和 `/api/status`。
6. 部署失败时恢复 compose，并重新启动之前的镜像。

## 首次安装

服务器源码目录必须是：

```text
/opt/1panel/apps/new-api-source
```

线上 1Panel 应用目录必须是：

```text
/opt/1panel/apps/new-api/new-api
```

首次拉取包含部署脚本的提交并添加执行权限：

```bash
cd /opt/1panel/apps/new-api-source
git pull --ff-only origin main
chmod +x scripts/deploy-1panel.sh
```

## 日常部署

以后每次只需要执行：

```bash
/opt/1panel/apps/new-api-source/scripts/deploy-1panel.sh
```

脚本结束时会输出实际提交、运行镜像和 compose 备份路径。

## 自定义目录

所有路径和名称都可以使用环境变量覆盖：

```bash
SOURCE_DIR=/opt/1panel/apps/new-api-source \
APP_DIR=/opt/1panel/apps/new-api/new-api \
CONTAINER_NAME=1Panel-new-api-ljkr \
HEALTH_TIMEOUT=180 \
bash scripts/deploy-1panel.sh
```

可用变量：

| 变量 | 默认值 |
| --- | --- |
| `SOURCE_DIR` | `/opt/1panel/apps/new-api-source` |
| `APP_DIR` | `/opt/1panel/apps/new-api/new-api` |
| `COMPOSE_FILE` | `$APP_DIR/docker-compose.yml` |
| `BRANCH` | `main` |
| `DEPLOY_COMMIT` | 空；设置后部署该精确 Git commit，供集群从节点跟随主节点版本 |
| `SERVICE_NAME` | `new-api` |
| `CONTAINER_NAME` | `1Panel-new-api-ljkr` |
| `IMAGE_REPOSITORY` | `new-api-custom` |
| `HEALTH_TIMEOUT` | `180` 秒 |
| `BACKUP_DIR` | `$APP_DIR/deploy-backups` |

## 安全边界

脚本不会执行以下操作：

```text
docker compose down
docker volume prune
docker system prune
数据库恢复或删除
```

构建在容器切换前完成。构建或 Git 拉取失败不会影响当前线上容器。

脚本最多保留最近 10 份 compose 备份。旧 Docker 镜像不会自动删除，以便人工排查和回滚。

## 双节点顺序部署

`scripts/deploy-cluster.mjs` 在主节点执行，先调用本机的 `deploy-1panel.sh`，主节点健康检查成功后读取其精确 Git commit，再通过 SSH 要求从节点部署同一个 commit。这个顺序确保只有 master 节点先执行数据库迁移，slave 节点不会提前运行依赖新结构的代码，也不会因部署期间 `main` 再次更新而运行不同版本。

要求：

- 主节点安装 Node.js 18 或更高版本。
- 两台服务器都已存在源码目录和可用的 `deploy-1panel.sh`。
- 主节点能够使用独立 SSH 密钥免密连接从节点。
- 从节点的 Compose 中固定配置 `NODE_TYPE=slave`。

在主节点安装配置：

```bash
install -d -m 700 /etc/new-api
install -m 600 \
  scripts/deploy-cluster.example.json \
  /etc/new-api/cluster-deploy.json
nano /etc/new-api/cluster-deploy.json
chmod +x scripts/deploy-cluster.mjs
ln -sf \
  /opt/1panel/apps/new-api-source/scripts/deploy-cluster.mjs \
  /usr/local/bin/deploy-new-api-all
```

配置中的 `secondary.host` 应使用从节点的 Tailscale 地址，例如 `root@100.81.96.85`。`identityFile` 指向主节点用于连接从节点的私钥，配置文件中不保存密码、数据库凭据或会话密钥。

首次执行前检查实际命令：

```bash
deploy-new-api-all --dry-run
```

以后只需在主节点运行：

```bash
deploy-new-api-all
```

主节点成功但从节点因临时网络问题失败时，可以只重试从节点：

```bash
deploy-new-api-all --secondary-only
```

脚本使用 `/tmp/new-api-cluster-deploy.lock` 防止重复执行。任一阶段失败都会返回非零退出码；每个节点的健康检查与 Compose 回滚仍由各自的 `deploy-1panel.sh` 负责。
