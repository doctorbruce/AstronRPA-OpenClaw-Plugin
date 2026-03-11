import type { AnyAgentTool, OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const DEFAULT_BASE_URL = "https://newapi.iflyrpa.com/api/rpa-openapi";

type AstronRpaConfig = {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
};

type AstronRpaParams = {
  action?: "execute_workflow_sync" | "get_workflows";
  exec_position?: string;
  params?: Record<string, unknown>;
  project_id?: string;
  query?: Record<string, string | number | boolean>;
  version?: number;
};

const parameters = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: {
      type: "string",
      enum: ["get_workflows", "execute_workflow_sync"],
      description: "Which Astron RPA API to call.",
    },
    project_id: {
      type: "string",
      description: "Workflow project ID. Required for execute_workflow_sync.",
    },
    exec_position: {
      type: "string",
      description: 'Execution position. Defaults to "EXECUTOR".',
    },
    version: {
      type: "integer",
      description: "Optional workflow version.",
    },
    params: {
      type: "object",
      description: "Workflow input parameters.",
      additionalProperties: true,
    },
    query: {
      type: "object",
      description: "Optional query parameters for get_workflows.",
      additionalProperties: {
        type: ["string", "number", "boolean"],
      },
    },
  },
} as const;

function readConfig(pluginConfig: unknown): AstronRpaConfig {
  if (!pluginConfig || typeof pluginConfig !== "object" || Array.isArray(pluginConfig)) {
    return {};
  }

  const raw = pluginConfig as Record<string, unknown>;
  return {
    apiKey: typeof raw.apiKey === "string" ? raw.apiKey : undefined,
    baseUrl: typeof raw.baseUrl === "string" ? raw.baseUrl : undefined,
    timeoutMs: typeof raw.timeoutMs === "number" ? raw.timeoutMs : undefined,
  };
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | boolean>) {
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(normalizedPath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function result(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

function safePreview(text: string, limit = 500) {
  return text.length <= limit ? text : `${text.slice(0, limit)}...`;
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join(", ") : (value ?? "");
}

async function sendJsonRequest(params: {
  body?: unknown;
  headers: Record<string, string>;
  method: "GET" | "POST";
  timeoutMs: number;
  url: string;
}) {
  const url = new URL(params.url);
  const requestImpl =
    url.protocol === "https:" ? httpsRequest : url.protocol === "http:" ? httpRequest : undefined;

  if (!requestImpl) {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }

  const bodyText = params.body === undefined ? undefined : JSON.stringify(params.body);

  return await new Promise<{
    ok: boolean;
    status: number;
    body: {
      parsed: unknown;
      rawText: string;
      contentType: string;
      isJson: boolean;
    };
  }>((resolve, reject) => {
    const request = requestImpl(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : undefined,
        path: `${url.pathname}${url.search}`,
        method: params.method,
        headers: {
          ...params.headers,
          ...(bodyText === undefined
            ? {}
            : {
                "Content-Length": Buffer.byteLength(bodyText).toString(),
              }),
        },
        timeout: params.timeoutMs,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const contentType = getHeaderValue(response.headers["content-type"]);
          const status = response.statusCode ?? 0;

          try {
            resolve({
              ok: status >= 200 && status < 300,
              status,
              body: {
                parsed: JSON.parse(text) as unknown,
                rawText: text,
                contentType,
                isJson: true,
              },
            });
          } catch {
            resolve({
              ok: status >= 200 && status < 300,
              status,
              body: {
                parsed: null,
                rawText: text,
                contentType,
                isJson: false,
              },
            });
          }
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error(`Request timed out after ${params.timeoutMs}ms`));
    });

    request.on("error", reject);

    if (bodyText !== undefined) {
      request.write(bodyText);
    }

    request.end();
  });
}

export default function register(api: OpenClawPluginApi) {
  const config = readConfig(api.pluginConfig);

  api.registerTool(
    {
      name: "astron_rpa",
      description: "Get workflows or execute an Astron RPA workflow synchronously.",
      parameters,
      async execute(_toolCallId, params: AstronRpaParams) {
        const apiKey = config.apiKey?.trim();
        if (!apiKey) {
          return result({
            ok: false,
            error: 'Missing plugins.entries["astron-rpa"].config.apiKey',
          });
        }

        const baseUrl = (config.baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
        const headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };

        try {
          if ((params.action ?? "get_workflows") === "get_workflows") {
            const url = buildUrl(baseUrl, "workflows/get", params.query);

            api.logger.info(`[astron-rpa] GET ${url}`);

            const response = await sendJsonRequest({
              url,
              method: "GET",
              headers,
              timeoutMs: config.timeoutMs ?? 30000,
            });

            const body = response.body;
            api.logger.info(
              `[astron-rpa] GET ${url} -> ${response.status} ${body.contentType || "unknown-content-type"}`,
            );

            if (!body.isJson) {
              api.logger.warn(
                `[astron-rpa] Non-JSON response preview: ${safePreview(body.rawText)}`,
              );
            }

            return result({
              ok: response.ok,
              status: response.status,
              url,
              contentType: body.contentType,
              data: body.isJson ? body.parsed : body.rawText,
              responsePreview: body.isJson ? undefined : safePreview(body.rawText),
            });
          }

          if (!params.project_id?.trim()) {
            return result({
              ok: false,
              error: "project_id is required for execute_workflow_sync",
            });
          }

          const url = buildUrl(baseUrl, "workflows/execute");
          const payload = {
            project_id: params.project_id.trim(),
            exec_position: params.exec_position?.trim() || "EXECUTOR",
            params: params.params ?? {},
            ...(typeof params.version === "number" ? { version: params.version } : {}),
          };

          api.logger.info(`[astron-rpa] POST ${url}`);
          api.logger.info(`[astron-rpa] Request body: ${JSON.stringify(payload)}`);

          const response = await sendJsonRequest({
            url,
            method: "POST",
            headers,
            body: payload,
            timeoutMs: config.timeoutMs ?? 30000,
          });

          const body = response.body;
          api.logger.info(
            `[astron-rpa] POST ${url} -> ${response.status} ${body.contentType || "unknown-content-type"}`,
          );

          if (!body.isJson) {
            api.logger.warn(`[astron-rpa] Non-JSON response preview: ${safePreview(body.rawText)}`);
          }

          return result({
            ok: response.ok,
            status: response.status,
            url,
            contentType: body.contentType,
            data: body.isJson ? body.parsed : body.rawText,
            responsePreview: body.isJson ? undefined : safePreview(body.rawText),
          });
        } catch (error) {
          api.logger.error(
            `[astron-rpa] request failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          return result({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    } as AnyAgentTool,
  );
}
