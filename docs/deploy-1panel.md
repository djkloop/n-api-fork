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
