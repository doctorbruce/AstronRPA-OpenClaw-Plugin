<h1><img src="./images/icon.png" alt="Astron RPA logo" width="40" style="vertical-align: middle;" /> OpenClaw AstronRPA 连接插件</h1>

这个插件用于连接 OpenClaw 和 AstronRPA Open API，并通过 HTTP 发起调用。

当前工具名：`astron_rpa`

支持的动作：

- `get_workflows`
- `execute_workflow_sync`

英文版说明见 [README.md](./README.md)。

## 前置条件

- 一枚有效的 iFlyRPA Open API Bearer Token
- 一个可以加载 OpenClaw 插件的 OpenClaw 环境

## 安装方式

### 方式 1：从 npm 安装

```bash
openclaw plugins install @astronrpa/openclaw-plugin
```

### 方式 2：手动安装

把当前目录下载或复制到：

```text
~/.openclaw/extensions/astron-rpa
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

### 方式 3：从 GitHub 仓库 clone 后本地安装

先把插件仓库 clone 到本地，再从本地目录 link 安装：

```bash
git clone https://github.com/doctorbruce/AstronRPA-OpenClaw-Plugin.git
cd AstronRPA-OpenClaw-Plugin
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

### 方式 4：从本地压缩包安装

```bash
openclaw plugins install ./astronrpa-openclaw-plugin-1.0.1.tgz
```

## openclaw.json 配置

OpenClaw 的配置文件通常在：

```text
~/.openclaw/openclaw.json
```

在 Windows 上通常是：

```text
C:\Users\<your-username>\.openclaw\openclaw.json
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

`apiKey` 既可以在 OpenClaw 界面里设置，也可以用命令行设置：

```bash
openclaw config set plugins.entries.astron-rpa.config.apiKey 'xxxxxxxxxxx'
```

另外需要启用完整工具配置：

```bash
openclaw config set tools.profile 'full'
```

说明：

- `apiKey` 必填。
- `apiKey` 可以在界面里配置，也可以通过 `openclaw config set plugins.entries.astron-rpa.config.apiKey 'xxxxxxxxxxx'` 设置。
- `baseUrl` 可选；不填时默认使用 `https://newapi.iflyrpa.com/api/rpa-openapi`。
- `astron_rpa` 需要在插件加载后并且 `tools.profile` 设置为 `full` 时才可用。
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

![Get workflows demo](./images/get_workflows.gif)

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

![Run workflow demo](./images/run_workflow.gif)

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

- `openclaw config get tools.profile` 返回的是 `full`
- `plugins.entries["astron-rpa"].enabled` 是否为 `true`
- 如果用了插件白名单，`plugins.allow` 里是否包含 `astron-rpa`
