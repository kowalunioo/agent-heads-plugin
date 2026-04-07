import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import {
  appendEntry,
  auditHead,
  buildMediaSourceId,
  extractMediaKnowledge,
  inspectMediaIngestDedupe,
  initializeHead,
  readHeadSnapshot,
  readHeadFile,
  registerSource,
  promoteToShared,
  createConversationCandidate,
  promoteConversationCandidate,
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

const promoteConversationCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['candidatePath', 'target'],
  properties: {
    agentKey: { type: 'string' },
    candidatePath: { type: 'string' },
    target: {
      type: 'string',
      enum: ['identity', 'learnings', 'errors', 'decisions', 'playbooks', 'memory', 'knowledge', 'sources', 'backlog'],
    },
    heading: { type: 'string' },
    markStatus: { type: 'string', enum: ['reviewed', 'promoted'] },
  },
};

const quickLogSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['content'],
  properties: {
    agentKey: { type: 'string' },
    content: { type: 'string' },
    heading: { type: 'string' },
  },
};

const ingestMediaKnowledgeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['path'],
  properties: {
    path: { type: 'string' },
    source: { type: 'string', enum: ['file', 'youtube'] },
    agentKey: { type: 'string' },
    title: { type: 'string' },
    tier: { type: 'string', enum: ['free', 'dev'] },
    language: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    outputFormat: { type: 'string', enum: ['text', 'json', 'srt', 'all'] },
    timestamps: { type: 'boolean' },
    task: { type: 'string', enum: ['transcribe', 'translate'] },
    chunkOverlapSeconds: { type: 'number' },
    materialType: { type: 'string', enum: ['meeting', 'podcast', 'lecture', 'voice-note', 'research', 'pdf', 'web/article', 'generic', 'auto'] },
    knowledgeMode: { type: 'string', enum: ['auto', 'candidate', 'direct'] },
    writeTranscript: { type: 'boolean' },
    writeSummary: { type: 'boolean' },
    writeSources: { type: 'boolean' },
    writeBacklog: { type: 'boolean' },
    maxItems: { type: 'number' },
    sharedPromotion: { type: 'string', enum: ['none', 'knowledge', 'sources', 'rules', 'policies'] },
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
      name: 'ingest_media_knowledge',
      label: 'Ingest Media Knowledge',
      description: 'Transcribe media, register provenance, and write candidate or durable knowledge into an agent head.',
      parameters: ingestMediaKnowledgeSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const source = (typeof p.source === 'string' ? p.source : 'file') as 'file' | 'youtube';
        const path = String(p.path ?? '').trim();
        const outputFormat = typeof p.outputFormat === 'string' ? p.outputFormat : 'json';
        const knowledgeMode = (typeof p.knowledgeMode === 'string' ? p.knowledgeMode : 'auto') as 'auto' | 'candidate' | 'direct';
        const writeTranscript = Boolean(p.writeTranscript ?? false);
        const writeSummary = p.writeSummary === false ? false : true;
        const writeSources = p.writeSources === false ? false : true;
        const writeBacklog = Boolean(p.writeBacklog ?? false);
        const maxItems = Math.min(50, Math.max(1, Number(p.maxItems ?? 8)));
        const warnings: string[] = [];
        const errors: string[] = [];
        const writes: Array<Record<string, unknown>> = [];
        const candidateNotes: Array<Record<string, unknown>> = [];
        const sharedPromotions: Array<Record<string, unknown>> = [];

        if (!path) {
          return toolResult({ ok: false, errors: ['path is required'] });
        }
        if (source === 'youtube' && !/^https?:\/\//i.test(path)) {
          return toolResult({ ok: false, errors: ['youtube sources require an http(s) URL path'] });
        }

        await initializeHead(paths, agentKey);

        const transcribeTool = (api as any)?.getTool?.('transcribe_media');
        if (!transcribeTool || typeof transcribeTool.execute !== 'function') {
          return toolResult({ ok: false, errors: ['transcribe_media tool is not available in this runtime; install/enable the transcription plugin first'] });
        }

        const txParams: Record<string, unknown> = {
          path,
          source,
          tier: typeof p.tier === 'string' ? p.tier : 'free',
          language: (typeof p.language === 'string' || p.language === null) ? p.language : undefined,
          output_format: outputFormat,
          timestamps: p.timestamps === false ? false : true,
          task: typeof p.task === 'string' ? p.task : 'transcribe',
        };
        if (typeof p.chunkOverlapSeconds === 'number') txParams.chunk_overlap_seconds = p.chunkOverlapSeconds;

        let txDetails: Record<string, unknown> | undefined;
        try {
          const txResult = await transcribeTool.execute(`ingest:${Date.now()}`, txParams);
          txDetails = (txResult?.details && typeof txResult.details === 'object' && !Array.isArray(txResult.details))
            ? txResult.details as Record<string, unknown>
            : undefined;
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
          return toolResult({ ok: false, agentKey, source: { type: source, path }, errors, warnings });
        }

        if (!txDetails || txDetails.ok === false) {
          errors.push(typeof txDetails?.error === 'string' ? txDetails.error : 'transcription failed');
          return toolResult({ ok: false, agentKey, source: { type: source, path }, transcription: txDetails, errors, warnings });
        }

        const transcription = txDetails.transcription && typeof txDetails.transcription === 'object'
          ? txDetails.transcription as Record<string, unknown>
          : txDetails;
        const transcriptText = typeof transcription.text === 'string' ? transcription.text : '';
        const artifacts = transcription.artifacts && typeof transcription.artifacts === 'object'
          ? transcription.artifacts as Record<string, unknown>
          : {};
        const selectedInputPath = typeof txDetails.selected_input_path === 'string'
          ? txDetails.selected_input_path
          : (typeof transcription.input_path === 'string' ? transcription.input_path : path);
        const derivedTitle = typeof p.title === 'string' && p.title.trim()
          ? p.title.trim()
          : (() => {
              const download = txDetails?.download && typeof txDetails.download === 'object' ? txDetails.download as Record<string, unknown> : undefined;
              if (typeof download?.title === 'string' && download.title.trim()) return download.title.trim();
              return selectedInputPath.split('/').filter(Boolean).at(-1) || path;
            })();
        const sourceId = buildMediaSourceId({
          agentKey,
          sourceType: source,
          origin: path,
          title: derivedTitle,
          transcriptCacheKey: typeof transcription.cache_key === 'string' ? transcription.cache_key : undefined,
        });

        const extraction = extractMediaKnowledge({
          transcriptText,
          sourceType: source,
          origin: path,
          title: derivedTitle,
          materialPreset: typeof p.materialType === 'string' && p.materialType !== 'auto' ? p.materialType as any : undefined,
          maxItems,
          chunked: Boolean(txDetails.chunked ?? transcription.chunked),
          transcriptCacheKey: typeof transcription.cache_key === 'string' ? transcription.cache_key : undefined,
          artifacts,
        });
        warnings.push(...extraction.warnings);

        const dedupe = await inspectMediaIngestDedupe(paths, agentKey, {
          sourceId,
          origin: path,
          title: derivedTitle,
          sourceType: source,
          transcriptCacheKey: typeof transcription.cache_key === 'string' ? transcription.cache_key : undefined,
          summary: extraction.summary,
          bullets: extraction.bullets,
          backlogItems: extraction.backlogItems,
        });

        if (dedupe.sourceDuplicate) {
          warnings.push(`Source already appears to exist in durable files: ${dedupe.sourceDuplicateReasons.join('; ')}`);
        }
        if (dedupe.knowledgeDuplicate) {
          warnings.push(`Knowledge looks duplicated; skipping repeated durable writes: ${dedupe.knowledgeDuplicateReasons.join('; ')}`);
        }

        if (writeSources && !dedupe.sourceDuplicate) {
          const sourceResult = await registerSource(paths, agentKey, {
            sourceId,
            title: derivedTitle,
            type: 'transcript',
            origin: path,
            addedAt: new Date().toISOString(),
            addedFor: agentKey,
            trust: source === 'youtube' ? 'external' : 'local',
            status: knowledgeMode === 'direct' ? 'reviewed' : 'unreviewed',
            relatedFiles: Object.values(artifacts).map((x) => String(x)),
            notes: [
              `selected_input_path=${selectedInputPath}`,
              `chunked=${String(Boolean(txDetails.chunked ?? transcription.chunked))}`,
              `cache_key=${typeof transcription.cache_key === 'string' ? transcription.cache_key : '-'}`,
            ].join('; '),
          });
          writes.push({ target: 'SOURCES.md', path: sourceResult.path, status: sourceResult.duplicate ? 'duplicate' : 'written', sourceId });
        } else if (writeSources) {
          writes.push({ target: 'SOURCES.md', status: 'skipped-duplicate', sourceId, reasons: dedupe.sourceDuplicateReasons });
        }

        if (writeSummary && extraction.summary && knowledgeMode === 'direct' && !dedupe.knowledgeDuplicate) {
          const result = await appendEntry(
            paths,
            agentKey,
            'knowledge',
            [
              extraction.summary,
              '',
              ...(extraction.bullets.length ? ['### Key points', '', ...extraction.bullets.map((b) => `- ${b}`), ''] : []),
              `### Provenance`,
              '',
              `- Source ID: ${sourceId}`,
              `- Origin: ${path}`,
              `- Artifacts: ${JSON.stringify(artifacts)}`,
            ].join('\n').trim(),
            derivedTitle,
          );
          writes.push({ target: 'KNOWLEDGE.md', path: result.path, status: 'written' });
        } else if (writeSummary && knowledgeMode === 'direct' && dedupe.knowledgeDuplicate) {
          writes.push({ target: 'KNOWLEDGE.md', status: 'skipped-duplicate', reasons: dedupe.knowledgeDuplicateReasons });
        }

        if (writeTranscript && transcriptText && !dedupe.knowledgeDuplicate) {
          const result = await appendEntry(
            paths,
            agentKey,
            'memory',
            [
              `### Transcript import`,
              '',
              transcriptText,
              '',
              `### Provenance`,
              '',
              `- Source ID: ${sourceId}`,
              `- Origin: ${path}`,
            ].join('\n').trim(),
            `${derivedTitle} transcript`,
          );
          writes.push({ target: 'MEMORY.md', path: result.path, status: 'written' });
          warnings.push('Full transcript was written to MEMORY.md; this is useful sometimes, but it can bloat durable memory fast.');
        } else if (writeTranscript && transcriptText && dedupe.knowledgeDuplicate) {
          writes.push({ target: 'MEMORY.md', status: 'skipped-duplicate' });
        }

        if (knowledgeMode !== 'direct' && !dedupe.knowledgeDuplicate) {
          for (const candidate of extraction.candidates) {
            if (candidate.suggestedTarget === 'backlog' && !writeBacklog) continue;
            const note = await createConversationCandidate(paths, {
              agentKey,
              title: candidate.title,
              content: candidate.content,
              sourceChannel: `media:${source}`,
              sourceMessageId: sourceId,
              suggestedTarget: candidate.suggestedTarget,
              whyDurable: candidate.whyDurable,
              confidence: candidate.confidence,
              status: 'candidate',
            });
            candidateNotes.push({ path: note.path, status: 'candidate', suggestedTarget: candidate.suggestedTarget });
          }
        } else if (knowledgeMode !== 'direct' && dedupe.knowledgeDuplicate) {
          warnings.push('Skipping candidate note creation because the extracted knowledge already appears to be durably present.');
        }

        if (knowledgeMode === 'direct' && writeBacklog && extraction.backlogItems.length && !dedupe.knowledgeDuplicate) {
          const result = await appendEntry(paths, agentKey, 'backlog', extraction.backlogItems.map((item) => `- ${item}`).join('\n'), `${derivedTitle} follow-ups`);
          writes.push({ target: 'BACKLOG.md', path: result.path, status: 'written' });
        } else if (knowledgeMode === 'direct' && writeBacklog && dedupe.knowledgeDuplicate) {
          writes.push({ target: 'BACKLOG.md', status: 'skipped-duplicate' });
        }

        const sharedPromotion = typeof p.sharedPromotion === 'string' ? p.sharedPromotion : 'none';
        if (sharedPromotion !== 'none' && writeSummary && knowledgeMode === 'direct' && !dedupe.knowledgeDuplicate) {
          const targetFile = sharedPromotion === 'knowledge'
            ? 'KNOWLEDGE.md'
            : sharedPromotion === 'sources'
              ? 'SOURCES.md'
              : sharedPromotion === 'rules'
                ? 'RULES.md'
                : 'POLICIES.md';
          const sourceFile = sharedPromotion === 'sources' ? 'SOURCES.md' : 'KNOWLEDGE.md';
          const promotion = await promoteToShared(paths, {
            agentKey,
            sourceFile: sourceFile as any,
            targetFile: targetFile as any,
            content: extraction.summary,
            heading: `${derivedTitle} (${sourceId})`,
            note: 'Promoted via ingest_media_knowledge',
            mode: 'append',
          });
          sharedPromotions.push({ targetFile, sharedPath: promotion.sharedPath, status: 'written' });
        } else if (sharedPromotion !== 'none' && dedupe.knowledgeDuplicate) {
          sharedPromotions.push({ status: 'skipped-duplicate' });
        }

        return toolResult({
          ok: true,
          agentKey,
          source: { type: source, path, title: derivedTitle, sourceId },
          transcription: {
            ok: true,
            text: transcriptText,
            segmentCount: Array.isArray(transcription.segments) ? transcription.segments.length : 0,
            chunked: Boolean(txDetails.chunked ?? transcription.chunked),
            artifacts,
            selectedInputPath,
          },
          extraction: {
          summary: extraction.summary,
          bullets: extraction.bullets,
          backlogItems: extraction.backlogItems,
          confidence: extraction.confidence,
          materialPreset: extraction.materialPreset,
        },
          writes,
          candidateNotes,
          sharedPromotions,
          warnings,
          errors,
          upstream: txDetails,
        });
      },
    }));

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
      name: 'agent_head_promote_conversation_candidate',
      label: 'Promote Conversation Candidate',
      description: 'Promote a reviewed conversation candidate note into one durable local head file.',
      parameters: promoteConversationCandidateSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const result = await promoteConversationCandidate(paths, {
          agentKey,
          candidatePath: String(p.candidatePath ?? ''),
          target: p.target as EntryTarget,
          heading: typeof p.heading === 'string' ? p.heading : undefined,
          markStatus: (typeof p.markStatus === 'string' ? p.markStatus : undefined) as 'reviewed' | 'promoted' | undefined,
        });
        return toolResult({ ok: true, agentKey, ...result });
      },
    }));

    api.registerTool(() => ({
      name: 'agent_head_log_learning',
      label: 'Log Agent Learning',
      description: 'Quickly append a durable learning to LEARNINGS.md.',
      parameters: quickLogSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const result = await appendEntry(paths, agentKey, 'learnings', String(p.content ?? ''), typeof p.heading === 'string' ? p.heading : 'Learning');
        return toolResult({ ok: true, agentKey, target: 'LEARNINGS.md', ...result });
      },
    }));

    api.registerTool(() => ({
      name: 'agent_head_log_error',
      label: 'Log Agent Error Pattern',
      description: 'Quickly append an error pattern or failure mode to ERRORS.md.',
      parameters: quickLogSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const result = await appendEntry(paths, agentKey, 'errors', String(p.content ?? ''), typeof p.heading === 'string' ? p.heading : 'Error');
        return toolResult({ ok: true, agentKey, target: 'ERRORS.md', ...result });
      },
    }));

    api.registerTool(() => ({
      name: 'agent_head_log_backlog_item',
      label: 'Log Agent Backlog Item',
      description: 'Quickly append a backlog item or open question to BACKLOG.md.',
      parameters: quickLogSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const agentKey = resolveAgentKey({ agentKey: typeof p.agentKey === 'string' ? p.agentKey : undefined, config: pluginConfig, runtimeHint });
        const result = await appendEntry(paths, agentKey, 'backlog', String(p.content ?? ''), typeof p.heading === 'string' ? p.heading : 'Backlog');
        return toolResult({ ok: true, agentKey, target: 'BACKLOG.md', ...result });
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
