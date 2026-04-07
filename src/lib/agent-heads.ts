import { mkdir, readFile, writeFile, access, readdir, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';

export const LOCAL_FILES = [
  'IDENTITY.md',
  'LEARNINGS.md',
  'ERRORS.md',
  'DECISIONS.md',
  'PLAYBOOKS.md',
  'MEMORY.md',
  'KNOWLEDGE.md',
  'SOURCES.md',
  'BACKLOG.md',
] as const;

export const SHARED_FILES = [
  'RULES.md',
  'TOOLS.md',
  'DECISIONS.md',
  'KNOWLEDGE.md',
  'SOURCES.md',
  'POLICIES.md',
] as const;

export type LocalFile = typeof LOCAL_FILES[number];
export type SharedFile = typeof SHARED_FILES[number];
export type HeadFile = LocalFile | SharedFile;
export type EntryTarget = 'identity' | 'learnings' | 'errors' | 'decisions' | 'playbooks' | 'memory' | 'knowledge' | 'sources' | 'backlog';

export interface PluginConfigShape {
  rootDir?: string;
  sharedDir?: string;
  defaultAgentKey?: string;
  currentAgentKey?: string;
}

export interface ResolvedPaths {
  rootDir: string;
  sharedDir: string;
}

export interface SourceRecord {
  sourceId: string;
  title: string;
  type: string;
  origin: string;
  addedAt: string;
  addedFor: string;
  trust?: string;
  status?: string;
  relatedFiles?: string[];
  notes?: string;
}

export interface MediaIngestDedupeCheck {
  sourceDuplicate: boolean;
  sourceDuplicateReasons: string[];
  knowledgeDuplicate: boolean;
  knowledgeDuplicateReasons: string[];
}

export interface MediaKnowledgeCandidate {
  title: string;
  content: string;
  suggestedTarget: EntryTarget;
  whyDurable: string;
  confidence: 'low' | 'medium' | 'high';
}

export type MaterialPreset = 'meeting' | 'podcast' | 'lecture' | 'voice-note' | 'research' | 'pdf' | 'web/article' | 'generic';

interface MaterialPresetProfile {
  preset: MaterialPreset;
  summaryLines: number;
  bulletCap: number;
  backlogCap: number;
  preferActionItems: boolean;
  preferDecisions: boolean;
  preferQuestions: boolean;
  preferKeyClaims: boolean;
  preferOutline: boolean;
}

export interface PromoteSharedInput {
  agentKey: string;
  sourceFile: LocalFile;
  targetFile: SharedFile;
  content: string;
  heading?: string;
  mode?: 'append' | 'rewrite';
  note?: string;
}

export interface ConversationCandidateInput {
  agentKey: string;
  title: string;
  content: string;
  sourceChannel?: string;
  sourceMessageId?: string;
  suggestedTarget?: EntryTarget;
  whyDurable?: string;
  confidence?: 'low' | 'medium' | 'high';
  status?: 'candidate' | 'reviewed' | 'promoted' | 'rejected';
}

export interface CurateFileInput {
  agentKey: string;
  file: LocalFile;
  instruction: string;
  mode?: 'append-note' | 'rewrite';
}

export interface PromoteConversationCandidateInput {
  agentKey: string;
  candidatePath: string;
  target: EntryTarget;
  heading?: string;
  markStatus?: 'reviewed' | 'promoted';
}

const LOCAL_FILE_MAP: Record<EntryTarget, LocalFile> = {
  identity: 'IDENTITY.md',
  learnings: 'LEARNINGS.md',
  errors: 'ERRORS.md',
  decisions: 'DECISIONS.md',
  playbooks: 'PLAYBOOKS.md',
  memory: 'MEMORY.md',
  knowledge: 'KNOWLEDGE.md',
  sources: 'SOURCES.md',
  backlog: 'BACKLOG.md',
};

function sanitizeAgentKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'main';
}

export function resolvePaths(baseDir: string, config: PluginConfigShape): ResolvedPaths {
  const rootDir = resolve(baseDir, config.rootDir ?? 'agent-heads');
  const sharedDir = resolve(baseDir, config.sharedDir ?? join(config.rootDir ?? 'agent-heads', 'shared'));
  return { rootDir, sharedDir };
}

export function resolveAgentKey(input: { agentKey?: string; config?: PluginConfigShape; runtimeHint?: string | null }): string {
  return sanitizeAgentKey(
    input.agentKey
      ?? input.config?.currentAgentKey
      ?? input.config?.defaultAgentKey
      ?? input.runtimeHint
      ?? 'main'
  );
}

export function getAgentDir(paths: ResolvedPaths, agentKey: string): string {
  return join(paths.rootDir, sanitizeAgentKey(agentKey));
}

export function getLocalFilePath(paths: ResolvedPaths, agentKey: string, target: EntryTarget): string {
  return join(getAgentDir(paths, agentKey), LOCAL_FILE_MAP[target]);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  if (!(await pathExists(path))) {
    await writeFile(path, content, 'utf8');
  }
}

function defaultLocalFileContent(agentKey: string, file: LocalFile): string {
  switch (file) {
    case 'IDENTITY.md':
      return `# ${agentKey} identity\n\n- Name: ${agentKey}\n- Role:\n- Tone:\n- Scope:\n- Anti-goals:\n`;
    case 'LEARNINGS.md':
      return '# Learnings\n\nDurable lessons and user corrections for this agent.\n';
    case 'ERRORS.md':
      return '# Errors\n\nKnown bad patterns, mistakes, and avoidable failure modes.\n';
    case 'DECISIONS.md':
      return '# Decisions\n\nExplicit behavior or architecture decisions for this head.\n';
    case 'PLAYBOOKS.md':
      return '# Playbooks\n\nRepeatable procedures this agent should follow.\n';
    case 'MEMORY.md':
      return '# Memory\n\nLong-lived contextual memory for this specific agent.\n';
    case 'KNOWLEDGE.md':
      return '# Knowledge\n\nDistilled domain knowledge and heuristics for this agent.\n';
    case 'SOURCES.md':
      return '# Sources\n\nRegistry of source records for this agent head.\n';
    case 'BACKLOG.md':
      return '# Backlog\n\nPending topics, imports, and open questions.\n';
  }
}

function defaultSharedFileContent(file: SharedFile): string {
  switch (file) {
    case 'RULES.md':
      return '# Shared rules\n\nCross-agent rules that truly apply to all heads.\n';
    case 'TOOLS.md':
      return '# Shared tools\n\nWorkspace-wide tool gotchas and usage notes.\n';
    case 'DECISIONS.md':
      return '# Shared decisions\n\nCross-agent decisions that should remain global.\n';
    case 'KNOWLEDGE.md':
      return '# Shared knowledge\n\nReusable knowledge that belongs above any single head.\n';
    case 'SOURCES.md':
      return '# Shared sources\n\nRegistry of shared/global sources.\n';
    case 'POLICIES.md':
      return '# Shared policies\n\nPromotion and maintenance policies for agent heads.\n';
  }
}

export async function initializeShared(paths: ResolvedPaths): Promise<void> {
  await mkdir(paths.sharedDir, { recursive: true });
  for (const file of SHARED_FILES) {
    await ensureFile(join(paths.sharedDir, file), defaultSharedFileContent(file));
  }
}

export async function initializeHead(paths: ResolvedPaths, agentKey: string): Promise<{ agentKey: string; agentDir: string; createdFiles: string[] }> {
  const resolvedAgentKey = sanitizeAgentKey(agentKey);
  const agentDir = getAgentDir(paths, resolvedAgentKey);
  await initializeShared(paths);
  await mkdir(join(agentDir, 'notes'), { recursive: true });
  await mkdir(join(agentDir, 'sources'), { recursive: true });
  await mkdir(join(agentDir, 'imports'), { recursive: true });

  const createdFiles: string[] = [];
  for (const file of LOCAL_FILES) {
    const filePath = join(agentDir, file);
    const existed = await pathExists(filePath);
    await ensureFile(filePath, defaultLocalFileContent(resolvedAgentKey, file));
    if (!existed) createdFiles.push(file);
  }

  return { agentKey: resolvedAgentKey, agentDir, createdFiles };
}

export async function appendEntry(paths: ResolvedPaths, agentKey: string, target: EntryTarget, content: string, heading?: string): Promise<{ file: string; path: string }> {
  await initializeHead(paths, agentKey);
  const filePath = getLocalFilePath(paths, agentKey, target);
  const stamp = new Date().toISOString();
  const block = `\n## ${heading?.trim() || stamp}\n\n${content.trim()}\n`;
  const existing = await readFile(filePath, 'utf8');
  await writeFile(filePath, `${existing.trimEnd()}\n${block}`, 'utf8');
  return { file: basename(filePath), path: filePath };
}

export async function registerSource(paths: ResolvedPaths, agentKey: string, record: SourceRecord): Promise<{ path: string; sourceId: string; duplicate: boolean }> {
  await initializeHead(paths, agentKey);
  const filePath = getLocalFilePath(paths, agentKey, 'sources');
  const existing = await readFile(filePath, 'utf8');
  if (existing.includes(`## ${record.sourceId}`)) {
    return { path: filePath, sourceId: record.sourceId, duplicate: true };
  }
  const block = [
    `## ${record.sourceId}`,
    '',
    `- Title: ${record.title}`,
    `- Type: ${record.type}`,
    `- Origin: ${record.origin}`,
    `- Added At: ${record.addedAt}`,
    `- Added For: ${record.addedFor}`,
    `- Trust: ${record.trust ?? 'unknown'}`,
    `- Status: ${record.status ?? 'unreviewed'}`,
    `- Related Files: ${(record.relatedFiles && record.relatedFiles.length > 0) ? record.relatedFiles.join(', ') : '-'}`,
    `- Notes: ${record.notes?.trim() || '-'}`,
    '',
  ].join('\n');
  await writeFile(filePath, `${existing.trimEnd()}\n\n${block}`.trimEnd() + '\n', 'utf8');
  return { path: filePath, sourceId: record.sourceId, duplicate: false };
}

export async function readHeadSnapshot(paths: ResolvedPaths, agentKey: string): Promise<Record<string, string>> {
  await initializeHead(paths, agentKey);
  const out: Record<string, string> = {};
  for (const file of LOCAL_FILES) {
    out[file] = await readFile(join(getAgentDir(paths, agentKey), file), 'utf8');
  }
  return out;
}

export async function readHeadFile(paths: ResolvedPaths, agentKey: string, file: LocalFile): Promise<{ file: LocalFile; path: string; content: string }> {
  await initializeHead(paths, agentKey);
  const path = join(getAgentDir(paths, agentKey), file);
  const content = await readFile(path, 'utf8');
  return { file, path, content };
}

export async function createConversationCandidate(paths: ResolvedPaths, input: ConversationCandidateInput): Promise<{ path: string; fileName: string }> {
  await initializeHead(paths, input.agentKey);
  const dir = join(getAgentDir(paths, input.agentKey), 'notes', 'conversation');
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:]/g, '-');
  const slug = input.title.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
  const fileName = `${stamp}__${slug}.md`;
  const filePath = join(dir, fileName);
  const body = [
    `# ${input.title.trim()}`,
    '',
    `- Agent: ${input.agentKey}`,
    `- Source channel/chat: ${input.sourceChannel?.trim() || '-'}`,
    `- Source message id: ${input.sourceMessageId?.trim() || '-'}`,
    `- Suggested target file: ${input.suggestedTarget ?? '-'}`,
    `- Why durable: ${input.whyDurable?.trim() || '-'}`,
    `- Confidence: ${input.confidence ?? 'medium'}`,
    `- Review status: ${input.status ?? 'candidate'}`,
    '',
    '## Candidate content',
    '',
    input.content.trim(),
    '',
  ].join('\n');
  await writeFile(filePath, body, 'utf8');
  return { path: filePath, fileName };
}

export async function promoteConversationCandidate(paths: ResolvedPaths, input: PromoteConversationCandidateInput): Promise<{ candidatePath: string; targetFile: LocalFile; targetPath: string }> {
  await initializeHead(paths, input.agentKey);
  const candidatePath = input.candidatePath;
  const raw = await readFile(candidatePath, 'utf8');
  const match = raw.match(/## Candidate content\n\n([\s\S]*?)\n?$/);
  const candidateContent = (match?.[1] ?? raw).trim();
  const targetPath = getLocalFilePath(paths, input.agentKey, input.target);
  const heading = input.heading?.trim() || `Promoted conversation candidate: ${basename(candidatePath)}`;
  const current = await readFile(targetPath, 'utf8');
  const block = `\n## ${heading}\n\n${candidateContent}\n`;
  await writeFile(targetPath, `${current.trimEnd()}\n${block}`, 'utf8');

  const nextStatus = input.markStatus ?? 'promoted';
  const updated = raw.replace(/- Review status: .*/,
    `- Review status: ${nextStatus}`);
  await writeFile(candidatePath, updated, 'utf8');

  return { candidatePath, targetFile: LOCAL_FILE_MAP[input.target], targetPath };
}

export async function promoteToShared(paths: ResolvedPaths, input: PromoteSharedInput): Promise<{ sharedPath: string; localPath: string; targetFile: SharedFile; sourceFile: LocalFile }> {
  await initializeHead(paths, input.agentKey);
  await initializeShared(paths);
  const localPath = join(getAgentDir(paths, input.agentKey), input.sourceFile);
  const sharedPath = join(paths.sharedDir, input.targetFile);
  const stamp = new Date().toISOString();
  const header = input.heading?.trim() || `${input.agentKey} -> ${input.targetFile} @ ${stamp}`;
  const noteLine = input.note?.trim() ? `\n- Note: ${input.note.trim()}` : '';
  const block = `\n## ${header}\n\n- Promoted From: ${input.agentKey}/${input.sourceFile}\n- Promoted At: ${stamp}${noteLine}\n\n${input.content.trim()}\n`;

  if (input.mode === 'rewrite') {
    await writeFile(sharedPath, `${defaultSharedFileContent(input.targetFile).trimEnd()}\n${block}`, 'utf8');
  } else {
    const existing = await readFile(sharedPath, 'utf8');
    await writeFile(sharedPath, `${existing.trimEnd()}\n${block}`, 'utf8');
  }

  return { sharedPath, localPath, targetFile: input.targetFile, sourceFile: input.sourceFile };
}

export async function curateHeadFile(paths: ResolvedPaths, input: CurateFileInput): Promise<{ path: string; file: LocalFile; mode: 'append-note' | 'rewrite' }> {
  await initializeHead(paths, input.agentKey);
  const path = join(getAgentDir(paths, input.agentKey), input.file);
  const existing = await readFile(path, 'utf8');

  if (input.mode === 'rewrite') {
    await writeFile(path, input.instruction.trimEnd() + '\n', 'utf8');
    return { path, file: input.file, mode: 'rewrite' };
  }

  const stamp = new Date().toISOString();
  const block = `\n## Curation note ${stamp}\n\n${input.instruction.trim()}\n`;
  await writeFile(path, `${existing.trimEnd()}\n${block}`, 'utf8');
  return { path, file: input.file, mode: 'append-note' };
}

export async function auditHead(paths: ResolvedPaths, agentKey: string): Promise<Record<string, unknown>> {
  await initializeHead(paths, agentKey);
  const agentDir = getAgentDir(paths, agentKey);
  const issues: string[] = [];
  const suggestions: string[] = [];
  const warnings: string[] = [];
  const fileStats: Record<string, { bytes: number; lines: number; headings: number }> = {};

  for (const file of LOCAL_FILES) {
    const fullPath = join(agentDir, file);
    const content = await readFile(fullPath, 'utf8');
    const fileStat = await stat(fullPath);
    const headings = (content.match(/^##\s+/gm) ?? []).length;
    const headingNames = (content.match(/^##\s+(.+)$/gm) ?? []).map((line) => line.replace(/^##\s+/, '').trim().toLowerCase());
    const duplicateHeadings = headingNames.filter((name, index) => headingNames.indexOf(name) !== index);
    fileStats[file] = { bytes: fileStat.size, lines: content.split(/\r?\n/).length, headings };
    if (file !== 'SOURCES.md' && content.length < 40) {
      issues.push(`${file}: looks nearly empty`);
    }
    if (fileStat.size > 50_000) {
      suggestions.push(`${file}: consider splitting or curating because it is getting large`);
    }
    if (duplicateHeadings.length > 0) {
      warnings.push(`${file}: duplicate section headings detected (${Array.from(new Set(duplicateHeadings)).join(', ')})`);
    }
    if ((content.match(/TODO|TBD|FIXME/gi) ?? []).length > 5) {
      warnings.push(`${file}: contains many unresolved markers (TODO/TBD/FIXME)`);
    }
  }

  const notesDir = join(agentDir, 'notes');
  const sourcesDir = join(agentDir, 'sources');
  const importsDir = join(agentDir, 'imports');
  const [notes, sources, imports] = await Promise.all([
    readdir(notesDir),
    readdir(sourcesDir),
    readdir(importsDir),
  ]);

  if (imports.length > 0) {
    issues.push(`imports/: ${imports.length} item(s) still waiting for review`);
  }

  const sourcesContent = await readFile(join(agentDir, 'SOURCES.md'), 'utf8');
  const sourceMatches = sourcesContent.match(/^##\s+(SRC-|[a-z0-9._-]+)/gim) ?? [];
  if (sourceMatches.length === 0) {
    issues.push('SOURCES.md: no registered source records yet');
    suggestions.push('Register at least one source so durable knowledge has provenance');
  }
  if (notes.length > 0 && sourceMatches.length === 0) {
    suggestions.push('notes/ has content but SOURCES.md has no registered sources yet');
  }

  return {
    agentKey,
    agentDir,
    issueCount: issues.length,
    issues,
    warnings,
    suggestions,
    fileStats,
    counts: {
      notes: notes.length,
      sources: sources.length,
      imports: imports.length,
      sourceRecords: sourceMatches.length,
    },
  };
}

export function sanitizeSourceId(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '') || `SRC-${Date.now()}`;
}

export function buildMediaSourceId(input: { agentKey: string; sourceType: string; origin: string; title?: string; transcriptCacheKey?: string; }): string {
  const raw = [
    'MEDIA',
    input.agentKey,
    input.sourceType,
    input.title ?? '',
    input.transcriptCacheKey ?? '',
    input.origin,
  ].filter(Boolean).join('-');
  return sanitizeSourceId(raw).slice(0, 120);
}

function normalizeForCompare(value: string): string {
  return value.replace(/\r/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function fingerprint(value: string): string {
  return createHash('sha256').update(normalizeForCompare(value)).digest('hex').slice(0, 16);
}

export async function inspectMediaIngestDedupe(paths: ResolvedPaths, agentKey: string, input: {
  sourceId: string;
  origin: string;
  title: string;
  sourceType: string;
  transcriptCacheKey?: string;
  summary?: string;
  bullets?: string[];
  backlogItems?: string[];
}): Promise<MediaIngestDedupeCheck> {
  await initializeHead(paths, agentKey);
  const snapshot = await readHeadSnapshot(paths, agentKey);
  const sources = snapshot['SOURCES.md'];
  const knowledge = snapshot['KNOWLEDGE.md'];
  const backlog = snapshot['BACKLOG.md'];
  const corpus = [sources, knowledge, memory, backlog].filter(Boolean).join('\n\n');
  const sourceDuplicateReasons: string[] = [];
  const knowledgeDuplicateReasons: string[] = [];

  const sourceChecks = [input.sourceId, input.origin, input.title, input.transcriptCacheKey].filter(Boolean).map(String);
  for (const token of sourceChecks) {
    if (corpus.includes(token)) sourceDuplicateReasons.push(`matched existing durable text: ${token}`);
  }

  const summary = input.summary?.trim();
  if (summary) {
    const sumFp = fingerprint(summary);
    if (corpus.includes(sumFp) || corpus.includes(normalizeForCompare(summary).slice(0, 80))) {
      knowledgeDuplicateReasons.push('summary already appears in durable files');
    }
  }
  for (const bullet of input.bullets ?? []) {
    const fp = fingerprint(bullet);
    if (corpus.includes(fp)) knowledgeDuplicateReasons.push(`bullet already appears in durable files: ${bullet}`);
  }
  for (const item of input.backlogItems ?? []) {
    const fp = fingerprint(item);
    if (corpus.includes(fp)) knowledgeDuplicateReasons.push(`backlog item already appears in durable files: ${item}`);
  }

  return {
    sourceDuplicate: sourceDuplicateReasons.length > 0,
    sourceDuplicateReasons,
    knowledgeDuplicate: knowledgeDuplicateReasons.length > 0,
    knowledgeDuplicateReasons,
  };
}

function deriveTitleFromOrigin(origin: string): string {
  const trimmed = origin.trim();
  if (!trimmed) return 'Untitled media source';
  try {
    const url = new URL(trimmed);
    const seg = url.pathname.split('/').filter(Boolean).at(-1);
    return decodeURIComponent(seg || url.hostname || trimmed);
  } catch {
    return basename(trimmed);
  }
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((total, pattern) => total + (text.match(pattern)?.length ?? 0), 0);
}

function detectMaterialPreset(input: {
  sourceType: string;
  origin: string;
  title?: string;
  transcriptText: string;
  artifacts?: Record<string, unknown>;
}): MaterialPreset {
  const text = `${input.title ?? ''}\n${input.origin}\n${input.transcriptText}`.toLowerCase();
  const artifactText = JSON.stringify(input.artifacts ?? {}).toLowerCase();
  const haystack = `${text}\n${artifactText}`;

  const score = {
    meeting: countMatches(haystack, [/\bminutes\b/g, /\bagenda\b/g, /\baction item/g, /\bdecided\b/g, /\bnext steps?\b/g, /\battendees?\b/g, /^\s*[-*] /gm]) + (/(?:\bwe\b.*\bdecided\b|\bcan you\b|\blet's\b)/g.test(haystack) ? 2 : 0),
    podcast: countMatches(haystack, [/\bepisode\b/g, /\bhost\b/g, /\bguest\b/g, /\bsponsor\b/g, /\bshow notes?\b/g, /\bsubscribe\b/g, /\brating\b/g]),
    lecture: countMatches(haystack, [/\blecture\b/g, /\bstudent\b/g, /\bprofessor\b/g, /\bslides?\b/g, /\bchapter\b/g, /\bexam\b/g, /\blesson\b/g, /\bcourse\b/g]),
    'voice-note': countMatches(haystack, [/\bquick note\b/g, /\bremind me\b/g, /\bmental note\b/g, /\bjust saying\b/g, /\bi need to\b/g, /\btodo\b/g, /\bcall me\b/g, /\btext me\b/g]),
    research: countMatches(haystack, [/\bhypothesis\b/g, /\bmethod(?:ology)?\b/g, /\bresult(?:s)?\b/g, /\bconclusion(?:s)?\b/g, /\bexperiment\b/g, /\bevidence\b/g, /\bcitation\b/g, /\breferences?\b/g, /\bpaper\b/g]),
    pdf: countMatches(haystack, [/\.pdf\b/g, /\bocr\b/g, /\bpage \d+\b/g, /\bfigure\b/g, /\btable\b/g, /\bappendix\b/g]),
    'web/article': countMatches(haystack, [/\barticle\b/g, /\bblog\b/g, /\bnewsletter\b/g, /\bpublication\b/g, /\blink\b/g, /\bweb\b/g, /\bhtml\b/g]),
  } as Record<MaterialPreset, number>;

  if (input.sourceType === 'youtube' && score.podcast >= score.meeting) return 'podcast';
  if (/\.pdf($|\?)/i.test(input.origin) || score.pdf >= 2) return 'pdf';
  if (score.research >= 3) return 'research';
  if (score.lecture >= 3) return 'lecture';
  if (score['voice-note'] >= 3 || normalizedShortText(input.transcriptText)) return 'voice-note';
  if (score.meeting >= 4) return 'meeting';
  if (score.podcast >= 3) return 'podcast';
  if (score['web/article'] >= 3) return 'web/article';
  return 'generic';
}

function normalizedShortText(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length < 220;
}

function getPresetProfile(preset: MaterialPreset): MaterialPresetProfile {
  switch (preset) {
    case 'meeting': return { preset, summaryLines: 2, bulletCap: 10, backlogCap: 10, preferActionItems: true, preferDecisions: true, preferQuestions: true, preferKeyClaims: false, preferOutline: false };
    case 'podcast': return { preset, summaryLines: 3, bulletCap: 8, backlogCap: 4, preferActionItems: false, preferDecisions: false, preferQuestions: false, preferKeyClaims: true, preferOutline: false };
    case 'lecture': return { preset, summaryLines: 3, bulletCap: 10, backlogCap: 5, preferActionItems: false, preferDecisions: false, preferQuestions: true, preferKeyClaims: true, preferOutline: true };
    case 'voice-note': return { preset, summaryLines: 1, bulletCap: 6, backlogCap: 8, preferActionItems: true, preferDecisions: true, preferQuestions: true, preferKeyClaims: false, preferOutline: false };
    case 'research': return { preset, summaryLines: 3, bulletCap: 12, backlogCap: 8, preferActionItems: false, preferDecisions: false, preferQuestions: true, preferKeyClaims: true, preferOutline: true };
    case 'pdf': return { preset, summaryLines: 3, bulletCap: 10, backlogCap: 6, preferActionItems: false, preferDecisions: false, preferQuestions: true, preferKeyClaims: true, preferOutline: true };
    case 'web/article': return { preset, summaryLines: 3, bulletCap: 10, backlogCap: 6, preferActionItems: false, preferDecisions: false, preferQuestions: true, preferKeyClaims: true, preferOutline: false };
    default: return { preset: 'generic', summaryLines: 2, bulletCap: 8, backlogCap: 6, preferActionItems: true, preferDecisions: true, preferQuestions: true, preferKeyClaims: true, preferOutline: false };
  }
}

function limitByLength(items: string[], maxItems: number, maxLen = 240): string[] {
  const out: string[] = [];
  for (const item of items) {
    const clean = item.replace(/\s+/g, ' ').trim();
    if (!clean) continue;
    out.push(clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function extractMediaKnowledge(input: {
  transcriptText: string;
  sourceType: string;
  origin: string;
  title?: string;
  materialPreset?: MaterialPreset;
  maxItems?: number;
  chunked?: boolean;
  transcriptCacheKey?: string;
  artifacts?: Record<string, unknown>;
}): {
  summary: string;
  bullets: string[];
  backlogItems: string[];
  candidates: MediaKnowledgeCandidate[];
  confidence: 'low' | 'medium' | 'high';
  materialPreset: MaterialPreset;
  warnings: string[];
} {
  const warnings: string[] = [];
  const maxItems = Math.min(50, Math.max(1, Math.floor(input.maxItems ?? 8)));
  const normalizedText = input.transcriptText.replace(/\r/g, '').trim();
  const materialPreset = input.materialPreset ?? detectMaterialPreset(input);
  const profile = getPresetProfile(materialPreset);
  const lines = normalizedText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const sentences = splitSentences(normalizedText);
  const summarySource = lines.slice(0, profile.summaryLines).join(' ')
    || lines.find((line) => line.length >= 40)
    || sentences.slice(0, profile.summaryLines).join(' ')
    || normalizedText;
  const summary = summarySource
    ? (summarySource.length > 700 ? `${summarySource.slice(0, 699)}…` : summarySource)
    : 'Transcript imported, but no durable textual content was extracted.';

  const bulletSeed = [
    ...lines.filter((line) => /^[-*•]/.test(line)).map((line) => line.replace(/^[-*•]\s*/, '')),
    ...(profile.preferOutline ? lines.filter((line) => /^\d+[.)]\s+/.test(line)).map((line) => line.replace(/^\d+[.)]\s+/, '')) : []),
    ...sentences.filter((s) => s.length >= 40 || (profile.preferKeyClaims && /\b(?:because|therefore|means|suggests|indicates|shows)\b/i.test(s))),
  ];
  const bullets = limitByLength(Array.from(new Set(bulletSeed)), Math.min(maxItems, profile.bulletCap));

  const backlogSeed = [
    ...(profile.preferActionItems ? lines.filter((line) => /\b(todo|follow up|follow-up|next step|action item|action items|owner|due|deadline|assign)\b/i.test(line)) : []),
    ...(profile.preferQuestions ? lines.filter((line) => /\b(open question|question|clarify|check|verify|investigate|review)\b/i.test(line)) : []),
    ...sentences.filter((s) => /\b(todo|follow up|follow-up|next step|action item|open question|question|investigate|verify|review|decide|confirm)\b/i.test(s)),
  ];
  const backlogItems = limitByLength(Array.from(new Set(backlogSeed)), Math.max(3, Math.min(profile.backlogCap, maxItems)));

  if (!normalizedText) warnings.push('Transcript text was empty after normalization.');
  if (normalizedText.length < 120) warnings.push('Transcript is very short; durable extraction confidence is limited.');
  if (bullets.length === 0 && normalizedText) warnings.push('No strong bullet-like claims detected; candidate summary may need manual review.');

  const sourceTitle = input.title?.trim() || deriveTitleFromOrigin(input.origin);
  const provenanceBlock = [
    '',
    '### Provenance',
    '',
    `- Source type: ${input.sourceType}`,
    `- Origin: ${input.origin}`,
    `- Title: ${sourceTitle}`,
    `- Transcript cache key: ${input.transcriptCacheKey ?? '-'}`,
    `- Chunked: ${input.chunked ? 'yes' : 'no'}`,
    `- Artifacts: ${input.artifacts ? JSON.stringify(input.artifacts) : '-'}`,
  ].join('\n');

  const candidates: MediaKnowledgeCandidate[] = [];
  if (summary) {
    candidates.push({
      title: `${sourceTitle} — ${materialPreset} distilled knowledge`,
      suggestedTarget: 'knowledge',
      whyDurable: `Transcript-derived summary using the ${materialPreset} preset for future reuse.`,
      confidence: normalizedText.length > 500 ? 'medium' : 'low',
      content: [
        `## Summary`,
        '',
        summary,
        '',
        `- Material preset: ${materialPreset}`,
        '',
        ...(bullets.length ? ['## Key points', '', ...bullets.map((b) => `- ${b}`), ''] : []),
        provenanceBlock,
      ].join('\n').trim(),
    });
  }
  if (profile.preferDecisions) {
    const decisionLines = lines.filter((line) => /\b(decided|decision|agree|agreed|approved|rejected|blocked|won't|will|should|must)\b/i.test(line));
    if (decisionLines.length) {
      candidates.push({
        title: `${sourceTitle} — decisions`,
        suggestedTarget: 'decisions',
        whyDurable: `Preset ${materialPreset} surfaced explicit decisions worth keeping.`,
        confidence: 'medium',
        content: [
          '## Decisions',
          '',
          ...limitByLength(Array.from(new Set(decisionLines)), Math.min(6, maxItems)).map((line) => `- ${line}`),
          '',
          provenanceBlock,
        ].join('\n').trim(),
      });
    }
  }
  if (backlogItems.length) {
    candidates.push({
      title: `${sourceTitle} — follow-ups`,
      suggestedTarget: 'backlog',
      whyDurable: `Preset ${materialPreset} found unresolved items or next steps worth tracking.`,
      confidence: 'medium',
      content: [
        `## Follow-ups`,
        '',
        ...backlogItems.map((item) => `- ${item}`),
        '',
        provenanceBlock,
      ].join('\n').trim(),
    });
  }

  const confidence: 'low' | 'medium' | 'high' = normalizedText.length > 1800 && bullets.length >= 3
    ? 'high'
    : normalizedText.length > 400
      ? 'medium'
      : 'low';

  return {
    summary,
    bullets,
    backlogItems,
    candidates,
    confidence,
    materialPreset,
    warnings,
  };
}
