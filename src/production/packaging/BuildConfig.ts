/**
 * BuildConfig — Production packaging configuration.
 *
 * Supports: Windows (NSIS), macOS (DMG), Linux (AppImage).
 * Auto-update ready. Version metadata. Portable mode.
 */

export interface BuildTarget {
  platform: 'windows' | 'macos' | 'linux';
  format: 'nsis' | 'dmg' | 'appimage' | 'portable';
  arch: 'x64' | 'arm64';
}

export interface VersionMetadata {
  version: string;
  buildNumber: string;
  commitHash: string;
  buildDate: string;
  channel: 'stable' | 'beta' | 'dev';
}

export interface PackagingConfig {
  appName: string;
  appId: string;
  targets: BuildTarget[];
  version: VersionMetadata;
  portableMode: boolean;
  autoUpdateEnabled: boolean;
  releaseLogging: boolean;
}

export const PRODUCTION_PACKAGING: PackagingConfig = {
  appName: 'Nexora Solution POS',
  appId: 'com.nexorasolution.pos',
  targets: [
    { platform: 'windows', format: 'nsis', arch: 'x64' },
    { platform: 'macos', format: 'dmg', arch: 'arm64' },
    { platform: 'macos', format: 'dmg', arch: 'x64' },
    { platform: 'linux', format: 'appimage', arch: 'x64' },
  ],
  version: {
    version: '1.0.0',
    buildNumber: '100',
    commitHash: 'local',
    buildDate: new Date().toISOString().split('T')[0],
    channel: 'stable',
  },
  portableMode: false,
  autoUpdateEnabled: true,
  releaseLogging: true,
};

/** Validate that the build configuration is correct. */
export function validateBuildConfig(config: PackagingConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!config.appName) errors.push('appName is required');
  if (!config.appId) errors.push('appId is required');
  if (config.targets.length === 0) errors.push('At least one build target is required');
  if (!config.version.version) errors.push('Version is required');
  return { valid: errors.length === 0, errors };
}
