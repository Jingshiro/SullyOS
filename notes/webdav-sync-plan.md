# WebDAV 云端同步实现方案

本文档详细说明了在 SullyOS 中集成 WebDAV 以支持数据备份与恢复的实现路径。

## 1. 核心需求
- **云端备份**: 将 IndexedDB 中的所有数据（文字+媒体）打包为 ZIP 文件并上传至 WebDAV 服务器。
- **一键恢复**: 从 WebDAV 服务器拉取最新的备份包并还原至本地环境。
- **隐私与安全**: 配置信息（如 App Token）仅保存在本地。

## 2. 技术选型
- **协议**: WebDAV (基于 HTTP 扩展)。
- **客户端**: 使用原生 `fetch` API 实现轻量级 WebDAV 客户端，避免引入外部依赖。
- **打包**: 复用现有的 `JSZip` 逻辑进行数据压缩。

## 3. 实现步骤

### 3.1 类型定义 (`types.ts`)
新增 `WebDAVConfig` 接口，用于存储连接配置。
```typescript
export interface WebDAVConfig {
  enabled: boolean;
  url: string;
  username: string;
  password: string; // 应用授权码/密码
  path: string;     // 服务器存储路径，例如 /SullyOS/backups
  autoBackup?: boolean;
}
```

### 3.2 WebDAV 客户端工具 (`utils/webdavClient.ts`)
实现基础的 WebDAV 操作：
- `putFile(path, content)`: 使用 `PUT` 方法上传。
- `getFile(path)`: 使用 `GET` 方法下载。
- `createDirectory(path)`: 使用 `MKCOL` 方法创建目录。
- `listFiles(path)`: 使用 `PROPFIND` 获取文件列表（用于查找最新备份）。

### 3.3 OSContext 集成 (`context/OSContext.tsx`)
- **状态管理**: 增加 `webdavConfig` 状态及其更新方法。
- **同步逻辑**:
  - `backupToWebDAV()`: 
    1. 调用 `exportSystem('full')` 获取 Blob。
    2. 生成文件名 `Sully_Backup_latest.zip` 或带时间戳的文件名。
    3. 调用 WebDAV 客户端进行上传。
  - `restoreFromWebDAV()`:
    1. 从服务器获取备份文件 Blob。
    2. 调用 `importSystem(blob)` 进行还原。

### 3.4 UI 界面 (`apps/Settings.tsx`)
- 在“系统设置”中增加“WebDAV 云同步”板块。
- 提供配置入口（服务器地址、账号、授权码、路径）。
- 增加“立即同步”和“从云端恢复”按钮。
- 显示同步进度与状态。

## 4. 流程细节

### 4.1 备份流程
1. 用户点击“立即同步”。
2. 系统调用 `exportSystem`。
3. `JSZip` 将 IndexedDB 内容（包含 assets 文件夹下的媒体文件）打包。
4. WebDAV 客户端通过 `PUT` 请求将 ZIP 流式传输到指定 URL。
5. 提示同步成功。

### 4.2 恢复流程
1. 用户点击“从云端恢复”。
2. WebDAV 客户端通过 `GET` 请求下载 ZIP。
3. 调用 `importSystem`。
4. `importSystem` 解析 ZIP 内部的 `data.json` 和 `assets/` 文件夹。
5. 自动还原 IndexedDB 记录并重新应用主题配置。

## 5. 安全建议
- 建议用户使用坚果云 (Nutstore)、Nextcloud 或自建 WebDAV 服务。
- 引导用户使用“应用授权码”而非主密码以增强安全性。

## 6. 后续扩展
- **自动备份**: 在系统闲置或退出时自动触发增量/全量同步。
- **多版本管理**: 在 WebDAV 目录中保留最近 3-5 个版本的备份。
