import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import {
  appendEntry,
  auditHead,
  initializeHead,
  readHeadSnapshot,
  readHeadFile,
  registerSource,
  promoteToShared,
  createConversationCandidate,
  curateHeadFile,
  resolveAgentKey,
  resolvePaths,
  type EntryTarget,
  type PluginConfigShape,
  type LocalFile,
  type SharedFile,
} from '../lib/agent-heads.js';

const initSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    agentKey: { type: 'string' },
  },
};

const statusSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    agentKey: { type: 'string' },
  },
};

const writeEntrySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['target', 'content'],
  properties: {
    agentKey: { type: 'string' },
    target: {
      type: 'string',
      enum: ['identity', 'learnings', 'errors', 'decisions', 'playbooks', 'memory', 'knowledge', 'sources', 'backlog'],
    },
    content: { type: 'string' },
    heading: { type: 'string' },
  },
};

const registerSourceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'type', 'origin'],
  properties: {
    agentKey: { type: 'string' },
    sourceId: { type: 'string' },
    title: { type: 'string' },
    type: { type: 'string' },
    origin: { type: 'string' },
    addedAt: { type: 'string' },
    trust: { type: 'string' },
    status: { type: 'string' },
    relatedFiles: { type: 'array', 'items': { type: 'string' } },
    notes: { type: 'string' },
  },
};

const readSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    agentKey: { type: 'string' },
  },
};

const readFileSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['file'],
  properties: {
    agentKey: { type: 'string' },
    file: {
      type: 'string',
      enum: ['IDENTITY.md', 'LEARNINGS.md', 'ERRORS.md', 'DECISIONS.md', 'PLAYBOOKS.md', 'MEMORY.md', 'KNOWLEDGE.md', 'SOURCES.md', 'BACKLOG.md'],
    },
  },
};

const promoteSharedSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['sourceFile', 'targetFile', 'content'],
  properties: {
    agentKey: { type: 'string' },
    sourceFile: {
      type: 'string',
      enum: ['IDENTITY.md', 'LEARNINGS.md', 'ERRORS.md', 'DECISIONS.md', 'PLAYBOOKS.md', 'MEMORY.md', 'KNOWLEDGE.md', 'SOURCES.md', 'BACKLOG.md'],
    },
    targetFile: {
      type: 'string',
      enum: ['RULES.md', 'TOOLS.md', 'DECISIONS.md', 'KNOWLEDGE.md', 'SOURCES.md', 'POLICIES.md'],
    },
    content: { type: 'string' },
    heading: { type: 'string' },
    mode: { type: 'string', enum: ['append', 'rewrite'] },
    note: { type: 'string' },
  },
};

const conversationCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'content'],
  properties: {
    agentKey: { type: 'string' },
    title: { type: 'string' },
    content: { type: 'string' },
    sourceChannel: { type: 'string' },
    sourceMessageId: { type: 'string' },
    suggestedTarget: {
      type: 'string',
      enum: ['identity', 'learnings', 'errors', 'decisions', 'playbooks', 'memory', 'knowledge', 'sources', 'backlog'],
    },
    whyDurable: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    status: { type: 'string', enum: ['candidate', 'reviewed', 'promoted', 'rejected'] },
  },
};

const curateFileSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['file', 'instruction'],
  properties: {
    agentKey: { type: 'string' },
    file: {
      type: 'string',
      enum: ['IDENTITY.md', 'LEARNINGS.md', 'ERRORS.md', 'DECISIONS.md', 'PLAYBOOKS.md', 'MEMORY.md', 'KNOWLEDGE.md', 'SOURCES.md', 'BACKLOG.md'],
    },
    instruction: { type: 'string' },
    mode: { type: 'string', enum: ['append-note', 'rewrite'] },
  },
};

function toolResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

function getRuntimeHint(api: OpenClawPluginApi): string | null {
  const maybeSession = (api as any)?.session;
  if (maybeSession && typeof maybeSession === 'object') {
    const key = maybeSession.agentKey ?? maybeSession.agent_id ?? maybeSession.agentId;
    if (typeof key === 'string' && key.trim()) return key.trim();
  }
  return null;
}

function buildSourceId(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `SRC-${stamp}`;
}

export default {
  id: 'agent-heads',
  name: 'Agent Heads',
  description: 'Per-agent filesystem heads with isolated memory, knowledge, sources, and shared-layer boundaries.',
  configSchema: {
    parse(value: unknown) {
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    },
  },
  register(api: OpenClawPluginApi) {
    const pluginConfig = ((api.pluginConfig && typeof api.pluginConfig === 'object' && !Array.isArray(api.pluginConfig))
      ? api.pluginConfig
      : {}) as PluginConfigShape;
    const workspaceDir = process.env.OPENCLAW_WORKSPACE
      ?? process.env.OPENCLAW_AGENT_WORKSPACE
      ?? process.cwd();
    const paths = resolvePaths(workspaceDir, pluginConfig);
    const runtimeHint = getRuntimeHint(api);

    api.registerTool(() => ({
      name: 'agent_head_init',
      label: 'Initialize Agent Head',
      description: 'Create the canonical directory structure and starter files for a per-agent head.',
      parameters: initSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const result = await initializeHead(paths, agentKey);
        return toolResult({ ok: true, ...result, sharedDir: paths.sharedDir });
      },
    }));

    api.registerTool(() => ({
      name: 'agent_head_status',
      label: 'Agent Head Status',
      description: 'Inspect a selected head and report audit-style status, structure counts, and basic issues.',
      parameters: statusSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const audit = await auditHead(paths, agentKey);
        return toolResult({ ok: true, ...audit, sharedDir: paths.sharedDir });
      },
    }));

    api.registerTool(() => ({
      name: 'agent_head_write_entry',
      label: 'Write Agent Head Entry',
      description: 'Append a curated entry to one durable local head file.',
      parameters: writeEntrySchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const result = await appendEntry(
          paths,
          agentKey,
          p.target as EntryTarget,
          String(p.content ?? ''),
          typeof p.heading === 'string' ? p.heading : undefined,
        );
        return toolResult({ ok: true, agentKey, target: p.target, ...result });
      },
    }));

    api.registerTool(() => ({
      name: 'agent_head_register_source',
      label: 'Register Agent Head Source',
      description: 'Register a generic source record in the selected agent head without assuming source type.',
      parameters: registerSourceSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const sourceId = typeof p.sourceId === 'string' && p.sourceId.trim() ? p.sourceId.trim() : buildSourceId();
        const result = await registerSource(paths, agentKey, {
          sourceId,
          title: String(p.title ?? ''),
          type: String(p.type ?? ''),
          origin: String(p.origin ?? ''),
          addedAt: typeof p.addedAt === 'string' && p.addedAt.trim() ? p.addedAt : new Date().toISOString(),
          addedFor: agentKey,
          trust: typeof p.trust === 'string' ? p.trust : undefined,
          status: typeof p.status === 'string' ? p.status : undefined,
          relatedFiles: Array.isArray(p.relatedFiles) ? p.relatedFiles.map((x) => String(x)) : undefined,
          notes: typeof p.notes === 'string' ? p.notes : undefined,
        });
        return toolResult({ ok: true, agentKey, ...result });
      },
    }));

    api.registerTool(() => ({
      name: 'agent_head_promote_shared',
      label: 'Promote Agent Head Entry To Shared',
      description: 'Promote reviewed local material into the shared layer explicitly.',
      parameters: promoteSharedSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const result = await promoteToShared(paths, {
          agentKey,
          sourceFile: p.sourceFile as LocalFile,
          targetFile: p.targetFile as SharedFile,
          content: String(p.content ?? ''),
          heading: typeof p.heading === 'string' ? p.heading : undefined,
          mode: (p.mode === 'rewrite' ? 'rewrite' : 'append'),
          note: typeof p.note === 'string' ? p.note : undefined,
        });
        return toolResult({ ok: true, agentKey, ...result });
      },
    }));

    api.registerTool(() => ({
      name: 'agent_head_create_conversation_candidate',
      label: 'Create Conversation Candidate Note',
      description: 'Create a reviewed-later candidate note from user conversation under notes/conversation/.',
      parameters: conversationCandidateSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const result = await createConversationCandidate(paths, {
          agentKey,
          title: String(p.title ?? ''),
          content: String(p.content ?? ''),
          sourceChannel: typeof p.sourceChannel === 'string' ? p.sourceChannel : undefined,
          sourceMessageId: typeof p.sourceMessageId === 'string' ? p.sourceMessageId : undefined,
          suggestedTarget: p.suggestedTarget as EntryTarget | undefined,
          whyDurable: typeof p.whyDurable === 'string' ? p.whyDurable : undefined,
          confidence: (typeof p.confidence === 'string' ? p.confidence : undefined) as 'low' | 'medium' | 'high' | undefined,
          status: (typeof p.status === 'string' ? p.status : undefined) as 'candidate' | 'reviewed' | 'promoted' | 'rejected' | undefined,
        });
        return toolResult({ ok: true, agentKey, ...result });
      },
    }));

    api.registerTool(() => ({
      name: 'agent_head_curate_file',
      label: 'Curate Agent Head File',
      description: 'Append a curation note or rewrite one durable local head file during cleanup/maintenance.',
      parameters: curateFileSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const result = await curateHeadFile(paths, {
          agentKey,
          file: p.file as LocalFile,
          instruction: String(p.instruction ?? ''),
          mode: (p.mode === 'rewrite' ? 'rewrite' : 'append-note'),
        });
        return toolResult({ ok: true, agentKey, ...result });
      },
    }));

    api.registerTool(() => ({
      name: 'agent_head_curate_file',
      label: 'Curate Agent Head File',
      description: 'Append a curation note or rewrite one durable local head file during cleanup/maintenance.',
      parameters: curateFileSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const result = await curateHeadFile(paths, {
          agentKey,
          file: p.file as LocalFile,
          instruction: String(p.instruction ?? ''),
          mode: (p.mode === 'rewrite' ? 'rewrite' : 'append-note'),
        });
        return toolResult({ ok: true, agentKey, ...result });
      },
    }));

    api.registerTool(() => ({
      name: 'agent_head_read',
      label: 'Read Agent Head Snapshot',
      description: 'Read the durable files of one local agent head.',
      parameters: readSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const snapshot = await readHeadSnapshot(paths, agentKey);
        return toolResult({ ok: true, agentKey, snapshot });
      },
    }));

    api.registerTool(() => ({
      name: 'agent_head_read_file',
      label: 'Read Single Agent Head File',
      description: 'Read one selected durable file from a local agent head.',
      parameters: readFileSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const result = await readHeadFile(paths, agentKey, p.file as LocalFile);
        return toolResult({ ok: true, agentKey, ...result });
      },
    }));
  },
};
