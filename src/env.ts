export interface Env {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_GUILD_ID: string;
  SCANZ_ROLE_ID: string;
  VERIFIED_ROLE_ID: string;
  AFFILIATE_ROLE_ID: string;
  DEFAULT_PING_CHANNEL_ID: string;
  COOLDOWN_KV: KVNamespace;
  VERIFY_KV: KVNamespace;
}
