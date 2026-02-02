import express from 'express'
import cors from 'cors'
import { config, validateConfig } from './config/index.js'
import authorizationRoutes from './routes/authorization.js'
import healthRoutes from './routes/health.js'

// 验证配置
validateConfig()

const app = express()

// 中间件
app.use(cors({
  origin: config.frontendUrls,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}))
app.use(express.json())

// 请求日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// 路由
app.use('/api/authorization', authorizationRoutes)
app.use('/api/health', healthRoutes)

// 根路径
app.get('/', (_req, res) => {
  res.json({
    name: 'Transfer With Authorization Server',
    version: '1.0.0',
    description: 'EIP-3009 TransferWithAuthorization 服务端',
    endpoints: {
      health: 'GET /api/health',
      execute: 'POST /api/authorization/execute',
      nonceStatus: 'GET /api/authorization/nonce-status?authorizer=0x...&nonce=0x...',
      transactionStatus: 'GET /api/authorization/transaction/:hash',
    },
  })
})

// 404 处理
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

// 启动服务器
app.listen(config.port, () => {
  console.log(`
🚀 Transfer With Authorization Server 已启动
   环境: ${config.env}
   端口: ${config.port}
   链 ID: ${config.chainId}
   允许的前端地址: ${config.frontendUrls.join(', ')}
  `)
})
