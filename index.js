process.env.BAILEYS_LOG_LEVEL = 'silent';
process.env.NODE_NO_WARNINGS = '1';

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, downloadContentFromMessage, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const express = require('express');
const QRCode = require('qrcode');
const axios = require('axios');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
let qrCodeImage = '';

// ============== BOT CONFIG - YAHAN NAAM CHANGE KARO ==============
const OWNER_NAME = "👑 ᴏᴡɴᴇʀ: YASEEN MYS-MD";
const OWNER_NUMBER = "923709928789"; // Apna number 92 ke saath bina + ke
const BOT_NAME = "YASEEN MYS-MD";
const PREFIX = ".";
const VERSION = "10.0.0 ULTIMATE";
// =================================================================

console.log(`🚀 ${BOT_NAME} Booting Up...`);

if (!fs.existsSync('./MYS_Saved_Statuses')) fs.mkdirSync('./MYS_Saved_Statuses');
if (!fs.existsSync('./database')) fs.mkdirSync('./database');

// Database files
const antilinkDB = './database/antilink.json';
const welcomeDB = './database/welcome.json';
const banDB = './database/ban.json';
if (!fs.existsSync(antilinkDB)) fs.writeFileSync(antilinkDB, JSON.stringify({}));
if (!fs.existsSync(welcomeDB)) fs.writeFileSync(welcomeDB, JSON.stringify({}));
if (!fs.existsSync(banDB)) fs.writeFileSync(banDB, JSON.stringify([]));

// Utils
const runtime = (seconds) => {
    seconds = Number(seconds);
    let d = Math.floor(seconds / (3600 * 24));
    let h = Math.floor(seconds % (3600 * 24) / 3600);
    let m = Math.floor(seconds % 3600 / 60);
    let s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

let startTime = Date.now();

app.get('/', (req, res) => {
    if (qrCodeImage) {
        res.send(`
            <html>
            <head><title>${BOT_NAME} - QR</title></head>
            <body style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif;background:#0a0a0a;color:#fff;margin:0">
                <h1 style="color:#ff0000;text-shadow:0 0 20px #ff0000">${BOT_NAME}</h1>
                <p style="font-size:18px">WhatsApp → Linked Devices → Link Device</p>
                <img src="${qrCodeImage}" style="border:8px solid #ff0000;border-radius:20px;box-shadow:0 0 30px #ff0000"/>
                <p style="margin-top:20px;color:#999">Scan once. Runs 24/7 on cloud</p>
                <p style="color:#ff0000">👑 ${OWNER_NAME}</p>
            </body>
            </html>
        `);
    } else {
        res.send(`<h1 style="color:#00ff00;background:#000;text-align:center;padding:50px">${BOT_NAME} ONLINE ✅</h1>`);
    }
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        version,
        logger: pino({ level: 'fatal' }),
        printQRInTerminal: false,
        browser: [BOT_NAME, 'Chrome', '120.0.0'],
        markOnlineOnConnect: false,
        syncFullHistory: false,
        getMessage: async (key) => undefined
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('🔥 QR CODE GENERATED');
            qrCodeImage = await QRCode.toDataURL(qr);
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Reconnecting...');
                startBot();
            } else {
                console.log('Logged out. Delete auth_info_baileys and restart');
            }
        } else if (connection === 'open') {
            console.log('✅ BOT CONNECTED!');
            qrCodeImage = '';
            await sock.sendMessage(sock.user.id, {
                text: `*${BOT_NAME} ACTIVATED* ⚡\n\nVersion: ${VERSION}\nPrefix: ${PREFIX}\nOwner: ${OWNER_NAME}\n\nType ${PREFIX}menu for commands`
            });
        }
    });

    // AUTO STATUS SEEN + REACT
    sock.ev.on('messages.upsert', async (m) => {
        try {
            if (m.type === 'append') {
                for (let msg of m.messages) {
                    if (msg.key.remoteJid === 'status@broadcast') {
                        await sock.readMessages([msg.key]);
                        const emojis = ['🔥', '❤️', '😍', '👑', '💯', '⚡', '✨'];
                        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                        await sock.sendMessage(msg.key.remoteJid, {
                            react: { text: randomEmoji, key: msg.key }
                        }, { statusJidList: [msg.key.participant] });
                    }
                }
            }
        } catch (e) {}
    });

    // WELCOME + GOODBYE
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const { id, participants, action } = update;
            let welcomeData = JSON.parse(fs.readFileSync(welcomeDB));
            if (!welcomeData[id]) return;

            const groupMetadata = await sock.groupMetadata(id);
            const groupName = groupMetadata.subject;
            const memberCount = groupMetadata.participants.length;

            for (let participant of participants) {
                if (action === 'add') {
                    await sock.sendMessage(id, {
                        text: `🎉 *WELCOME TO ${groupName}* 🎉\n\n👋 Hey @${participant.split('@')[0]}!\n\n⚡ You are member #${memberCount}\n\n📜 *Rules:*\n1️⃣ No Links - Auto Kick\n2️⃣ Respect all members\n3️⃣ Enjoy your stay\n\n💬 Type ${PREFIX}menu\n\n👑 ${OWNER_NAME}`,
                        mentions: [participant]
                    });
                } else if (action === 'remove') {
                    await sock.sendMessage(id, {
                        text: `😢 @${participant.split('@')[0]} left ${groupName}\n\nWe'll miss you!`,
                        mentions: [participant]
                    });
                }
            }
        } catch (e) { console.log('Welcome Error:', e.message); }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = isGroup? msg.key.participant : from;
        const isMe = msg.key.fromMe;
        const pushName = msg.pushName || 'User';
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isOwner = sender === botNumber || sender === OWNER_NUMBER + '@s.whatsapp.net';

        const body = msg.message.conversation ||
                     msg.message.extendedTextMessage?.text ||
                     msg.message.imageMessage?.caption ||
                     msg.message.videoMessage?.caption || "";

        const lowerBody = body.toLowerCase().trim();
        const args = body.trim().split(/ +/).slice(1);
        const command = body.startsWith(PREFIX)? body.trim().split(/ +/)[0].slice(PREFIX.length).toLowerCase() : '';
        const q = args.join(' ');

        // BAN CHECK
        let banned = JSON.parse(fs.readFileSync(banDB));
        if (banned.includes(sender) &&!isOwner) return;

        // ANTI-LINK SYSTEM
        let antilinkData = JSON.parse(fs.readFileSync(antilinkDB));
        if (!isMe && isGroup && antilinkData[from]) {
            const linkRegex = /(https?:\/\/|www\.|chat\.whatsapp\.com|t\.me|bit\.ly|youtu\.be|instagram\.com|facebook\.com|tiktok\.com|tinyurl\.com)/i;
            if (linkRegex.test(lowerBody)) {
                try {
                    await sock.sendMessage(from, { delete: msg.key });
                    if (!isOwner) {
                        await sock.groupParticipantsUpdate(from, [sender], "remove");
                        await sock.sendMessage(from, {
                            text: `🚫 *ANTI-LINK* 🚫\n\n@${sender.split('@')[0]} removed for sending link!\n\n⚡ ${BOT_NAME} Security System`,
                            mentions: [sender]
                        });
                    }
                } catch (e) {
                    await sock.sendMessage(from, { delete: msg.key });
                    await sock.sendMessage(from, { text: `⚠️ Link detected! Bot needs admin rights to kick.` });
                }
                return;
            }
        }

        if (!command) return;

        // ==================== COMMANDS ====================

        // 1. MAIN MENU
        if (command === 'menu' || command === 'help' || command === 'allmenu') {
            const uptime = runtime((Date.now() - startTime) / 1000);
            const totalMem = formatBytes(os.totalmem());
            const freeMem = formatBytes(os.freemem());
            const usedMem = formatBytes(os.totalmem() - os.freemem());

            const menuText = `┈───〔 ${BOT_NAME} 〕┈───⊷
├✦ Owner: ${OWNER_NAME}
├✦ Version: ${VERSION}
├✦ Prefix: ${PREFIX}
├✦ Uptime: ${uptime}
├✦ Users: Banned ${banned.length}
├✦ RAM: ${usedMem} / ${totalMem}
╰───────────────────⊷

『 MAIN 』
╭───────────────────⊷
┋ ⬡ ${PREFIX}menu ${PREFIX}help
┋ ⬡ ${PREFIX}alive ${PREFIX}ping
┋ ⬡ ${PREFIX}owner ${PREFIX}sc
┋ ⬡ ${PREFIX}runtime ${PREFIX}speed
╰───────────────────⊷
『 GROUP 』
╭───────────────────⊷
┋ ⬡ ${PREFIX}kick @user
┋ ⬡ ${PREFIX}add 92xxx
┋ ⬡ ${PREFIX}promote ${PREFIX}demote
┋ ⬡ ${PREFIX}tagall ${PREFIX}hidetag
┋ ⬡ ${PREFIX}link ${PREFIX}revoke
┋ ⬡ ${PREFIX}antilink on/off
┋ ⬡ ${PREFIX}welcome on/off
┋ ⬡ ${PREFIX}group open/close
┋ ⬡ ${PREFIX}setname ${PREFIX}setdesc
╰───────────────────⊷
『 OWNER 』
╭───────────────────⊷
┋ ⬡ ${PREFIX}ban @user
┋ ⬡ ${PREFIX}unban @user
┋ ⬡ ${PREFIX}block ${PREFIX}unblock
┋ ⬡ ${PREFIX}join ${PREFIX}leave
┋ ⬡ ${PREFIX}broadcast
┋ ⬡ ${PREFIX}setppbot
┋ ⬡ ${PREFIX}restart
╰───────────────────⊷
『 DOWNLOAD 』
╭───────────────────⊷
┋ ⬡ ${PREFIX}play ${PREFIX}song
┋ ⬡ ${PREFIX}video ${PREFIX}ytmp4
┋ ⬡ ${PREFIX}ytmp3 ${PREFIX}yta
┋ ⬡ ${PREFIX}tiktok ${PREFIX}igdl
┋ ⬡ ${PREFIX}fb ${PREFIX}twitter
╰───────────────────⊷
『 TOOLS 』
╭───────────────────⊷
┋ ⬡ ${PREFIX}save [status reply]
┋ ⬡ ${PREFIX}sticker ${PREFIX}toimg
┋ ⬡ ${PREFIX}removebg ${PREFIX}upscale
┋ ⬡ ${PREFIX}ss ${PREFIX}shorturl
┋ ⬡ ${PREFIX}calc ${PREFIX}translate
╰───────────────────⊷
『 FUN 』
╭───────────────────⊷
┋ ⬡ ${PREFIX}joke ${PREFIX}quote
┋ ⬡ ${PREFIX}ship @user1 @user2
┋ ⬡ ${PREFIX}roast ${PREFIX}dare
┋ ⬡ ${PREFIX}truth ${PREFIX}8ball
╰───────────────────⊷

> © POWERED BY ${OWNER_NAME}`;

            await sock.sendMessage(from, {
                image: { url: 'https://i.ibb.co/4Z6PqzJ/overlord.jpg' },
                caption: menuText
            });
            return;
        }

        // 2. ALIVE
        if (command === 'alive' || command === 'bot') {
            await sock.sendMessage(from, {
                text: `*${BOT_NAME} IS ALIVE* ⚡\n\n👑 Owner: ${OWNER_NAME}\n🔥 Version: ${VERSION}\n⚙️ Runtime: ${runtime((Date.now() - startTime) / 1000)}\n\nType ${PREFIX}menu for commands`
            });
            return;
        }

        // 3. PING
        if (command === 'ping' || command === 'speed') {
            const start = Date.now();
            let msg = await sock.sendMessage(from, { text: 'Testing speed...' });
            const end = Date.now();
            await sock.sendMessage(from, {
                text: `*⚡ SPEED TEST* ⚡\n\n📶 Response: ${end - start}ms\n🚀 Status: Ultra Fast\n\n${BOT_NAME}`,
                edit: msg.key
            });
            return;
        }

        // 4. OWNER
        if (command === 'owner' || command === 'creator') {
            await sock.sendMessage(from, {
                text: `👑 *OWNER INFO* 👑\n\n🔥 Name: ${OWNER_NAME}\n⚡ Bot: ${BOT_NAME}\n📱 Number: wa.me/${OWNER_NUMBER}\n🛡 Status: Supreme Leader\n\n💬 Contact for bot issues only`
            });
            return;
        }

        // 5. ANTILINK ON/OFF
        if (command === 'antilink' && isGroup) {
            if (!isOwner) return await sock.sendMessage(from, { text: '❌ Only owner can use this!' });
            if (args[0] === 'on') {
                antilinkData[from] = true;
                fs.writeFileSync(antilinkDB, JSON.stringify(antilinkData));
                await sock.sendMessage(from, { text: '✅ *Anti-Link Activated*\n\nLinks will be auto-deleted + kicker enabled' });
            } else if (args[0] === 'off') {
                delete antilinkData[from];
                fs.writeFileSync(antilinkDB, JSON.stringify(antilinkData));
                await sock.sendMessage(from, { text: '❌ *Anti-Link Deactivated*' });
            } else {
                await sock.sendMessage(from, { text: `Usage: ${PREFIX}antilink on/off` });
            }
            return;
        }

        // 6. WELCOME ON/OFF
        if (command === 'welcome' && isGroup) {
            if (!isOwner) return await sock.sendMessage(from, { text: '❌ Only owner!' });
            let welcomeData = JSON.parse(fs.readFileSync(welcomeDB));
            if (args[0] === 'on') {
                welcomeData[from] = true;
                fs.writeFileSync(welcomeDB, JSON.stringify(welcomeData));
                await sock.sendMessage(from, { text: '✅ *Welcome Messages Enabled*' });
            } else if (args[0] === 'off') {
                delete welcomeData[from];
                fs.writeFileSync(welcomeDB, JSON.stringify(welcomeData));
                await sock.sendMessage(from, { text: '❌ *Welcome Messages Disabled*' });
            }
            return;
        }

        // 7. KICK
        if (command === 'kick' && isGroup) {
            if (!isOwner) return await sock.sendMessage(from, { text: '❌ Owner only!' });
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (!mentioned) return await sock.sendMessage(from, { text: '❌ Mention someone!' });
            try {
                await sock.groupParticipantsUpdate(from, mentioned, "remove");
                await sock.sendMessage(from, { text: `✅ Kicked by ${OWNER_NAME}` });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Bot needs admin rights!' });
            }
            return;
        }

        // 8. TAGALL
        if (command === 'tagall' && isGroup) {
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            let text = `📢 *${BOT_NAME} ANNOUNCEMENT* 📢\n\n${q || 'Attention everyone!'}\n\n`;
            let mentions = [];
            for (let participant of participants) {
                text += `⚡ @${participant.id.split('@')[0]}\n`;
                mentions.push(participant.id);
            }
            text += `\n👑 ${OWNER_NAME}`;
            await sock.sendMessage(from, { text, mentions });
            return;
        }

        // 9. BAN/UNBAN
        if (command === 'ban') {
            if (!isOwner) return await sock.sendMessage(from, { text: '❌ Owner only!' });
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (!mentioned) return await sock.sendMessage(from, { text: '❌ Mention user!' });
            if (!banned.includes(mentioned[0])) {
                banned.push(mentioned[0]);
                fs.writeFileSync(banDB, JSON.stringify(banned));
                await sock.sendMessage(from, { text: `✅ @${mentioned[0].split('@')[0]} banned from bot`, mentions: mentioned });
            }
            return;
        }

        if (command === 'unban') {
            if (!isOwner) return await sock.sendMessage(from, { text: '❌ Owner only!' });
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (!mentioned) return await sock.sendMessage(from, { text: '❌ Mention user!' });
            banned = banned.filter(u => u!== mentioned[0]);
            fs.writeFileSync(banDB, JSON.stringify(banned));
            await sock.sendMessage(from, { text: `✅ @${mentioned[0].split('@')[0]} unbanned`, mentions: mentioned });
            return;
        }

        // 10. STATUS SAVER
        if (command === 'save') {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (msg.key.remoteJid === 'status@broadcast' || quoted) {
                try {
                    const messageToSave = quoted || msg.message;
                    const type = Object.keys(messageToSave)[0];
                    const mediaType = type.replace('Message', '');
                    const stream = await downloadContentFromMessage(messageToSave[type], mediaType);
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                    const ext = mediaType === 'image'? 'jpg' : 'mp4';
                    const fileName = `./MYS_Saved_Statuses/${Date.now()}.${ext}`;
                    fs.writeFileSync(fileName, buffer);
                    await sock.sendMessage(sender, {
                        [mediaType]: buffer,
                        caption: `✅ Status Saved by ${BOT_NAME}`
                    });
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ Failed to save status' });
                }
            } else {
                await sock.sendMessage(from, { text: `❌ Reply to a status with ${PREFIX}save` });
            }
            return;
        }

        // 11. PLAY SONG
        if (command === 'play' || command === 'song') {
            if (!q) return await sock.sendMessage(from, { text: `❌ Song name do!\nExample: ${PREFIX}play Atif Aslam` });
            await sock.sendMessage(from, {
                text: `🎵 *${BOT_NAME} MUSIC* 🎵\n\n📌 *Searching:* ${q}\n\n🔗 *YouTube:* https://youtube.com/results?search_query=${encodeURIComponent(q)}\n\n⚠️ Direct download coming soon!\n\n👑 ${OWNER_NAME}`
            });
            return;
        }

        // 12. STICKER
        if (command === 'sticker' || command === 's') {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const messageToConvert = quoted || msg.message;
            if (messageToConvert.imageMessage || messageToConvert.videoMessage) {
                try {
                    const type = messageToConvert.imageMessage? 'image' : 'video';
                    const stream = await downloadContentFromMessage(messageToConvert[type + 'Message'], type);
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                    await sock.sendMessage(from, { sticker: buffer });
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ Failed to create sticker' });
                }
            } else {
                await sock.sendMessage(from, { text: `❌ Reply to image/video with ${PREFIX}sticker` });
            }
            return;
        }

    });
}

app.listen(PORT, () => {
    console.log(`🌐 Server: http://localhost:${PORT}`);
    startBot();
});