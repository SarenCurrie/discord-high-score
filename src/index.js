const app = require('discord-r9k-framework');
const highScore = require('./plugins/high-score/index');

app.init().then(() => {
  app.addPlugin(highScore);
}).catch((e) => {
  console.error('Error starting up');
  console.error(e);
  process.exit(1);
});
