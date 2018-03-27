const keyBy = require('lodash.keyby');
const persistence = require('./persistence');

const getUserById = (userId, opts) => {
  const member = opts.bot.servers[opts.serverId].members[userId];

  if (!member) {
    return `<DEAD USER ${userId}>`;
  }

  console.log(member);

  const nickname = member.nick;

  if (nickname) {
    return nickname;
  }

  const user = opts.bot.users[userId];
  if (!user) {
    return `<DEAD USER ${userId}>`;
  } else if (user.username) {
    return user.username;
  }

  return `<DEAD USER ${userId}>`;
};

const getRoleById = (roleId, opts) => {
  const role = opts.bot.servers[opts.serverId].roles[roleId];

  if (!role) {
    return `<DEAD ROLE ${roleId}>`;
  }

  const roleName = role.name;

  if (roleName) {
    return roleName;
  }

  return `<DEAD ROLE ${roleId}>`;
};

// <@!353009586287935509>
const removeMentions = (message, opts) => {
  const userMention = /<@!?(\d*)>/;
  const roleMention = /<@&(\d*)>/;
  let processing = message;
  while(userMention.test(processing)) {
    processing = processing.replace(userMention, `@${getUserById(processing.match(userMention)[1], opts)}`);
  }
  while(roleMention.test(processing)) {
    processing = processing.replace(roleMention, `@${getRoleById(processing.match(roleMention)[1], opts)}`);
  }

  return processing;
};

const reactionSum = (reactions1, reactions2) => reactions1.count + reactions2.count;

exports.init = (app) => {
  persistence.init(() => {
    app.addMessageTrigger('!high-score-sync', (opts) => {
      console.log(`Synching server ${opts.serverId}`);

      Object.keys(opts.bot.servers[opts.serverId].channels).forEach((channelId) => {
        console.log(`Syncing channel ${channelId}`);
        opts.bot.getMessages({ limit: 100, channelID: channelId }, (err, messages) => {
          if (err) {
            opts.bot.sendMessage({
              message: `SCRIPT CRASH ${err}`,
              to: opts.channelId,
            });
            return;
          }

          messages.forEach((message) => {
            if (message.reactions) {
              persistence.createOrUpdateMessage(message.id, channelId, opts.serverId, keyBy(message.reactions.map((reaction) => {
                let qualifiedEmoji = '';
                if (reaction.emoji.animated) {
                  qualifiedEmoji = `<a:${reaction.emoji.name}:${reaction.emoji.id}>`;
                } else if (reaction.emoji.id) {
                  qualifiedEmoji = `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
                } else {
                  qualifiedEmoji = reaction.emoji.name;
                }

                return {
                  count: reaction.count,
                  id: qualifiedEmoji,
                };
              }), 'id'));
            }
          });
        });
      });

      return 'Syncing recent messages in all channels. This may take a little while.';
    });

    app.addMessageTrigger(/^!high-score ((?:[^<.])|(?:<a?:.+:\d+>))$/u, (opts) => {
      if (!opts.matches[1]) {
        return 'SCRIPT CRASH probably a 🅱️roken regex';
      }

      const winningMessage = persistence.getMessages(opts.serverId)
          .filter(message => message && message.reactions)
          .filter(message => message.reactions[opts.matches[1]])
          .reduce(
            (message1, message2) => (message1.reactions[opts.matches[1]].count > message2.reactions[opts.matches[1]].count ? message1 : message2),
            { reactions: { [opts.matches[1]]: 0 } },
          );

      if (!winningMessage || !winningMessage.id) {
        return `No high scores for ${opts.matches[1]}`;
      }

      opts.bot.getMessage({ messageID: winningMessage.id, channelID: winningMessage.channelId }, (err, message) => {
        if (err) {
          console.error(err);
          opts.bot.sendMessage({ message: `SCRIPT CRASH ${err}`, to: opts.channelId });
          return;
        }

        opts.bot.sendMessage({
          message: `${message.author.username} got ${winningMessage.reactions[opts.matches[1]].count} ${opts.matches[1]} reactions for \n\n${removeMentions(message.content, opts)}`,
          to: opts.channelId,
        });
      });

      return '';
    });
  });
};
