# Transfer With Authorization Server

EIP-3009 授权转账服务端，接收前端签名并通过 Relayer 模式执行链上交易。

## 功能

- 执行 `transferWithAuthorization`（任何人可提交）
- 执行 `receiveWithAuthorization`（仅接收方可提交）
- Nonce 状态查询（防止重放攻击）
- 交易状态查询
- 模拟交易预检（节省 gas）

## 技术栈

- **Node.js** + **TypeScript**
- **Express** - Web 框架
- **viem** - 以太坊交互库
- **Zod** - 请求参数验证

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.development` 和 `.env.production` 文件：

```bash
# .env.development / .env.production
PORT=3001
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
RELAYER_PRIVATE_KEY=0x...
FRONTEND_URL=http://localhost:5173
CHAIN_ID=1
```

| 变量 | 说明 |
|------|------|
| `PORT` | 服务端口，默认 3001 |
| `RPC_URL` | 以太坊 Mainnet RPC URL |
| `RELAYER_PRIVATE_KEY` | Relayer 钱包私钥（用于支付 gas） |
| `FRONTEND_URL` | 前端地址（CORS，支持逗号分隔多个） |
| `CHAIN_ID` | 链 ID，固定为 `1`（Mainnet） |

### 3. 启动

```bash
# 开发环境
npm run dev

# 生产环境
npm run build && npm start
```

## API 接口

### 健康检查

```
GET /api/health
```

返回 Relayer 地址和 ETH 余额。

### 执行授权转账

```
POST /api/authorization/execute
```

请求体：

```json
{
  "message": {
    "from": "0x...",
    "to": "0x...",
    "value": "1000000",
    "validAfter": "0",
    "validBefore": "1700000000",
    "nonce": "0x..."
  },
  "signature": "0x...",
  "type": "transfer"
}
```

| 字段 | 说明 |
|------|------|
| `type` | `transfer` 或 `receive` |
| `value` | USDC 金额（6 位小数，字符串） |
| `validAfter` | 生效时间（Unix 时间戳） |
| `validBefore` | 过期时间（Unix 时间戳） |
| `nonce` | 32 字节随机数（防重放） |

响应：

```json
{
  "success": true,
  "transactionHash": "0x..."
}
```

### 查询 Nonce 状态

```
GET /api/authorization/nonce-status?authorizer=0x...&nonce=0x...
```

### 查询交易状态

```
GET /api/authorization/transaction/:hash
```

## 项目结构

```
src/
├── index.ts              # 入口，Express 应用
├── config/
│   └── index.ts          # 环境配置
├── constants/
│   └── eip3009.ts        # EIP-3009 ABI 和 USDC 地址
├── routes/
│   ├── authorization.ts  # 授权相关 API
│   └── health.ts         # 健康检查 API
├── schemas/
│   └── authorization.ts  # Zod 请求验证
└── services/
    └── blockchain.ts     # 区块链交互（核心）
```

## 核心流程

```
前端签名 → POST /execute → 验证参数 → 检查 Nonce → 验证时间
                                                    ↓
返回 txHash ← 发送交易 ← 模拟交易（预检） ← 解析签名
```

## 部署

### Vercel

1. 导入 GitHub 仓库
2. 设置环境变量
3. 部署

生产地址：https://transfer-with-auth-server.vercel.app

## 注意事项

- Relayer 钱包需要足够的 ETH 支付 gas
- 私钥不要提交到 Git（已在 .gitignore 中忽略 .env 文件）
- 生产环境建议使用 KMS 或硬件钱包管理私钥
- USDC 合约地址：`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`（Mainnet）
