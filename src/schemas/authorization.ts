import { z } from 'zod'

// 以太坊地址验证
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, '无效的以太坊地址')

// bytes32 验证
const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, '无效的 bytes32')

// 签名验证
const signatureSchema = z.string().regex(/^0x[a-fA-F0-9]{130}$/, '无效的签名')

// 授权类型验证
const authTypeSchema = z.enum(['transfer', 'receive'])

// 授权消息 schema
export const authorizationMessageSchema = z.object({
  from: addressSchema,
  to: addressSchema,
  value: z.string().regex(/^\d+$/, '无效的金额'),
  validAfter: z.string().regex(/^\d+$/, '无效的时间戳'),
  validBefore: z.string().regex(/^\d+$/, '无效的时间戳'),
  nonce: bytes32Schema,
})

// 执行授权请求 schema
export const executeAuthorizationSchema = z.object({
  message: authorizationMessageSchema,
  signature: signatureSchema,
  type: authTypeSchema,
})

// 类型导出
export type AuthorizationMessageInput = z.infer<typeof authorizationMessageSchema>
export type ExecuteAuthorizationInput = z.infer<typeof executeAuthorizationSchema>
