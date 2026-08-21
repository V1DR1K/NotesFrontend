import type { ApiConfig } from "../lib/api/types";
import { SettingsView } from "../features/settings/SettingsView";

export function SettingsModule({ config, onConfigChanged }: { config: ApiConfig; onConfigChanged: (config: ApiConfig) => void }) {
  return <SettingsView config={config} onConfigChanged={onConfigChanged} />;
}
