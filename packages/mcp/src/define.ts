import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z, type ZodRawShape } from 'zod';
import { ApiError, AuthenticationError, NetworkError, NeogateError, PermissionError } from '@neogate/sdk';

export interface ToolDef<S extends ZodRawShape> {
  name: string;
  title: string;
  description: string;
  input: S;
  write?: boolean;
  idempotent?: boolean;
  run: (args: z.objectOutputType<S, z.ZodTypeAny>) => Promise<unknown>;
}

export const ok = (data: unknown): CallToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data) }] });

export const fail = (text: string): CallToolResult => ({ isError: true, content: [{ type: 'text', text }] });

export function explain(e: unknown): string {
  if (e instanceof AuthenticationError) return 'Токен не принят: он неверный, удалён или истёк. Создайте новый в панели (аккаунт → API-токены) и обновите NEOGATE_TOKEN.';
  if (e instanceof PermissionError) {
    return `${e.message}. Если действие меняет настройки, токену нужен доступ «чтение и запись», а сервер должен быть запущен с --allow-write.`;
  }
  if (e instanceof ApiError) return `Панель ответила ${e.status}: ${e.message}`;
  if (e instanceof NetworkError) return `Панель не отвечает (${e.message}). Попробуйте ещё раз позже.`;
  if (e instanceof NeogateError) return e.message;
  return `Непредвиденная ошибка: ${(e as Error)?.message ?? String(e)}`;
}

export function defineTool<S extends ZodRawShape>(server: McpServer, def: ToolDef<S>): void {
  server.registerTool(
    def.name,
    {
      title: def.title,
      description: def.description,
      inputSchema: def.input,
      annotations: {
        title: def.title,
        readOnlyHint: !def.write,
        destructiveHint: false,
        idempotentHint: def.write ? !!def.idempotent : true,
        openWorldHint: false,
      },
    },
    (async (args: z.objectOutputType<S, z.ZodTypeAny>) => {
      try {
        return ok(await def.run(args));
      } catch (e) {
        return fail(explain(e));
      }
    }) as never
  );
}
