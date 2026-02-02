import dotenv from 'dotenv'
import path from 'path'

// 根据 NODE_ENV 加载对应的 .env 文件
const env = process.env.NODE_ENV || 'development'
const envFile = `.env.${env}`

// 先加载环境特定文件，再加载通用 .env（如果存在）
dotenv.config({ path: path.join(process.cwd(), envFile) })
dotenv.config({ path: path.join(process.cwd(), '.env') })

// 解析多个前端地址（逗号分隔）
const parseFrontendUrls = (urls: string | undefined): string[] => {
  if (!urls) return ['http://localhost:5173']
  return urls.split(',').map(url => url.trim()).filter(Boolean)
}

export const config = {
  env,
  port: parseInt(process.env.PORT || '3001', 10),
  rpcUrl: process.env.RPC_URL || '',
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY as `0x${string}` | undefined,
  frontendUrls: parseFrontendUrls(process.env.FRONTEND_URL),
  chainId: parseInt(process.env.CHAIN_ID || '1', 10),
}

export function validateConfig(): void {
  if (!config.rpcUrl) {
    throw new Error('RPC_URL 环境变量未设置')
  }
  if (!config.relayerPrivateKey) {
    throw new Error('RELAYER_PRIVATE_KEY 环境变量未设置')
  }
  if (!config.relayerPrivateKey.startsWith('0x')) {
    throw new Error('RELAYER_PRIVATE_KEY 必须以 0x 开头')
  }
}
