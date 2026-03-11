# Astron RPA 插件

Astron RPA 是一个 OpenClaw 工具插件，用来通过 HTTP 调用 iFlyRPA Open API。

当前工具名：`astron_rpa`

支持的动作：

- `get_workflows`
- `execute_workflow_sync`

英文版说明见 [README.md](./README.md)。

## 前置条件

- 一枚有效的 iFlyRPA Open API Bearer Token
- 一个可以加载 OpenClaw 插件的 OpenClaw 环境

## 安装方式

### 方式 1：手动安装

把当前目录下载或复制到：

```text
~/openclaw/extensions/astron-rpa
```

确保目录中包含这些文件：

- `plugin.ts`
- `openclaw.plugin.json`
- `package.json`

然后运行：

```bash
openclaw plugins list
```

确认 `astron-rpa` 已经出现在插件列表中。

### 方式 2：从 GitHub 仓库 clone 后本地安装

先把插件仓库 clone 到本地，再从本地目录 link 安装：

```bash
git clone <你的插件仓库地址>
cd <你的插件仓库>
openclaw plugins install -l .
```

然后检查是否安装成功：

```bash
openclaw plugins info astron-rpa
openclaw plugins list
```

注意：

- `openclaw plugins install` 不能直接安装 GitHub 仓库 URL。
- 目前支持的是本地路径、本地压缩包（`.zip` / `.tgz` / `.tar.gz`）以及 npm 包名。

### 方式 3：从本地压缩包安装

```bash
openclaw plugins install ./astron-rpa.tgz
```

## openclaw.json 配置

OpenClaw 的配置文件通常在：

```text
~/.openclaw/openclaw.json
```

你这台 Windows 机器上的路径是：

```text
C:\Users\zyzhou23\.openclaw\openclaw.json
```

最小可用配置如下：

```json5
{
  plugins: {
    entries: {
      "astron-rpa": {
        enabled: true,
        config: {
          apiKey: "YOUR_IFLYRPA_BEARER_TOKEN",
          baseUrl: "https://newapi.iflyrpa.com/api/rpa-openapi",
          timeoutMs: 30000
        }
      }
    }
  }
}
```

说明：

- `apiKey` 必填。
- `baseUrl` 可选；不填时默认使用 `https://newapi.iflyrpa.com/api/rpa-openapi`。
- `astron_rpa` 在插件加载后默认可用，不需要再额外写 `tools.allow`。
- 如果你的配置启用了 `plugins.allow` 白名单，还需要把 `astron-rpa` 加进去。

例如：

```json5
{
  plugins: {
    allow: ["astron-rpa"]
  }
}
```

## 重启

修改插件文件或 `openclaw.json` 之后，需要重启 Gateway。

## 使用方法

### 1. 获取工作流列表

```json
{
  "action": "get_workflows"
}
```

对应请求：

```text
GET https://newapi.iflyrpa.com/api/rpa-openapi/workflows/get
Authorization: Bearer <token>
```

### 2. 同步执行工作流

```json
{
  "action": "execute_workflow_sync",
  "project_id": "1950846340813021184",
  "exec_position": "EXECUTOR",
  "params": {}
}
```

对应请求：

```text
POST https://newapi.iflyrpa.com/api/rpa-openapi/workflows/execute
Authorization: Bearer <token>
Content-Type: application/json
```

## 发布建议

如果你准备把它做成独立仓库，建议包根目录至少保留这些文件：

- `plugin.ts`
- `openclaw.plugin.json`
- `package.json`
- `README.md`
- `README.zh-CN.md`

如果后续发布到 npm，用户就可以直接这样安装：

```bash
openclaw plugins install @openclaw/astron-rpa
```

## 调试

插件会输出这些调试信息：

- 请求 URL
- HTTP 状态码
- Content-Type
- 非 JSON 响应的预览内容

常用检查命令：

```bash
openclaw plugins info astron-rpa
openclaw plugins doctor
```

如果 agent 看不到这个工具，优先检查：

- `plugins.entries["astron-rpa"].enabled` 是否为 `true`
- 如果用了插件白名单，`plugins.allow` 里是否包含 `astron-rpa`
