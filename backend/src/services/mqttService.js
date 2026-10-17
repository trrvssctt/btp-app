// Client MQTT du module domotique : relie les équipements au broker de Home Assistant.
// - s'abonne au topic (mqtt_topic) de chaque équipement actif et enregistre les mesures reçues ;
// - publie les commandes des actionneurs sur leur mqtt_command_topic.
const mqtt = require('mqtt');
const env = require('../config/env');
const dm = require('../models/domDeviceModel');
const rm = require('../models/domReadingModel');

let client = null;
let lastError = null;
let lastConnectedAt = null;
let links = [];                 // [{ id, name, unit, mqtt_topic, mqtt_value_path }]
const subscribed = new Set();
const recentMessages = [];      // derniers messages reçus, pour le diagnostic
const MAX_RECENT = 50;

function brokerLabel() {
  if (!env.mqtt.url) return null;
  try { const u = new URL(env.mqtt.url); return `${u.protocol}//${u.host}`; } catch { return env.mqtt.url; }
}

function connectOptions(clientIdPrefix) {
  return {
    username: env.mqtt.username,
    password: env.mqtt.password,
    clientId: `${clientIdPrefix}-${Math.random().toString(16).slice(2, 8)}`,
    connectTimeout: 10_000,
    reconnectPeriod: 10_000,
  };
}

// Correspondance topic MQTT avec jokers + et #
function topicMatches(filter, topic) {
  const f = filter.split('/');
  const t = topic.split('/');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true;
    if (i >= t.length) return false;
    if (f[i] !== '+' && f[i] !== t[i]) return false;
  }
  return f.length === t.length;
}

// Extrait la valeur du message : chemin JSON optionnel (ex. "temperature" ou "data.ph")
function extractValue(raw, valuePath) {
  let parsed = raw;
  try { parsed = JSON.parse(raw); } catch { /* valeur brute */ }

  if (valuePath) {
    if (parsed === null || typeof parsed !== 'object') return undefined;
    return valuePath.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), parsed);
  }
  if (parsed !== null && typeof parsed === 'object') {
    return parsed.value ?? parsed.state;
  }
  return parsed;
}

// Date de la mesure portée par le message (updated_at / timestamp), sinon null
function extractTimestamp(raw) {
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (parsed === null || typeof parsed !== 'object') return null;
  const ts = parsed.updated_at ?? parsed.timestamp ?? parsed.time;
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ON/OFF et booléens convertis en 1/0 pour l'historique numérique
function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (/^(on|true|open|ouvert|present|présent)$/i.test(s)) return 1;
  if (/^(off|false|closed|fermé|absent)$/i.test(s)) return 0;
  const n = Number(s.replace(',', '.'));
  return s !== '' && Number.isFinite(n) ? n : null;
}

async function handleMessage(topic, payload, retained) {
  const raw = payload.toString();
  recentMessages.unshift({ topic, payload: raw.slice(0, 500), received_at: new Date().toISOString() });
  recentMessages.length = Math.min(recentMessages.length, MAX_RECENT);

  for (const dev of links.filter((d) => topicMatches(d.mqtt_topic, topic))) {
    const value = extractValue(raw, dev.mqtt_value_path);
    if (value === undefined || value === null) continue;
    try {
      const num = toNumber(value);
      const measuredAt = extractTimestamp(raw) || new Date().toISOString();
      // Message retenu renvoyé à chaque (ré)abonnement : déjà enregistré s'il a la même date
      if (retained && await rm.existsAt(dev.id, measuredAt)) continue;
      if (num !== null) {
        await rm.create({ device_id: dev.id, value: num, unit: dev.unit, metadata: { source: 'mqtt', topic, retained }, received_at: measuredAt });
      }
      await dm.update(dev.id, { last_value: String(value).slice(0, 100), last_seen_at: measuredAt, status: 'online' });
    } catch (err) {
      console.error(`[mqtt] Enregistrement impossible pour ${dev.id} :`, err.message);
    }
  }
}

// Recalcule les abonnements à partir des équipements en base (après création/modification)
async function refreshSubscriptions() {
  if (!client) return;
  links = await dm.listMqttLinked();
  const wanted = new Set(links.map((d) => d.mqtt_topic));

  const toRemove = [...subscribed].filter((t) => !wanted.has(t));
  const toAdd = [...wanted].filter((t) => !subscribed.has(t));
  if (toRemove.length) { client.unsubscribe(toRemove); toRemove.forEach((t) => subscribed.delete(t)); }
  if (toAdd.length && client.connected) {
    client.subscribe(toAdd, { qos: 0 }, (err) => {
      if (err) { lastError = err.message; return; }
      toAdd.forEach((t) => subscribed.add(t));
    });
  }
}

function start() {
  if (!env.mqtt.url) {
    console.log('[mqtt] MQTT_URL absent : client MQTT désactivé');
    return;
  }
  client = mqtt.connect(env.mqtt.url, connectOptions('btp-platform'));

  client.on('connect', () => {
    lastError = null;
    lastConnectedAt = new Date().toISOString();
    subscribed.clear();
    console.log(`[mqtt] Connecté à ${brokerLabel()}`);
    refreshSubscriptions().catch((e) => { lastError = e.message; });
  });
  client.on('error', (err) => {
    if (lastError !== err.message) console.error('[mqtt] Erreur :', err.message);
    lastError = err.message;
  });
  client.on('message', (topic, payload, packet) => { handleMessage(topic, payload, packet.retain); });
}

// Publie une commande ; résout true si le broker a accusé réception (QoS 1)
function publishCommand(topic, command, payload) {
  return new Promise((resolve) => {
    if (!client || !client.connected) return resolve(false);
    const extra = payload && Object.values(payload).some((v) => v !== null && v !== undefined);
    const message = extra ? JSON.stringify({ command, ...payload }) : command;
    client.publish(topic, message, { qos: 1 }, (err) => resolve(!err));
  });
}

// Écoute le broker quelques secondes pour lister les topics actifs (aide à la configuration)
function discover({ filter = '#', seconds = 5 } = {}) {
  return new Promise((resolve, reject) => {
    if (!env.mqtt.url) return reject(new Error('MQTT_URL non configuré'));
    const probe = mqtt.connect(env.mqtt.url, { ...connectOptions('btp-discover'), reconnectPeriod: 0 });
    const topics = new Map();
    const finish = () => { probe.end(true); resolve([...topics.values()].sort((a, b) => a.topic.localeCompare(b.topic))); };

    probe.on('connect', () => {
      probe.subscribe(filter, (err) => { if (err) { probe.end(true); reject(err); } });
      setTimeout(finish, seconds * 1000);
    });
    probe.on('error', (err) => { probe.end(true); reject(err); });
    probe.on('message', (topic, payload, packet) => {
      const prev = topics.get(topic);
      topics.set(topic, {
        topic,
        payload: payload.toString().slice(0, 300),
        retained: packet.retain,
        count: (prev?.count || 0) + 1,
      });
    });
  });
}

function status() {
  return {
    enabled: Boolean(env.mqtt.url),
    broker: brokerLabel(),
    username: env.mqtt.username || null,
    connected: Boolean(client?.connected),
    last_connected_at: lastConnectedAt,
    last_error: lastError,
    subscriptions: [...subscribed],
    linked_devices: links.map((d) => ({ id: d.id, name: d.name, topic: d.mqtt_topic, value_path: d.mqtt_value_path })),
    recent_messages: recentMessages,
  };
}

module.exports = { start, refreshSubscriptions, publishCommand, discover, status, extractValue, extractTimestamp, toNumber, topicMatches };
