const path = require('path');
const dotenv = require('dotenv');

// .env du dossier courant d'abord (comportement historique), puis backend/.env pour
// les variables manquantes : le serveur démarre pareil depuis backend/ ou backend/src/.
dotenv.config();
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[config] Missing required env var: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  },
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  // Broker MQTT de Home Assistant (module domotique). Sans MQTT_URL, le client n'est pas démarré.
  mqtt: {
    url: process.env.MQTT_URL,
    username: process.env.MQTT_USERNAME || process.env.Username_homeassistant,
    password: process.env.MQTT_PASSWORD || process.env.Pass_homeassistant,
  },
};
