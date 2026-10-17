import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Radar, Radio } from "lucide-react";
import { domMqttApi, type MqttTopicSample } from "@/lib/api";
import { toast } from "sonner";

export interface MqttLink {
  topic: string;
  valuePath: string;
  commandTopic: string;
}

export const emptyMqttLink: MqttLink = { topic: "", valuePath: "", commandTopic: "" };

// Chemins des valeurs simples d'un message JSON (ex. "temperature", "data.ph")
function jsonPaths(payload: string): string[] {
  let parsed: unknown;
  try { parsed = JSON.parse(payload); } catch { return []; }
  if (parsed === null || typeof parsed !== "object") return [];
  const out: string[] = [];
  const walk = (obj: any, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === "object" && !Array.isArray(v)) walk(v, path);
      else if (!Array.isArray(v)) out.push(path);
    }
  };
  walk(parsed, "");
  return out.slice(0, 20);
}

export function MqttLinkFields({
  value, onChange, showCommand,
}: { value: MqttLink; onChange: (v: MqttLink) => void; showCommand: boolean }) {
  const [topics, setTopics]       = useState<MqttTopicSample[] | null>(null);
  const [scanning, setScanning]   = useState(false);
  const [topicFilter, setTopicFilter] = useState("");
  const [samplePayload, setSamplePayload] = useState("");

  const set = (patch: Partial<MqttLink>) => onChange({ ...value, ...patch });

  useEffect(() => {
    const sample = topics?.find(t => t.topic === value.topic);
    if (sample) setSamplePayload(sample.payload);
  }, [value.topic, topics]);

  async function scan() {
    setScanning(true);
    try {
      setTopics(await domMqttApi.discover({ seconds: 5 }));
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Broker MQTT injoignable");
    } finally {
      setScanning(false);
    }
  }

  const paths = jsonPaths(samplePayload);
  const visibleTopics = (topics || []).filter(t => !topicFilter || t.topic.toLowerCase().includes(topicFilter.toLowerCase()));

  return (
    <div className="space-y-3 min-w-0">
      <div className="space-y-1.5">
        <Label>Topic MQTT de l'état</Label>
        <div className="flex gap-2">
          <Input
            className="font-mono text-xs min-w-0"
            placeholder="dakar-maison/bassin/sensor/ph-eau/state"
            value={value.topic}
            onChange={e => set({ topic: e.target.value })}
          />
          <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={scan} disabled={scanning}>
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radar className="w-3.5 h-3.5" />}
            Explorer
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Les jokers <span className="font-mono">+</span> et <span className="font-mono">#</span> sont acceptés.</p>
      </div>

      {topics && (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
            <span className="text-xs text-muted-foreground shrink-0">{topics.length} topic(s) actif(s) sur le broker</span>
            <Input className="h-7 text-xs max-w-[180px]" placeholder="Filtrer…" value={topicFilter} onChange={e => setTopicFilter(e.target.value)} />
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-border">
            {visibleTopics.length === 0 ? (
              <p className="px-3 py-4 text-xs text-center text-muted-foreground">Aucun message reçu pendant l'écoute.</p>
            ) : visibleTopics.map(t => (
              <button
                key={t.topic}
                type="button"
                onClick={() => { set({ topic: t.topic, valuePath: "" }); setSamplePayload(t.payload); }}
                className={`block w-full min-w-0 overflow-hidden text-left px-3 py-2 hover:bg-muted/50 transition-colors ${value.topic === t.topic ? "bg-primary/10" : ""}`}
              >
                <p className="font-mono text-xs truncate flex items-center gap-1.5">
                  <Radio className="w-3 h-3 shrink-0 text-primary" /> {t.topic}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground truncate pl-[18px]">{t.payload || "(vide)"}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Champ JSON de la valeur <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
        <Input
          className="font-mono text-xs"
          placeholder="value"
          value={value.valuePath}
          onChange={e => set({ valuePath: e.target.value })}
        />
        {paths.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {paths.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => set({ valuePath: p })}
                className={`font-mono text-[11px] px-2 py-0.5 rounded border transition-colors ${value.valuePath === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {p}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Vide : le message entier est la valeur (ex. <span className="font-mono">27.4</span> ou <span className="font-mono">ON</span>).</p>
        )}
      </div>

      {showCommand && (
        <div className="space-y-1.5">
          <Label>Topic MQTT de commande <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
          <Input
            className="font-mono text-xs"
            placeholder="dakar-maison/salon/light/lampe-principale/set"
            value={value.commandTopic}
            onChange={e => set({ commandTopic: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground">Les commandes ON / OFF y sont publiées telles quelles.</p>
        </div>
      )}
    </div>
  );
}

export function MqttStatusBadge() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    const load = () => domMqttApi.status().then(s => { if (alive) setStatus(s); }).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!status?.enabled) return null;
  return (
    <span
      title={status.last_error || status.broker}
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${
        status.connected ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${status.connected ? "bg-success" : "bg-destructive"}`} />
      {status.connected
        ? `Broker MQTT connecté · ${status.subscriptions.length} topic(s)`
        : `Broker MQTT déconnecté${status.last_error ? ` : ${status.last_error}` : ""}`}
    </span>
  );
}
