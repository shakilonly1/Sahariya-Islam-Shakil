

            if (!text && attachments.length === 0) {
                const babyMessage = randomMessage[Math.floor(Math.random() * randomMessage.length)];
                return await api.sendMessage(babyMessage, event.threadID, (err, info) => {
                    if (!err) {
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName: module.exports.config.name,
                            type: "reply",
                            messageID: info.messageID,
                            author: event.senderID,
                            text: babyMessage
                        });
                    }
                }, event.messageID);
            }

            const response = (await axios.post(`${await baseApiUrl()}/api/baby?text=${encodeURIComponent(text)}&font=3`, { attachments })).data.reply;

            return await api.sendMessage(response, event.threadID, (err, info) => {
                if (!err) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName: module.exports.config.name,
                        type: "reply",
                        messageID: info.messageID,
                        author: event.senderID,
                        text: response
                    });
                }
            }, event.messageID);
        }
    } catch (err) {
        console.error(err);
