# ☕ Kite AI Coffee Agent

> **Kite AI Hackathon 参赛项目**  
> 基于 Kite Account Abstraction SDK 的 AI Agent 支付示例

## 🎯 项目概述

本项目实现了一个"咖啡店 AI Agent"，展示如何使用 Kite AI 的核心能力：

| 参赛要求 | 实现方式 |
|---------|---------|
| ✅ **链上支付** | 使用 AA SDK 完成测试网 USDT 转账 |
| ✅ **Agent 身份** | 使用 Kite Account Abstraction 创建 Agent 钱包 |
| ✅ **权限控制** | 单笔最大 1 USDT，日最大 10 USDT |
| ✅ **可复现性** | 完整的安装和运行说明 |

## 🚀 快速开始（5分钟上手）

### 前置条件

- Node.js 18+ (`node -v` 检查版本)
- npm (`npm -v` 检查版本)

### Step 1: 安装依赖

```bash
cd kite-ai-coffee-agent
npm install
```

### Step 2: 创建钱包

你需要准备 **2个钱包地址**：

#### 钱包 A: Agent 签名钱包
用于签署 Agent 交易的 EOA 钱包：

1. 打开 MetaMask → 创建新账户
2. 导出私钥：设置 → 安全与隐私 → 显示私钥
3. 保存私钥（稍后填入 `PRIVATE_KEY`）

#### 钱包 B: 商户收款地址
模拟咖啡店收款的地址：

1. 可以是你的另一个钱包地址
2. 可以创建一个新钱包
3. 可以使用任何有效的以太坊地址格式（0x 开头，42字符）

> 💡 **提示**: 在测试环境中，商户地址可以是任何有效地址，因为我们只是模拟支付流程。

### Step 3: 配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑 .env 文件
```

填入你的配置：

```env
# 钱包 A 的私钥（用于签署交易）
PRIVATE_KEY=你的私钥（不含0x前缀）

# 钱包 B 的地址（收款地址）
MERCHANT_ADDRESS=0x你的商户地址
```

### Step 4: 获取测试代币（重要！）

你的 Agent AA 钱包需要有 USDT 测试代币才能完成转账。

#### 4.1 先运行一次获取 AA 钱包地址

```bash
npm run start
```

输出中会显示：
```
✅ AA Wallet Address: 0x1C89b31EB47d16d80aa9fD24B1954EAB05FcFE21
```

**记录这个 AA Wallet Address**（不是 EOA Address）！

#### 4.2 向 AA 钱包转入测试 USDT

你需要向 **AA Wallet Address** 转入测试 USDT：

**方式一：使用 Kite Faucet（推荐）**
- 访问 [Kite Testnet Faucet](https://faucet.gokite.ai)
- 输入你的 AA Wallet Address
- 领取测试代币

**方式二：联系 Kite 官方**
- 加入 Kite Discord / Telegram
- 提供 AA Wallet Address 申请测试代币

**方式三：从其他钱包转入**
- 如果你有其他钱包有 Kite 测试网 USDT
- 转账到 AA Wallet Address

> ⚠️ **注意**：是向 **AA Wallet Address** 转入代币，不是 EOA Address！

#### 4.3 验证余额

运行程序时会显示余额：
```
📊 Agent Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Native Balance: 0.0 KITE
💰 Token Balance: 1.0 USDT     <-- 需要有余额
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 5: 运行 Demo

```bash
npm run start
```

## 📊 预期输出

```
═══════════════════════════════════════════════════════
  ☕ Kite AI Coffee Agent - Demo
  Account Abstraction powered payment agent
═══════════════════════════════════════════════════════

📋 Step 1: Validating configuration...
✅ Configuration validated successfully

📋 Step 2: Creating Coffee Agent...

📋 Current Payment Policy:
   Max single payment: 1 USDT
   Max daily spending: 10 USDT

🤖 Creating Kite AA Agent...
✅ EOA Signer created: 0x...
✅ AA Wallet Address: 0x...

📋 New Order Received
   Item: Latte
   Price: 0.03 USDT

🔍 Validating payment against policy...
✅ Payment validation passed

💳 Initiating payment...
🚀 Sending user operation to bundler...
✅ Payment successful!
   Transaction Hash: 0x...
   Explorer URL: https://testnet.kitescan.ai/tx/0x...
```

## 📁 项目结构

```
src/
├── index.ts              # 主入口 - 模拟咖啡订单流程
├── config.ts             # 配置管理
├── agent/
│   ├── createAgent.ts    # 🔑 Agent 创建（Kite AA SDK）
│   ├── policy.ts         # 📋 支付规则（权限控制）
│   └── coffeeAgent.ts    # ☕ 咖啡店 Agent 主逻辑
└── payment/
    └── payWithAgent.ts   # 💳 链上支付执行
```

## 🔧 核心功能详解

### 1. Agent 身份创建 (`createAgent.ts`)

使用 Kite Account Abstraction SDK 创建智能合约钱包：

```typescript
import { GokiteAASDK } from 'gokite-aa-sdk';

// 初始化 SDK
const sdk = new GokiteAASDK(
  'kite_testnet',
  'https://rpc-testnet.gokite.ai',
  'https://bundler-service.staging.gokite.ai/rpc/'
);

// 获取 AA 钱包地址
const aaWalletAddress = sdk.getAccountAddress(eoaAddress);
```

### 2. 支付权限控制 (`policy.ts`)

定义严格的支付限制策略：

```typescript
const paymentPolicy = {
  maxSinglePayment: 1.0,      // 单笔最大 1 USDT
  maxDailySpending: 10.0,     // 日累计最大 10 USDT
  allowedCurrencies: ['USDT'], // 仅允许 USDT
  timeWindowSeconds: 86400,   // 24小时滚动窗口
};

// 验证支付是否符合规则
const validation = validatePayment(amount, currency, policy);
if (!validation.isValid) {
  throw new Error(validation.reason);
}
```

### 3. 链上 USDT 转账 (`payWithAgent.ts`)

通过 ERC-4337 UserOperation 执行 gasless 转账：

```typescript
// 编码 ERC20 transfer 调用
const transferCallData = erc20Interface.encodeFunctionData('transfer', [
  recipientAddress,
  ethers.parseUnits(amount.toString(), 18)
]);

// 发送 UserOperation
const result = await sdk.sendUserOperationAndWait(
  eoaAddress,
  { target: tokenAddress, value: 0n, callData: transferCallData },
  signFunction
);
```

## 📋 Demo 订单说明

程序会模拟处理 3 个订单：

| 订单 | 价格 | 预期结果 |
|-----|------|---------|
| Latte | 0.03 USDT | ✅ 成功 - 金额在限额内 |
| Espresso | 0.02 USDT | ✅ 成功 - 金额在限额内 |
| Premium Gold Coffee | 1.5 USDT | ❌ 失败 - 超过单笔限额(1 USDT) |

这展示了 **权限控制** 功能：超过限额的订单会被自动拒绝。

## 🌐 Kite 测试网信息

| 资源 | 地址 |
|-----|------|
| RPC | `https://rpc-testnet.gokite.ai` |
| Bundler | `https://bundler-service.staging.gokite.ai/rpc/` |
| USDT Token | `0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63` |
| Block Explorer | https://testnet.kitescan.ai |
| Faucet | https://faucet.gokite.ai |

## ❓ 常见问题

### Q: 商户地址怎么填？
A: 可以使用任何有效的以太坊地址。建议创建一个新钱包，使用其地址作为商户。这是测试环境，不涉及真实资金。

### Q: 交易显示 "execution reverted" 或 "Unknown error"？
A: 这通常是因为 AA 钱包没有足够的 USDT 余额。请确保：
1. 运行程序获取 **AA Wallet Address**（不是 EOA Address）
2. 向 **AA Wallet Address** 转入测试 USDT
3. 再次运行程序

### Q: 权限控制功能正常但支付失败？
A: 这是预期行为！程序分两步：
1. **权限验证**（本地）- 检查金额是否超过限额
2. **链上支付**（需要代币）- 执行实际转账

如果权限验证通过但链上支付失败，说明权限控制功能正常，只需要补充测试代币即可。

### Q: 第三个订单失败是 bug 吗？
A: 不是！这是**预期行为**，用于展示权限控制功能：
- 订单价格 1.5 USDT > 单笔限额 1 USDT
- 被 policy 正确拒绝，不会发起链上交易

### Q: 如何获取更多测试代币？
A: 
1. 访问 [Kite Faucet](https://faucet.gokite.ai)
2. 加入 Kite 官方社区申请
3. 联系 Hackathon 组织者

## 🔐 安全提示

⚠️ **重要安全事项**：

1. **不要**将真实私钥提交到 Git
2. `.env` 文件已在 `.gitignore` 中排除
3. 本 Demo 仅用于测试网，请勿使用主网私钥
4. 生产环境应使用硬件钱包或 KMS 服务

## 📚 参考资料

- [Kite AI 官方文档](https://docs.gokite.ai)
- [Account Abstraction SDK](https://docs.gokite.ai/advanced-topics/account-abstraction-sdk)
- [gokite-aa-sdk NPM](https://www.npmjs.com/package/gokite-aa-sdk)
- [ERC-4337 规范](https://eips.ethereum.org/EIPS/eip-4337)

## 📝 License

MIT

---

**🏆 Kite AI Hackathon 参赛作品**

本项目满足所有参赛基础要求：
- ✅ 链上支付 - 完成测试网 USDT 转账
- ✅ Agent 身份 - 使用 Kite AA SDK 创建 Agent
- ✅ 权限控制 - 实现支付额度限制
- ✅ 可复现性 - 提供完整运行说明
