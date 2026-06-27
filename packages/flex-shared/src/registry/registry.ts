import type { PluginManifest, PluginMetadata } from '../types';

export interface PluginRecord {
  error?: Error;
  manifest?: PluginManifest;
  metadata: PluginMetadata;
  status: 'failed' | 'loaded' | 'pending';
}

class PluginRegistry {
  private readonly plugins = new Map<string, PluginRecord>();

  get(pluginId: string): PluginRecord | undefined {
    return this.plugins.get(pluginId);
  }

  getAll(): PluginRecord[] {
    return [...this.plugins.values()];
  }

  markFailed(pluginId: string, err: Error): void {
    const record = this.plugins.get(pluginId);
    if (record) {
      record.status = 'failed';
      record.error = err;
    }
  }

  markLoaded(pluginId: string, manifest: PluginManifest): void {
    const record = this.plugins.get(pluginId);
    if (record) {
      record.manifest = manifest;
      record.status = 'loaded';
      record.error = undefined;
    }
  }

  /** 批量注册元数据（后端返回后调用） */
  register(metadataList: PluginMetadata[]): void {
    for (const metadata of metadataList) {
      if (!this.plugins.has(metadata.pluginId)) {
        this.plugins.set(metadata.pluginId, { metadata, status: 'pending' });
      }
    }
  }
}

/** 单例（importmap 保证主 Shell 与插件共享同一实例） */
export const pluginRegistry = new PluginRegistry();
