import { Router, type Request, type Response } from 'express'
import { formatEther } from 'viem'
import { getBlockchainService } from '../services/blockchain.js'
import { config } from '../config/index.js'

const router = Router()

// 健康检查
router.get('/', async (_req: Request, res: Response) => {
  try {
    const service = getBlockchainService()
    const relayerAddress = service.getRelayerAddress()
    const balance = await service.getRelayerBalance()

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      chainId: config.chainId,
      relayer: {
        address: relayerAddress,
        balance: formatEther(balance),
      },
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误',
    })
  }
})

export default router
