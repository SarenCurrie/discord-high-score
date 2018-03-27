const Loki = require('lokijs');

let db;
let initialized = false;

function messageCollection() {
  // Check collection exists, otherwise create it
  let messages = db.getCollection('messages');
  if (!messages) {
    messages = db.addCollection('messages', { indices: ['id'] });
  }
  return messages;
}

const init = (done) => {
  if (initialized) {
    return;
  }

  initialized = true;
  db = new Loki('./data/high-scores.loki.json');

  db.loadDatabase({}, (err) => {
    if (err) {
      done(err);
    }

    messageCollection();

    done();
  });
};

exports.init = init;

function getMessage(messageId, serverId) {
  const messages = messageCollection();
  let message = messages.findOne({ id: messageId });

  if (!message) {
    console.log(`Creating high score entry for message id ${messageId}`);
    messages.insert({ id: messageId, serverId, reactions: {}, total: 0 });
    message = messages.findOne({ id: messageId });
  }
  return message;
}

exports.createOrUpdateMessage = (messageId, channelId, serverId, reactions) => {
  const messages = messageCollection();

  messages.insert({ id: messageId, channelId, serverId, reactions, total: Object.values(reactions).map(r => r.count).reduce(((a, b) => a + b), 0) });

  db.saveDatabase(err => console.error(err));
};

exports.getMessage = getMessage;
exports.getMessages = (serverId) => {
  console.log(`Getting messages from ${serverId}`);

  return messageCollection().find({ serverId });
};
