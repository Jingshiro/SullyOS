# S3 (Cloudflare R2) 云端同步实现方案

本文档详细说明了在 SullyOS 中从 WebDAV 迁移至 S3 兼容协议（重点以 Cloudflare R2 为例）以支持数据备份与恢复的实现路径。

## 1. 为什么从 WebDAV 迁移到 S3？
- **完美解决 CORS 问题**: WebDAV 依赖 `PROPFIND` 等非标准 HTTP 方法以及自定义 Headers，导致在纯前端应用（如浏览器）中极易触发跨域拦截。S3 服务原生支持细粒度的 CORS 配置。
- **高稳定性和成熟度**: 借助官方的 `@aws-sdk/client-s3`，我们可以利用其分片上传、自动重试等机制，比手写 WebDAV 客户端要稳定得多。
- **免流/低成本**: Cloudflare R2 提供极高的免费额度，非常适合个人使用，且无需专门维护服务器。

## 2. 核心需求
- **云端备份**: 将 IndexedDB 中的所有数据打包为 ZIP 文件并上传至 S3/R2 Bucket。
- **一键恢复**: 从 S3/R2 拉取最新的备份包并还原至本地环境。
- **多版本存储 (可选)**: 基于时间戳保存备份，支持回滚。

## 3. 开发实现规划

### 3.1 依赖安装
在前端应用中安装轻量级的 AWS S3 v3 客户端（按需引入，不会大幅增加打包体积）：
```bash
npm install @aws-sdk/client-s3
```

### 3.2 S3 客户端工具 (`utils/s3Client.ts`)
新建并替换之前的 `webdavClient.ts`，实现以下基础操作：
- `uploadBackup(file: Blob, filename: string)`: 使用 `PutObjectCommand` 上传 ZIP 备份。
- `downloadBackup(filename: string)`: 使用 `GetObjectCommand` 获取备份。
- `listBackups()`: 使用 `ListObjectsV2Command` 获取最近的备份列表。

### 3.3 类型定义与状态 (`types.ts` & `context/OSContext.tsx`)
修改状态，从 `webdavConfig` 迁移到 `s3Config`：
```typescript
export interface S3Config {
  enabled: boolean;
  endpoint: string;     // 例如 https://<account_id>.r2.cloudflarestorage.com
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;       // R2 通常填 'auto'
}
```

### 3.4 UI 界面更新 (`apps/Settings.tsx`)
- 在“系统设置”中移除“WebDAV 同步”，改为“S3/Cloudflare R2 云同步”。
- 提供新的配置表单：Endpoint URL、Access Key、Secret Key、Bucket Name。
- 增加测试连接功能。
- 保留原有的“立即备份”和“恢复”按钮逻辑，底层调用新封装的 `s3Client.ts`。

---

## 4. 用户配置指南 (Cloudflare R2)

为了让应用能够直接从浏览器端访问 Cloudflare R2，你需要按照以下步骤完成云端配置：

### 第一步：新建专属 Bucket
1. 登录 Cloudflare 控制台，进入 **R2**。
2. 点击 **Create bucket**，为 SullyOS 创建一个专用的 Bucket（例如命名为 `sullyos-backup`），以区分你的 Obsidian 笔记等其他数据。

### 第二步：配置 CORS 策略（极其重要）
1. 在 R2 控制台点击你刚创建的 Bucket，切换到 **Settings（设置）**。
2. 找到 **CORS Policy（CORS 策略）**，点击 **Add CORS policy**。
3. 粘贴以下 JSON 配置并保存：
```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://你的线上应用域名.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3000
  }
]
```
*(注：开发阶段可以把 `AllowedOrigins` 设为 `["*"]`，但上线时请务必限制为你自己的部署域名，如 Netlify 或 Vercel 提供的域名)*

### 第三步：创建 API 凭证 (Token)
千万不要使用具有全局权限的 Token，我们要遵循“最小权限原则”：
1. 回到 **R2 主界面**（离开具体的 Bucket 详情页），点击右侧的 **Manage R2 API Tokens（管理 R2 API 令牌）**。
2. 点击 **Create API token**。
3. **Permissions（权限设置）**：选择 **Object Read & Write（对象读写）**。
4. **Specify bucket(s)（指定存储桶）**：选择 **Apply to specific buckets only**，然后**只勾选**你刚刚为 SullyOS 创建的 Bucket。
5. 点击创建。

### 第四步：保存关键信息
创建成功后，页面会显示以下信息，请**立刻复制并妥善保存**，然后填入 SullyOS 的设置页面中：
- **S3 API URL** (对应 Endpoint，类似于 `https://<account_id>.r2.cloudflarestorage.com`)
- **Access Key ID**
- **Secret Access Key** (关闭页面后将无法再次查看！)
- **Bucket 名称**
