interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_TEAM_PASSPHRASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  glob<T = string>(
    pattern: string,
    options: { eager: true; query: string; import: string }
  ): Record<string, T>;
}
