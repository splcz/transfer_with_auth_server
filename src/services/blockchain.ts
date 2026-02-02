import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
  parseSignature,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, sepolia } from 'viem/chains'
import { config } from '../config/index.js'
import { USDC_ADDRESSES, EIP3009_ABI, type AuthorizationType } from '../constants/eip3009.js'

// 链配置
const CHAINS: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
}

// 授权消息结构
export interface AuthorizationMessage {
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  validAfter: bigint
  validBefore: bigint
  nonce: `0x${string}`
}

// 执行授权转账请求
export interface ExecuteAuthorizationRequest {
  message: AuthorizationMessage
  signature: `0x${string}`
  type: AuthorizationType
}

// 交易结果
export interface TransactionResult {
  success: boolean
  transactionHash?: `0x${string}`
  error?: string
}

class BlockchainService {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private usdcAddress: `0x${string}`
  private chain: Chain

  constructor() {
    const chainId = config.chainId
    this.chain = CHAINS[chainId]
    if (!this.chain) {
      throw new Error(`不支持的链 ID: ${chainId}`)
    }

    this.usdcAddress = USDC_ADDRESSES[chainId]
    if (!this.usdcAddress) {
      throw new Error(`链 ${chainId} 上没有 USDC 合约地址`)
    }

    // 创建公共客户端（用于读取链上数据）
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.rpcUrl),
    })

    // 创建钱包客户端（用于发送交易）
    const account = privateKeyToAccount(config.relayerPrivateKey!)
    this.walletClient = createWalletClient({
      account,
      chain: this.chain,
      transport: http(config.rpcUrl),
    })
  }

  // 检查 nonce 是否已被使用
  async isNonceUsed(authorizer: `0x${string}`, nonce: `0x${string}`): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.usdcAddress,
      abi: EIP3009_ABI,
      functionName: 'authorizationState',
      args: [authorizer, nonce],
    })
    return result as boolean
  }

  // 执行授权转账
  async executeAuthorization(request: ExecuteAuthorizationRequest): Promise<TransactionResult> {
    const { message, signature, type } = request

    try {
      // 验证 nonce 未被使用
      const nonceUsed = await this.isNonceUsed(message.from, message.nonce)
      if (nonceUsed) {
        return { success: false, error: 'Nonce 已被使用' }
      }

      // 验证时间有效性
      const now = BigInt(Math.floor(Date.now() / 1000))
      if (message.validAfter > now) {
        return { success: false, error: '授权尚未生效' }
      }
      if (message.validBefore < now) {
        return { success: false, error: '授权已过期' }
      }

      // 解析签名
      const { v, r, s } = parseSignature(signature)

      // 选择调用的函数
      const functionName = type === 'transfer' ? 'transferWithAuthorization' : 'receiveWithAuthorization'

      // 模拟交易
      await this.publicClient.simulateContract({
        address: this.usdcAddress,
        abi: EIP3009_ABI,
        functionName,
        args: [
          message.from,
          message.to,
          message.value,
          message.validAfter,
          message.validBefore,
          message.nonce,
          Number(v),
          r,
          s,
        ],
        account: this.walletClient.account,
      })

      // 发送交易
      const hash = await this.walletClient.writeContract({
        chain: this.chain,
        account: this.walletClient.account!,
        address: this.usdcAddress,
        abi: EIP3009_ABI,
        functionName,
        args: [
          message.from,
          message.to,
          message.value,
          message.validAfter,
          message.validBefore,
          message.nonce,
          Number(v),
          r,
          s,
        ],
      })

      return { success: true, transactionHash: hash }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return { success: false, error: errorMessage }
    }
  }

  // 等待交易确认
  async waitForTransaction(hash: `0x${string}`) {
    return this.publicClient.waitForTransactionReceipt({ hash })
  }

  // 获取 relayer 地址
  getRelayerAddress(): `0x${string}` {
    return this.walletClient.account!.address
  }

  // 获取 relayer ETH 余额
  async getRelayerBalance(): Promise<bigint> {
    return this.publicClient.getBalance({ address: this.getRelayerAddress() })
  }
}

// 单例实例
let blockchainService: BlockchainService | null = null

export function getBlockchainService(): BlockchainService {
  if (!blockchainService) {
    blockchainService = new BlockchainService()
  }
  return blockchainService
}
