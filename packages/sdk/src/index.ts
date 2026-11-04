import { EventEmitter } from 'node:events';

export type JsonObject = Record<string, unknown>;
export type PluginState = 'registered' | 'running' | 'stopped' | 'error';
export interface PluginContext {
  emit: (type: string, payload: JsonObject) => void;
  log: (message: string) => void;
}
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  operations: readonly string[];
  start(context: PluginContext): Promise<void>;
  stop(): Promise<void>;
  execute(operation: string, input: JsonObject): Promise<unknown>;
}
export interface PluginInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  operations: readonly string[];
  state: PluginState;
  error?: string;
}
export interface PlatformEvent { timestamp: string; type: string; payload: JsonObject }
export class PluginError extends Error {
  constructor(message: string, public readonly statusCode = 400) { super(message); this.name = 'PluginError'; }
}
export class PluginRegistry {
  private readonly plugins = new Map<string, { plugin: Plugin; state: PluginState; error?: string }>();
  private readonly bus = new EventEmitter();
  private readonly history: PlatformEvent[] = [];
  register(plugin: Plugin): void {
    if (!/^[a-z][a-z0-9-]*$/.test(plugin.id)) throw new PluginError('Invalid plugin id');
    if (this.plugins.has(plugin.id)) throw new PluginError(`Duplicate plugin: ${plugin.id}`, 409);
    this.plugins.set(plugin.id, { plugin, state: 'registered' });
    this.emit('plugin.registered', { pluginId: plugin.id });
  }
  list(): PluginInfo[] { return [...this.plugins.values()].map(({ plugin, state, error }) => ({ id: plugin.id, name: plugin.name, description: plugin.description, version: plugin.version, operations: plugin.operations, state, ...(error ? { error } : {}) })); }
  events(limit = 50): PlatformEvent[] { return this.history.slice(-Math.max(0, Math.min(limit, 200))).reverse(); }
  on(type: string, handler: (payload: JsonObject) => void): () => void { this.bus.on(type, handler); return () => this.bus.off(type, handler); }
  private get(id: string) { const entry = this.plugins.get(id); if (!entry) throw new PluginError(`Unknown plugin: ${id}`, 404); return entry; }
  private emit(type: string, payload: JsonObject): void {
    const event = { timestamp: new Date().toISOString(), type, payload };
    this.history.push(event); if (this.history.length > 200) this.history.shift();
    this.bus.emit(type, payload);
  }
  async enable(id: string): Promise<PluginInfo> {
    const entry = this.get(id);
    if (entry.state === 'running') return this.list().find(x => x.id === id)!;
    try {
      await entry.plugin.start({ emit: (type, payload) => this.emit(type, { pluginId: id, ...payload }), log: message => this.emit('plugin.log', { pluginId: id, message }) });
      entry.state = 'running'; delete entry.error;
      this.emit('plugin.started', { pluginId: id });
    } catch (error) {
      entry.state = 'error'; entry.error = error instanceof Error ? error.message : String(error);
      this.emit('plugin.error', { pluginId: id, message: entry.error });
      throw new PluginError(`Unable to start ${id}: ${entry.error}`, 503);
    }
    return this.list().find(x => x.id === id)!;
  }
  async disable(id: string): Promise<PluginInfo> {
    const entry = this.get(id);
    if (entry.state === 'running') {
      try { await entry.plugin.stop(); } catch (error) { entry.state = 'error'; entry.error = String(error); throw new PluginError(`Unable to stop ${id}`, 503); }
    }
    entry.state = 'stopped'; delete entry.error;
    this.emit('plugin.stopped', { pluginId: id });
    return this.list().find(x => x.id === id)!;
  }
  async execute(id: string, operation: string, input: JsonObject = {}): Promise<unknown> {
    const entry = this.get(id);
    if (entry.state !== 'running') throw new PluginError(`Plugin ${id} is not running`, 409);
    if (!entry.plugin.operations.includes(operation)) throw new PluginError(`Unsupported operation: ${operation}`, 400);
    try {
      const result = await entry.plugin.execute(operation, input);
      this.emit('plugin.executed', { pluginId: id, operation });
      return result;
    } catch (error) {
      this.emit('plugin.operation_failed', { pluginId: id, operation, message: String(error) });
      throw error;
    }
  }
  async shutdown(): Promise<void> { for (const [id, entry] of this.plugins) if (entry.state === 'running') await this.disable(id); }
}
