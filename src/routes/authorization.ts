import { Router, type Request, type Response } from 'express'
import { getBlockchainService, type AuthorizationMessage } from '../services/blockchain.js'
import { executeAuthorizationSchema, type ExecuteAuthorizationInput } from '../schemas/authorization.js'
import { ZodError } from 'zod'

const router = Router()

// 执行授权转账
router.post('/execute', async (req: Request, res: Response) => {
  try {
    // 验证请求体
    const input: ExecuteAuthorizationInput = executeAuthorizationSchema.parse(req.body)

    // 转换消息格式
    const message: AuthorizationMessage = {
      from: input.message.from as `0x${string}`,
      to: input.message.to as `0x${string}`,
      value: BigInt(input.message.value),
      validAfter: BigInt(input.message.validAfter),
      validBefore: BigInt(input.message.validBefore),
      nonce: input.message.nonce as `0x${string}`,
    }

    // 执行授权
    const service = getBlockchainService()
    const result = await service.executeAuthorization({
      message,
      signature: input.signature as `0x${string}`,
      type: input.type,
    })

    if (result.success) {
      res.json({
        success: true,
        transactionHash: result.transactionHash,
        message: '交易已提交',
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      })
    }
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: '请求参数验证失败',
        details: error.errors,
      })
      return
    }

    console.error('执行授权失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
})

// 检查 nonce 状态
router.get('/nonce-status', async (req: Request, res: Response) => {
  try {
    const { authorizer, nonce } = req.query

    if (!authorizer || typeof authorizer !== 'string') {
      res.status(400).json({ success: false, error: '缺少 authorizer 参数' })
      return
    }
    if (!nonce || typeof nonce !== 'string') {
      res.status(400).json({ success: false, error: '缺少 nonce 参数' })
      return
    }

    const service = getBlockchainService()
    const isUsed = await service.isNonceUsed(authorizer as `0x${string}`, nonce as `0x${string}`)

    res.json({
      success: true,
      authorizer,
      nonce,
      isUsed,
    })
  } catch (error) {
    console.error('检查 nonce 状态失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
})

// 获取交易状态
router.get('/transaction/:hash', async (req: Request, res: Response) => {
  try {
    const hash = req.params.hash

    if (!hash || typeof hash !== 'string' || !hash.startsWith('0x')) {
      res.status(400).json({ success: false, error: '无效的交易哈希' })
      return
    }

    const service = getBlockchainService()
    const receipt = await service.waitForTransaction(hash as `0x${string}`)

    res.json({
      success: true,
      transactionHash: hash,
      status: receipt.status === 'success' ? 'confirmed' : 'failed',
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
    })
  } catch (error) {
    console.error('获取交易状态失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
})

export default router
