# 和风天气 (QWeather) API 接入指南

本文档整理了将天气服务从 OpenWeatherMap 迁移至**和风天气 (QWeather)** 所需的 API 调用方法和相关配置。

## 1. 基础配置

### 1.1 API Host (请求域名)
和风天气目前使用**专属独立域名**（API Host），每个开发者需要在控制台获取自己专属的 API Host（格式类似 `abc1234xyz.def.qweatherapi.com`）。
* **注意**：旧版的公共域名（如 `api.qweather.com` 或 `devapi.qweather.com`）正逐步废弃，请务必使用控制台中分配的专属域名。
* **数据格式**：所有接口均返回 **JSON** 格式数据，并默认采用 **Gzip 压缩**以优化传输。
* **请求方式**：主要使用 **GET** 请求。

### 1.2 鉴权认证 (Authentication)
和风天气支持两种鉴权方式，推荐使用更安全的 **JWT** 方式。

#### 方案 A：JWT 认证（强烈推荐）
* **算法**：Ed25519 (EdDSA)
* **Header**：包含 `alg` ("EdDSA") 和 `kid` (控制台获取的凭据 ID)。
* **Payload**：包含 `sub` (项目 ID)、`iat` (签发时间戳) 和 `exp` (过期时间，最长 24 小时)。
* **调用方式**：在 HTTP 请求头中添加：`Authorization: Bearer <YOUR_JWT>`

#### 方案 B：API KEY 认证
可以将其放在请求头或 URL 参数中：
1. **Header 方式**：`X-QW-Api-Key: <YOUR_API_KEY>`
2. **URL 参数方式**：`&key=<YOUR_API_KEY>`
* **注意**：最新的 SDK（v5+）已不再支持纯 API KEY 方式。从 2027 年起，API KEY 方式将会有每日请求量限制。

---

## 2. 城市搜索 API (City Lookup)
在获取天气之前，通常需要先通过此接口将城市名称、IP 或坐标转换为和风天气内部的 `LocationID`。

* **请求路径**：`/geo/v2/city/lookup`
* **核心请求参数**：
  * `location` (必填)：需要查询的城市名称（支持模糊搜索）、经纬度坐标（格式：`经度,纬度`，如 `116.41,39.92`）、LocationID 或 Adcode。
  * `adm` (可选)：指定父级行政区划，用于解决同名城市问题（例如 `adm=beijing`）。
  * `range` (可选)：限制搜索范围在特定国家内，使用 ISO 3166 代码（如 `range=cn`）。
  * `number` (可选)：返回结果的数量，范围 1-20，默认 10。
  * `lang` (可选)：多语言设置。
* **核心响应字段**：
  * `location[]`：匹配的城市数组。
    * `id`：**LocationID（后续查询天气的关键参数）**。
    * `name`：城市名称。
    * `lat` / `lon`：纬度 / 经度。
    * `adm1` / `adm2`：所属省份 / 城市。

---

## 3. 实时天气 API (Weather Now)
获取指定位置的实时天气状况（通常有 5-20 分钟左右的延迟）。

* **请求路径**：`/v7/weather/now`
* **核心请求参数**：
  * `location` (必填)：上一步获取的 `LocationID`，也可以直接传经纬度坐标（`经度,纬度`）。
  * `unit` (可选)：单位制，`m` 为公制（默认），`i` 为英制。
  * `lang` (可选)：多语言设置（默认中文）。
* **核心响应字段**：
  * `now.obsTime`：数据观测时间。
  * `now.temp`：当前温度（默认摄氏度）。
  * `now.feelsLike`：体感温度。
  * `now.text`：天气状况的文字描述（如 "晴", "多云"）。
  * `now.icon`：天气状况的图标代码（可用于前端匹配对应的天气图标 UI）。
  * `now.windDir` / `now.windScale` / `now.windSpeed`：风向、风力等级、风速。
  * `now.humidity`：相对湿度（百分比）。
  * `now.precip`：过去一小时的降水量。
  * `now.pressure`：大气压强。
  * `now.vis`：能见度（公里）。

---

## 4. 迁移建议（从 OpenWeatherMap 到 QWeather）
1. **配置环境变量**：在 `.env` 中替换原来的 OpenWeatherMap API Key，新增 QWeather 的 `API_HOST`、`PROJECT_ID` 和 `CREDENTIAL_ID`（如果使用 JWT）或 `API_KEY`。
2. **重构请求逻辑**：
   - 以前可能是直接传经纬度或城市名给 OpenWeatherMap。在和风天气中，虽然实时天气接口也支持直接传经纬度，但官方更推荐先通过**城市搜索 API** 拿到精确的 `LocationID`，再用 `LocationID` 请求天气数据。
3. **字段映射更新**：前端展示层需要更新对天气数据字段的映射，例如把原来读取 `main.temp` 改为读取 `now.temp`，把 `weather[0].description` 改为 `now.text` 等。
4. **图标替换**：检查项目现有的天气图标库，根据和风天气的 `icon` 代码进行相应的映射。