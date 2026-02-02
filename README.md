# Transfer With Authorization Server

EIP-3009 TransferWithAuthorization 服务端，用于接收前端签名并执行链上交易。

## 功能

- 接收 EIP-3009 签名并执行 `transferWithAuthorization` 或 `receiveWithAuthorization`
- 验证签名有效性（时间范围、nonce 状态）
- 查询 nonce 使用状态
- 查询交易确认状态

## 技术栈

- **Node.js** + **TypeScript**
- **Express** - Web 框架
- **viem** - 以太坊交互
- **Zod** - 请求验证

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

项目使用多环境配置，根据 `NODE_ENV` 加载对应的 `.env` 文件：

| 环境 | 配置文件 | NODE_ENV |
|------|----------|----------|
| 开发环境 | `.env.development` | development |
| 生产环境 | `.env.production` | production |

复制示例文件并填写配置：

```bash
# 开发环境
cp .env.development.example .env.development

# 生产环境
cp .env.production.example .env.production
```

环境变量说明：

| 变量 | 说明 |
|------|------|
| `PORT` | 服务端口，默认 3001 |
| `RPC_URL` | 以太坊 RPC URL |
| `RELAYER_PRIVATE_KEY` | Relayer 钱包私钥（用于支付 gas） |
| `FRONTEND_URL` | 前端地址（CORS 配置，支持逗号分隔多个地址） |
| `CHAIN_ID` | 链 ID（1 = Mainnet, 11155111 = Sepolia） |

### 3. 启动开发服务器

```bash
npm run dev
```

开发模式会加载 `.env.development` 配置。

### 4. 生产构建与启动

```bash
npm run build
npm start
```

生产模式会加载 `.env.production` 配置。

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
├── index.ts              # 入口文件
├── config/
│   └── index.ts          # 配置管理
├── constants/
│   └── eip3009.ts        # EIP-3009 常量
├── routes/
│   ├── authorization.ts  # 授权相关路由
│   └── health.ts         # 健康检查路由
├── schemas/
│   └── authorization.ts  # Zod 验证 schema
└── services/
    └── blockchain.ts     # 区块链交互服务
```

## 与前端集成

前端签名后，将签名数据发送到 `/api/authorization/execute` 端点：

```typescript
const response = await fetch('http://localhost:3001/api/authorization/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: {
      from: result.message.from,
      to: result.message.to,
      value: result.message.value.toString(),
      validAfter: result.message.validAfter.toString(),
      validBefore: result.message.validBefore.toString(),
      nonce: result.message.nonce,
    },
    signature: result.signature,
    type: result.type,
  }),
})
```

## 注意事项

- Relayer 钱包需要有足够的 ETH 支付 gas
- 不要将真实私钥提交到版本控制
- 生产环境建议使用 KMS 或硬件钱包管理私钥
