const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`\n🏗️  BTP Manager API running on http://localhost:${env.port}`);
  console.log(`   Env       : ${env.nodeEnv}`);
  console.log(`   CORS      : ${env.corsOrigins.join(', ')}`);
  console.log(`   Health    : http://localhost:${env.port}/health\n`);
});
