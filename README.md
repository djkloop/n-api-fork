<div align="center">

![new-api](/web/public/logo.png)

# New API

新一代大模型网关与 AI 资产管理系统

</div>

## 项目简介

New API 是由 **QuantumNous** 维护的开源 AI API 网关，提供统一的模型接口、渠道管理、鉴权、额度计费、日志统计和管理后台。

本仓库基于 [QuantumNous/new-api](https://github.com/QuantumNous/new-api) 进行维护。

## 主要功能

- 兼容 OpenAI、Claude、Gemini 等主流接口格式
- 支持多上游渠道、模型映射、负载分配和失败重试
- 支持用户、令牌、分组、额度及订阅管理
- 支持 SQLite、MySQL、PostgreSQL、Redis 和 ClickHouse 日志库
- 提供 React 管理后台及多语言界面

## 快速启动

```bash
docker compose up -d
```

启动后访问 `http://localhost:3000`。

详细配置和使用说明请参阅 [New API 官方文档](https://docs.newapi.pro/zh/docs)。

## 说明

本项目仅应用于合法授权的 AI API 网关、组织内部鉴权、多模型管理、用量统计、成本核算和私有化部署场景。使用者应合法取得上游服务权限，并遵守相关服务条款及适用法律法规。

## 许可证与归属

New API 项目及 **QuantumNous** 相关名称、归属和版权声明予以保留。本项目依据 [GNU Affero General Public License v3.0](./LICENSE) 发布，其他第三方许可信息参见 [THIRD-PARTY-LICENSES.md](./THIRD-PARTY-LICENSES.md)。
