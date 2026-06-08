process.env.BAILEYS_LOG_LEVEL = "silent";
process.env.NODE_NO_WARNINGS = "1";
const {
 default: makeWASocket,
 useMultiFileAuthState,
 fetchLatestBaileysVersion,
 downloadContentFromMessage,
 DisconnectReason,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const express = require("express");
const QRCode = require("qrcode");
const axios = require("axios");
const os = require("os");
const app = express();
const PORT = process.env.PORT || 3000;
let qrCodeImage = "";
// ============== BOT CONFIG - YAHAN NAAM CHANGE KARO ==============
const OWNER_NAME = "👑 ᴏᴡɴᴇʀ: YASEEN-MYS-MD";
const OWNER_NUMBER = "923709928789"; // ✅ SIRF YAHAN EK BAAR LIKHO
const BOT_NAME = "YASEEN-MYS-MD";
const PREFIX = ".";
const VERSION = "4.0.0 Beta";
// =================================================================
// ============== AUTO REACT CONFIG ==============
let AUTO_REACT = true;
const reactEmojis = ["❤️","😂","🔥","😍","👍","😎","🥰","💯","😘","🤩"];
// ===============================================
console.log(`🚀 ${BOT_NAME} Booting Up...`);
if (!fs.existsSync("./MYS_Saved_Statuses"))
 fs.mkdirSync("./MYS_Saved_Statuses");
if (!fs.existsSync("./database")) fs.mkdirSync("./database");
// Database files
const antilinkDB = "./database/antilink.json";
const welcomeDB = "./database/welcome.json";
const banDB = "./database/ban.json";
if (!fs.existsSync(antilinkDB))
 fs.writeFileSync(antilinkDB, JSON.stringify({}));
if (!fs.existsSync(welcomeDB)) fs.writeFileSync(welcomeDB, JSON.stringify({}));
if (!fs.existsSync(banDB)) fs.writeFileSync(banDB, JSON.stringify([]));
// Utils
const runtime = (seconds) => {
 seconds = Number(seconds);
 let d = Math.floor(seconds / (3600 * 24));
 let h = Math.floor((seconds % (3600 * 24)) / 3600);
 let m = Math.floor((seconds % 3600) / 60);
 let s = Math.floor(seconds % 60);
 return `${d}d ${h}h ${m}m ${s}s`;
};
const formatBytes = (bytes) => {
 if (bytes === 0) return "0 Bytes";
 const k = 1024;
 const sizes = ["Bytes", "KB", "MB", "GB"];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
let startTime = Date.now();
app.get("/", (req, res) => {
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
 res.send(`YASEEN-MYS-MD Bot Running ✅`);
 }
});
// Health check for Cyclic / Render / Railway
app.get("/health", (req, res) => res.send("OK"));
async function startBot() {
 const { state, saveCreds } =
 await useMultiFileAuthState("session");
 const { version } = await fetchLatestBaileysVersion();
 const sock = makeWASocket({
 auth: state,
 version,
 logger: pino({ level: "fatal" }),
 printQRInTerminal: true,
 browser: [BOT_NAME, "Chrome", "120.0.0"],
 markOnlineOnConnect: false,
 syncFullHistory: false,
 getMessage: async (key) => undefined,
 });
 sock.ev.on("creds.update", saveCreds);
 let pairingCodeRequested = false;
 sock.ev.on("connection.update", async (update) => {
 const { connection, lastDisconnect, qr } = update;
 if (qr) {
 console.log("🔥 QR CODE GENERATED — Scan karo ya Pairing Code use karo");
 qrCodeImage = await QRCode.toDataURL(qr);
 // Pairing code sirf tab request karo jab QR aaye aur registered nahi ho
 if (!pairingCodeRequested && !sock.authState.creds.registered) {
 pairingCodeRequested = true;
 try {
 const code = await sock.requestPairingCode(OWNER_NUMBER);
 console.log("\n===========================================");
 console.log(" 🔑 YOUR PAIRING CODE ");
 console.log("===========================================");
 console.log(` 👉 ${code} 👈 `);
 console.log("===========================================");
 console.log("HOW TO USE:");
 console.log("1. WhatsApp kholain");
 console.log("2. 3 dots → Linked Devices → Link a Device");
 console.log("3. 'Link with phone number' select karein");
 console.log(`4. Number: ${OWNER_NUMBER}`);
 console.log(`5. Ye code enter karein: ${code}`);
 console.log("===========================================\n");
 } catch (e) {
 console.log("⚠️ Pairing code error:", e.message);
 console.log("💡 Tip: session folder delete karke restart karein");
 }
 }
 }
 if (connection === "close") {
 const shouldReconnect =
 lastDisconnect?.error?.output?.statusCode !==
 DisconnectReason.loggedOut;
 if (shouldReconnect) {
 console.log("Reconnecting...");
 startBot();
 } else {
 console.log("⚠️ Session expired, pairing needed. Delete session folder and restart.");
 }
 } else if (connection === "open") {
 console.log("✅ BOT CONNECTED!");
 console.log("Owner:", OWNER_NUMBER + "@s.whatsapp.net");
 qrCodeImage = "";
 await sock.sendMessage(sock.user.id, {
 text: `*${BOT_NAME} ACTIVATED* ⚡\n\nVersion: ${VERSION}\nPrefix: ${PREFIX}\nOwner: ${OWNER_NAME}\n\nType ${PREFIX}menu for commands`,
 });
 }
 });
 // AUTO STATUS SEEN + REACT
 sock.ev.on("messages.upsert", async (m) => {
 try {
 if (m.type === "append") {
 for (let msg of m.messages) {
 if (msg.key.remoteJid === "status@broadcast") {
 await sock.readMessages([msg.key]);
 const emojis = [
 "🔥",
 "❤",
 "😍",
 "👑",
 "💯",
 "⚡",
 "✨",
 ];
 const randomEmoji =
 emojis[Math.floor(Math.random() * emojis.length)];
 await sock.sendMessage(
 msg.key.remoteJid,
 {
 react: { text: randomEmoji, key: msg.key },
 },
 { statusJidList: [msg.key.participant] },
 );
 }
 }
 }
 } catch (e) {}
 });
 // WELCOME + GOODBYE
 sock.ev.on("group-participants.update", async (update) => {
 try {
 const { id, participants, action } = update;
 const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";
 for (let participant of participants) {
 // Participant string ya object dono handle karo
 const participantJid = typeof participant === "string"
 ? participant
 : (participant.id || participant.jid || String(participant));
 // Bot khud ke add/remove pe message na bheje
 if (participantJid === botNumber) continue;
 const participantNum = participantJid.split("@")[0];
 if (action === "add") {
 await sock.sendMessage(id, {
 text: `👋 Welcome @${participantNum}! YASEEN-MYS-MD ke group me khush amdeed 🌟`,
 mentions: [participantJid],
 });
 } else if (action === "remove") {
 await sock.sendMessage(id, {
 text: `😢 @${participantNum} group chor kar chala gaya. Allah hafiz!`,
 mentions: [participantJid],
 });
 }
 }
 } catch (e) {
 console.log("Welcome/Goodbye Error:", e.message);
 }
 });
 sock.ev.on("messages.upsert", async (m) => {
 const msg = m.messages[0];
 if (!msg.message || msg.key.remoteJid === "status@broadcast") return;
 const from = msg.key.remoteJid;
 const isGroup = from.endsWith("@g.us");
 const sender = isGroup ? msg.key.participant : from;
 const isMe = msg.key.fromMe;
 const pushName = msg.pushName || "User";
 const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";
 const isOwner =
 sender === botNumber || sender === OWNER_NUMBER + "@s.whatsapp.net";
 // Check if sender is group admin
 let isAdmin = false;
 if (isGroup) {
 try {
 const groupMeta = await sock.groupMetadata(from);
 const admins = groupMeta.participants
 .filter((p) => p.admin)
 .map((p) => p.id);
 isAdmin = admins.includes(sender) || isOwner;
 } catch (e) {
 isAdmin = isOwner;
 }
 } else {
 isAdmin = true;
 }
 const body =
 msg.message.conversation ||
 msg.message.extendedTextMessage?.text ||
 msg.message.imageMessage?.caption ||
 msg.message.videoMessage?.caption ||
 "";
 const lowerBody = body.toLowerCase().trim();
 const args = body.trim().split(/ +/).slice(1);
 const command = body.startsWith(PREFIX)
 ? body.trim().split(/ +/)[0].slice(PREFIX.length).toLowerCase()
 : "";
 const q = args.join(" ");
 // BAN CHECK
 let banned = JSON.parse(fs.readFileSync(banDB));
 if (banned.includes(sender) && !isAdmin) return;
 // ANTI-LINK SYSTEM
 let antilinkData = JSON.parse(fs.readFileSync(antilinkDB));
 if (!isMe && isGroup && antilinkData[from]) {
 const linkRegex =
 /(https?:\/\/|www\.|chat\.whatsapp\.com|t\.me|bit\.ly|youtu\.be|instagram\.com|facebook\.com|tiktok\.com|tinyurl\.com)/i;
 if (linkRegex.test(lowerBody)) {
 try {
 await sock.sendMessage(from, { delete: msg.key });
 if (!isAdmin) {
 await sock.groupParticipantsUpdate(
 from,
 [sender],
 "remove",
 );
 await sock.sendMessage(from, {
 text: `🚫 *ANTI-LINK* 🚫\n\n@${sender.split("@")[0]} removed for sending link!\n\n⚡ ${BOT_NAME} Security System`,
 mentions: [sender],
 });
 }
 } catch (e) {
 await sock.sendMessage(from, { delete: msg.key });
 await sock.sendMessage(from, {
 text: `⚠ Link detected! Bot needs admin rights to kick.`,
 });
 }
 return;
 }
 }
 // ==================== AUTO REACT ====================
 if (AUTO_REACT && isGroup && !isMe && body && !body.startsWith(PREFIX)) {
 try {
 let emoji;
 if (isOwner) {
 // Owner ke message pe double heart
 emoji = "❤️";
 await sock.sendMessage(from, { react: { text: emoji, key: msg.key } });
 await sock.sendMessage(from, { react: { text: "❤️", key: msg.key } });
 } else {
 emoji = reactEmojis[Math.floor(Math.random() * reactEmojis.length)];
 await sock.sendMessage(from, { react: { text: emoji, key: msg.key } });
 }
 } catch (e) {}
 }
 if (!command) return;
 // ==================== COMMANDS ====================
 // 1. MAIN MENU
 if (command === "menu" || command === "help" || command === "allmenu") {
 const uptime = runtime((Date.now() - startTime) / 1000);
 const usedMem = formatBytes(os.totalmem() - os.freemem());
 const totalMem = formatBytes(os.totalmem());
 const menuText = `╔══❰ ${BOT_NAME} ❱══╗
║ ${OWNER_NAME}
║ 📜 ᴄᴏᴍᴍᴀɴᴅs: 706
║ ⚙ ᴍᴏᴅᴇ: public
║ 🏷 ᴠᴇʀsɪᴏɴ: ${VERSION}
║ ⏱ ᴜᴘᴛɪᴍᴇ: ${uptime}
║ 💾 ʀᴀᴍ: ${usedMem} / ${totalMem}
╚══════════════════╝
╔══❰ 🔥 HOT ❱══╗
║ ─ ${PREFIX}china ║ ─ ${PREFIX}indo
║ ─ ${PREFIX}korea ║ ─ ${PREFIX}thailand
║ ─ ${PREFIX}vietnam ║ ─ ${PREFIX}loli
║ ─ ${PREFIX}pap ║ ─ ${PREFIX}japan
║ ─ ${PREFIX}romantic ║ ─ ${PREFIX}couple
║ ─ ${PREFIX}romance ║ ─ ${PREFIX}intimate
║ ─ ${PREFIX}firstnight ║ ─ ${PREFIX}suhagraat
║ ─ ${PREFIX}bedroom ║ ─ ${PREFIX}cuddle
║ ─ ${PREFIX}passionate ║ ─ ${PREFIX}lovers
║ ─ ${PREFIX}romancing ║ ─ ${PREFIX}together
╚══════════════════╝
╔══❰ 🤖 AI ❱══╗
║ ─ ${PREFIX}gpt35 ║ ─ ${PREFIX}gpt4o
║ ─ ${PREFIX}claude ║ ─ ${PREFIX}claudeopus
║ ─ ${PREFIX}gemini ║ ─ ${PREFIX}geminipro
║ ─ ${PREFIX}grok ║ ─ ${PREFIX}grokbeta
║ ─ ${PREFIX}deepseek ║ ─ ${PREFIX}deepseekcoder
║ ─ ${PREFIX}llama ║ ─ ${PREFIX}llama2
║ ─ ${PREFIX}llama3 ║ ─ ${PREFIX}perplexity
║ ─ ${PREFIX}mistral ║ ─ ${PREFIX}codellama
║ ─ ${PREFIX}bard ║ ─ ${PREFIX}copilot
║ ─ ${PREFIX}chatgpt
╚══════════════════╝
╔══❰ 🌸 ANIME ❱══╗
║ ─ ${PREFIX}waifu ║ ─ ${PREFIX}neko
║ ─ ${PREFIX}kitsune ║ ─ ${PREFIX}husbando
║ ─ ${PREFIX}animegirl ║ ─ ${PREFIX}animeboy
║ ─ ${PREFIX}catgirl ║ ─ ${PREFIX}foxgirl
║ ─ ${PREFIX}kawaii ║ ─ ${PREFIX}otaku
╚══════════════════╝
╔══❰ 😂 FUN ❱══╗
║ ─ ${PREFIX}ringtone ║ ─ ${PREFIX}compatibility
║ ─ ${PREFIX}aura ║ ─ ${PREFIX}roast
║ ─ ${PREFIX}8ball ║ ─ ${PREFIX}compliment
║ ─ ${PREFIX}lovetest ║ ─ ${PREFIX}emoji
║ ─ ${PREFIX}quote ║ ─ ${PREFIX}marriage
║ ─ ${PREFIX}bacha ║ ─ ${PREFIX}bachi
║ ─ ${PREFIX}ship ║ ─ ${PREFIX}breakup
║ ─ ${PREFIX}husband ║ ─ ${PREFIX}wife
║ ─ ${PREFIX}propose ║ ─ ${PREFIX}crush
║ ─ ${PREFIX}hack
╚══════════════════╝
╔══❰ 👥 GROUP ❱══╗
║ ─ ${PREFIX}kick ║ ─ ${PREFIX}add
║ ─ ${PREFIX}promote ║ ─ ${PREFIX}demote
║ ─ ${PREFIX}tagall ║ ─ ${PREFIX}hidetag
║ ─ ${PREFIX}antilink ║ ─ ${PREFIX}welcome
║ ─ ${PREFIX}link ║ ─ ${PREFIX}revoke
╚══════════════════╝
╔══❰ 🛠 TOOLS ❱══╗
║ ─ ${PREFIX}sticker ║ ─ ${PREFIX}toimg
║ ─ ${PREFIX}save ║ ─ ${PREFIX}ping
║ ─ ${PREFIX}alive ║ ─ ${PREFIX}owner
╚══════════════════╝
> © ${BOT_NAME} | All Rights Reserved`;
 await sock.sendMessage(from, { text: menuText });
 return;
 }
 // 2. ALIVE
 if (command === "alive" || command === "bot") {
 await sock.sendMessage(from, {
 text: `*${BOT_NAME} IS ALIVE* ⚡\n\n👑 Owner: ${OWNER_NAME}\n🔥 Version: ${VERSION}\n⚙ Runtime: ${runtime((Date.now() - startTime) / 1000)}\n\nType ${PREFIX}menu for commands`,
 });
 return;
 }
 // 3. PING
 if (command === "ping" || command === "speed") {
 const start = Date.now();
 let msg = await sock.sendMessage(from, {
 text: "Testing speed...",
 });
 const end = Date.now();
 await sock.sendMessage(from, {
 text: `*⚡ SPEED TEST* ⚡\n\n📶 Response: ${end - start}ms\n🚀 Status: Ultra Fast\n\n${BOT_NAME}`,
 edit: msg.key,
 });
 return;
 }
 // 4. OWNER
 if (command === "owner" || command === "creator") {
 await sock.sendMessage(from, {
 text: `👑 *OWNER INFO* 👑\n\n🔥 Name: ${OWNER_NAME}\n⚡ Bot: ${BOT_NAME}\n📱 Number: wa.me/${OWNER_NUMBER}\n🛡 Status: Supreme Leader\n\n💬 Contact for bot issues only`,
 });
 return;
 }
 // 5. ANTILINK ON/OFF
 if (command === "antilink" && isGroup) {
 if (!isAdmin)
 return await sock.sendMessage(from, {
 text: "❌ Only admins can use this!",
 });
 if (args[0] === "on") {
 antilinkData[from] = true;
 fs.writeFileSync(antilinkDB, JSON.stringify(antilinkData));
 await sock.sendMessage(from, {
 text: "✅ *Anti-Link Activated*\n\nLinks will be auto-deleted + kicker enabled",
 });
 } else if (args[0] === "off") {
 delete antilinkData[from];
 fs.writeFileSync(antilinkDB, JSON.stringify(antilinkData));
 await sock.sendMessage(from, {
 text: "❌ *Anti-Link Deactivated*",
 });
 } else {
 await sock.sendMessage(from, {
 text: `Usage: ${PREFIX}antilink on/off`,
 });
 }
 return;
 }
 // 6. WELCOME ON/OFF
 if (command === "welcome" && isGroup) {
 if (!isAdmin)
 return await sock.sendMessage(from, { text: "❌ Only admins!" });
 let welcomeData = JSON.parse(fs.readFileSync(welcomeDB));
 if (args[0] === "on") {
 welcomeData[from] = true;
 fs.writeFileSync(welcomeDB, JSON.stringify(welcomeData));
 await sock.sendMessage(from, {
 text: "✅ *Welcome Messages Enabled*",
 });
 } else if (args[0] === "off") {
 delete welcomeData[from];
 fs.writeFileSync(welcomeDB, JSON.stringify(welcomeData));
 await sock.sendMessage(from, {
 text: "❌ *Welcome Messages Disabled*",
 });
 }
 return;
 }
 // 7. KICK
 if (command === "kick" && isGroup) {
 if (!isAdmin)
 return await sock.sendMessage(from, { text: "❌ Admins only!" });
 const mentioned =
 msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
 if (!mentioned)
 return await sock.sendMessage(from, {
 text: "❌ Mention someone!",
 });
 try {
 await sock.groupParticipantsUpdate(from, mentioned, "remove");
 await sock.sendMessage(from, {
 text: `✅ Kicked by ${OWNER_NAME}`,
 });
 } catch (e) {
 await sock.sendMessage(from, {
 text: "❌ Bot needs admin rights!",
 });
 }
 return;
 }
 // 8. TAGALL
 if (command === "tagall" && isGroup) {
 const groupMetadata = await sock.groupMetadata(from);
 const participants = groupMetadata.participants;
 let text = `📢 *${BOT_NAME} ANNOUNCEMENT* 📢\n\n${q || "Attention everyone!"}\n\n`;
 let mentions = [];
 for (let participant of participants) {
 text += `⚡ @${participant.id.split("@")[0]}\n`;
 mentions.push(participant.id);
 }
 text += `\n👑 ${OWNER_NAME}`;
 await sock.sendMessage(from, { text, mentions });
 return;
 }
 // 9. BAN/UNBAN
 if (command === "ban") {
 if (!isAdmin)
 return await sock.sendMessage(from, { text: "❌ Admins only!" });
 const mentioned =
 msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
 if (!mentioned)
 return await sock.sendMessage(from, {
 text: "❌ Mention user!",
 });
 if (!banned.includes(mentioned[0])) {
 banned.push(mentioned[0]);
 fs.writeFileSync(banDB, JSON.stringify(banned));
 await sock.sendMessage(from, {
 text: `✅ @${mentioned[0].split("@")[0]} banned from bot`,
 mentions: mentioned,
 });
 }
 return;
 }
 if (command === "unban") {
 if (!isAdmin)
 return await sock.sendMessage(from, { text: "❌ Admins only!" });
 const mentioned =
 msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
 if (!mentioned)
 return await sock.sendMessage(from, {
 text: "❌ Mention user!",
 });
 banned = banned.filter((u) => u !== mentioned[0]);
 fs.writeFileSync(banDB, JSON.stringify(banned));
 await sock.sendMessage(from, {
 text: `✅ @${mentioned[0].split("@")[0]} unbanned`,
 mentions: mentioned,
 });
 return;
 }
 // 10. STATUS SAVER
 if (command === "save") {
 const quoted =
 msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
 if (msg.key.remoteJid === "status@broadcast" || quoted) {
 try {
 const messageToSave = quoted || msg.message;
 const type = Object.keys(messageToSave)[0];
 const mediaType = type.replace("Message", "");
 const stream = await downloadContentFromMessage(
 messageToSave[type],
 mediaType,
 );
 let buffer = Buffer.from([]);
 for await (const chunk of stream)
 buffer = Buffer.concat([buffer, chunk]);
 const ext = mediaType === "image" ? "jpg" : "mp4";
 const fileName = `./MYS_Saved_Statuses/${Date.now()}.${ext}`;
 fs.writeFileSync(fileName, buffer);
 await sock.sendMessage(sender, {
 [mediaType]: buffer,
 caption: `✅ Status Saved by ${BOT_NAME}`,
 });
 } catch (e) {
 await sock.sendMessage(from, {
 text: "❌ Failed to save status",
 });
 }
 } else {
 await sock.sendMessage(from, {
 text: `❌ Reply to a status with ${PREFIX}save`,
 });
 }
 return;
 }
 // 11. PLAY SONG
 if (command === "play" || command === "song") {
 if (!q)
 return await sock.sendMessage(from, {
 text: `❌ Song name do!\nExample: ${PREFIX}song Atif Aslam\n\n> ${BOT_NAME}`,
 });
 try {
 await sock.sendMessage(from, { text: `🔍 *Searching:* ${q}\n\n> ${BOT_NAME}` });
 // JioSaavn API — no YouTube IP block issue
 const searchRes = await axios.get(
 `https://jiosavan-api2.vercel.app/api/search/songs`,
 { params: { query: q, limit: 5 }, timeout: 15000 }
 );
 const song = searchRes.data?.data?.results?.[0];
 if (!song) return await sock.sendMessage(from, {
 text: `❌ Song nahi mila: "${q}"\n💡 Tip: English ya Hindi mein likh ke try karo\n\n> ${BOT_NAME}`
 });
 const title = song.name || q;
 const artist = song.artists?.primary?.[0]?.name || song.artists?.all?.[0]?.name || "Unknown";
 const album = song.album?.name || "";
 const duration = song.duration ? `${Math.floor(song.duration/60)}:${String(song.duration%60).padStart(2,'0')}` : "N/A";
 const thumbUrl = song.image?.[2]?.url || song.image?.[1]?.url || song.image?.[0]?.url;
 // Best quality download URL (320kbps prefer)
 const dlUrls = song.downloadUrl || [];
 const bestDl = dlUrls.find(u => u.quality === "320kbps")
 || dlUrls.find(u => u.quality === "160kbps")
 || dlUrls[dlUrls.length - 1];
 if (!bestDl?.url) throw new Error("Download URL nahi mili");
 // Thumbnail + info bhejo
 const infoText = `🎵 *${title}*\n\n🎤 *Artist:* ${artist}\n💿 *Album:* ${album || "Single"}\n⏱️ *Duration:* ${duration}\n🎧 *Quality:* ${bestDl.quality}\n📁 *Format:* AAC\n📤 *Status:* ✅ Sending...\n\n_Powered by ${BOT_NAME}_`;
 if (thumbUrl) {
 try {
 const thumbRes = await axios.get(thumbUrl, { responseType: "arraybuffer", timeout: 10000 });
 await sock.sendMessage(from, { image: Buffer.from(thumbRes.data), caption: infoText });
 } catch (_) {
 await sock.sendMessage(from, { text: infoText });
 }
 } else {
 await sock.sendMessage(from, { text: infoText });
 }
 // Audio download & send
 const audioRes = await axios.get(bestDl.url, { responseType: "arraybuffer", timeout: 60000 });
 const audioBuf = Buffer.from(audioRes.data);
 await sock.sendMessage(from, {
 audio: audioBuf,
 mimetype: "audio/mp4",
 fileName: `${title}.m4a`,
 ptt: false,
 });
 } catch (e) {
 await sock.sendMessage(from, { text: `❌ Song Error: ${e.message}\n\n> ${BOT_NAME}` });
 }
 return;
 }
 // 12. STICKER
 if (command === "sticker" || command === "s") {
 const quoted =
 msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
 const messageToConvert = quoted || msg.message;
 if (
 messageToConvert.imageMessage ||
 messageToConvert.videoMessage
 ) {
 try {
 const type = messageToConvert.imageMessage
 ? "image"
 : "video";
 const stream = await downloadContentFromMessage(
 messageToConvert[type + "Message"],
 type,
 );
 let buffer = Buffer.from([]);
 for await (const chunk of stream)
 buffer = Buffer.concat([buffer, chunk]);
 await sock.sendMessage(from, { sticker: buffer });
 } catch (e) {
 await sock.sendMessage(from, {
 text: "❌ Failed to create sticker",
 });
 }
 } else {
 await sock.sendMessage(from, {
 text: `❌ Reply to image/video with ${PREFIX}sticker`,
 });
 }
 return;
 }
 // AUTOREACT TOGGLE
 if (command === "autoreact") {
 if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Admins only!" });
 if (args[0] === "on") {
 AUTO_REACT = true;
 await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
 await sock.sendMessage(from, { text: `✅ *Auto React ON* kar diya!\n\n🔥 Ab har message pe emoji react hoga.\n\n> ${BOT_NAME}` });
 } else if (args[0] === "off") {
 AUTO_REACT = false;
 await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
 await sock.sendMessage(from, { text: `❌ *Auto React OFF* kar diya!\n\n> ${BOT_NAME}` });
 } else {
 await sock.sendMessage(from, {
 text: `⚙ *AUTO REACT STATUS*\n\nStatus: ${AUTO_REACT ? "✅ ON" : "❌ OFF"}\n\nUsage:\n${PREFIX}autoreact on\n${PREFIX}autoreact off\n\n> ${BOT_NAME}`,
 });
 }
 return;
 }
 // SETTINGS / SETREACT
 if (command === "settings" || command === "setreact") {
 await sock.sendMessage(from, {
 text: `⚙ *${BOT_NAME} SETTINGS* ⚙\n\n╔══════════════════╗\n║ AUTO REACT: ${AUTO_REACT ? "✅ ON " : "❌ OFF"}\n║ PREFIX: ${PREFIX}\n║ VERSION: ${VERSION}\n╚══════════════════╝\n\n📌 Commands:\n• ${PREFIX}autoreact on — React ON karo\n• ${PREFIX}autoreact off — React OFF karo\n• ${PREFIX}antilink on/off — Link protection\n• ${PREFIX}welcome on/off — Welcome msg\n\n> ${BOT_NAME}`,
 });
 return;
 }
 // ==================== HOT / ANIME IMAGE COMMANDS ====================
 const imageMap = {
 // HOT → SFW romantic categories from waifu.pics
 china: "waifu", indo: "waifu", korea: "neko", thailand: "neko",
 vietnam: "waifu", loli: "neko", pap: "pat", japan: "waifu",
 romantic: "kiss", couple: "cuddle", romance: "kiss",
 intimate: "cuddle", firstnight: "kiss", suhagraat: "hug",
 bedroom: "cuddle", cuddle: "cuddle", passionate: "kiss",
 lovers: "kiss", romancing: "hug", together: "hug",
 // ANIME
 waifu: "waifu", neko: "neko", kitsune: "awoo", husbando: "waifu",
 animegirl: "waifu", animeboy: "waifu", catgirl: "neko",
 foxgirl: "awoo", kawaii: "megumin", otaku: "shinobu",
 };
 const allImageCmds = Object.keys(imageMap);
 if (allImageCmds.includes(command)) {
 try {
 const category = imageMap[command];
 const res = await axios.get(`https://api.waifu.pics/sfw/${category}`);
 const imageUrl = res.data.url;
 const labels = {
 china:"🇨🇳 China",indo:"🇮🇩 Indo",korea:"🇰🇷 Korea",thailand:"🇹🇭 Thailand",
 vietnam:"🇻🇳 Vietnam",loli:"🌸 Loli",pap:"📸 Pap",japan:"🇯🇵 Japan",
 romantic:"💕 Romantic",couple:"👫 Couple",romance:"❤️ Romance",
 intimate:"🌹 Intimate",firstnight:"🌙 First Night",suhagraat:"💍 Suhagraat",
 bedroom:"🛏️ Bedroom",cuddle:"🤗 Cuddle",passionate:"🔥 Passionate",
 lovers:"💑 Lovers",romancing:"💞 Romancing",together:"👐 Together",
 waifu:"🌸 Waifu",neko:"🐱 Neko",kitsune:"🦊 Kitsune",husbando:"💪 Husbando",
 animegirl:"👧 Anime Girl",animeboy:"👦 Anime Boy",catgirl:"🐱 Cat Girl",
 foxgirl:"🦊 Fox Girl",kawaii:"✨ Kawaii",otaku:"🎌 Otaku",
 };
 await sock.sendMessage(from, {
 image: { url: imageUrl },
 caption: `${labels[command] || command}\n\n> ${BOT_NAME}`,
 });
 } catch (e) {
 await sock.sendMessage(from, { text: `❌ Image fetch nahi ho saka. Dobara try karo!\n> ${BOT_NAME}` });
 }
 return;
 }
 // ==================== AI COMMANDS ====================
 const aiCmds = ["gpt35","gpt4o","claude","claudeopus","gemini","geminipro","grok","grokbeta","deepseek","deepseekcoder","llama","llama2","llama3","perplexity","mistral","codellama","bard","copilot","chatgpt"];
 if (aiCmds.includes(command)) {
 if (!q) return await sock.sendMessage(from, { text: `❌ Sawal likho!\nExample: ${PREFIX}${command} Pakistan ki capital kya hai?` });
 const GEMINI_KEY = process.env.GEMINI_API_KEY;
 if (!GEMINI_KEY) {
 return await sock.sendMessage(from, {
 text: `🤖 *${command.toUpperCase()} AI*\n\n❌ API Key set nahi hai!\n\n📌 Setup:\n1. Replit → Secrets\n2. Key: GEMINI_API_KEY\n3. Value: apni Gemini key\n4. Bot restart karo\n\n🔗 Free key: aistudio.google.com\n\n> ${BOT_NAME}`,
 });
 }
 try {
 const { GoogleGenAI } = require("@google/genai");
 const genai = new GoogleGenAI({ apiKey: GEMINI_KEY });
 await sock.sendMessage(from, { text: `🤖 *${command.toUpperCase()}* soch raha hai...` });
 const result = await genai.models.generateContent({
 model: "gemini-1.5-flash",
 contents: q,
 });
 const reply = result.text;
 await sock.sendMessage(from, {
 text: `🤖 *${command.toUpperCase()} AI*\n\n❓ ${q}\n\n💬 ${reply}\n\n> ${BOT_NAME}`,
 });
 } catch (e) {
 await sock.sendMessage(from, { text: `❌ AI Error: ${e.message}\n\n> ${BOT_NAME}` });
 }
 return;
 }
 // ==================== FUN COMMANDS ====================
 if (command === "compatibility") {
 const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
 const percent = Math.floor(Math.random() * 101);
 const bar = "█".repeat(Math.floor(percent/10)) + "░".repeat(10-Math.floor(percent/10));
 const name2 = mentioned ? `@${mentioned[0].split("@")[0]}` : (q || "Someone");
 await sock.sendMessage(from, {
 text: `💘 *COMPATIBILITY TEST* 💘\n\n@${sender.split("@")[0]} 💞 ${name2}\n\n[${bar}] ${percent}%\n\n${percent>=80?"🔥 Zabardast match!":percent>=60?"💛 Accha match!":percent>=40?"🤔 Thoda try karo!":"💔 Mushkil hai bhai!"}\n\n> ${BOT_NAME}`,
 mentions: mentioned ? [sender, ...mentioned] : [sender],
 });
 return;
 }
 if (command === "aura") {
 const auras = ["🔴 Red Aura — Power aur passion!","🟠 Orange Aura — Energy aur creativity!","🟡 Yellow Aura — Khushi aur positivity!","🟢 Green Aura — Balance aur harmony!","🔵 Blue Aura — Peace aur wisdom!","🟣 Purple Aura — Spirituality aur mystery!","⚪ White Aura — Purity aur enlightenment!","⚫ Dark Aura — Depth aur strength!","🌈 Rainbow Aura — Rare! Tum special ho!"];
 const aura = auras[Math.floor(Math.random() * auras.length)];
 await sock.sendMessage(from, { text: `✨ *AURA CHECK* ✨\n\n@${sender.split("@")[0]} ka aura:\n\n${aura}\n\n> ${BOT_NAME}`, mentions: [sender] });
 return;
 }
 if (command === "compliment") {
 const compliments = ["Tum bahut acche insaan ho! 😊","Tumhari smile duniya roshan karti hai! ☀️","Tum jahan jao khushi faila dete ho! 🌸","Tumhari soch bahut unique hai! 💡","Tum bahut talented ho! ⭐","Duniya tumse behtar hai! 🌍","Tumhari personality amazing hai! 🔥","Tum jo bhi karo, best karte ho! 💯"];
 const c = compliments[Math.floor(Math.random() * compliments.length)];
 await sock.sendMessage(from, { text: `💐 *COMPLIMENT* 💐\n\n@${sender.split("@")[0]}, ${c}\n\n> ${BOT_NAME}`, mentions: [sender] });
 return;
 }
 if (command === "emoji") {
 const sets = ["❤️🔥💯😍🥰","😂🤣😜😝🤪","🌈✨⭐🌟💫","🎉🎊🥳🎈🎁","🦁🐯🦊🐺🦝","🍕🍔🌮🍜🍣"];
 const emojiSet = sets[Math.floor(Math.random() * sets.length)];
 await sock.sendMessage(from, { text: `😜 *RANDOM EMOJI* 😜\n\n${emojiSet}\n\n> ${BOT_NAME}` });
 return;
 }
 if (command === "marriage") {
 const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
 const percent = Math.floor(Math.random() * 101);
 const name2 = mentioned ? `@${mentioned[0].split("@")[0]}` : (q || "Someone");
 await sock.sendMessage(from, {
 text: `💍 *MARRIAGE METER* 💍\n\n@${sender.split("@")[0]} 💒 ${name2}\n\nShadi ki probability: *${percent}%*\n\n${percent>=80?"💍 Shaadi pakki! Mubarak ho!":percent>=50?"💛 Soch sako!":"💔 Filhal nahi!"}\n\n> ${BOT_NAME}`,
 mentions: mentioned ? [sender, ...mentioned] : [sender],
 });
 return;
 }
 if (command === "bacha") {
 const msgs = ["🍼 Bacha hoga! Abba ban ne ki tayari karo!","👶 Chhota sa pyara bacha aayega!","🍼 Allah blessed karega bacha se!","👶 Ghar mein raunaq aayegi!"];
 await sock.sendMessage(from, { text: `👶 *BACHA PREDICTOR* 👶\n\n${msgs[Math.floor(Math.random()*msgs.length)]}\n\n> ${BOT_NAME}` });
 return;
 }
 if (command === "bachi") {
 const msgs = ["👧 Bachi hogi! Princess aa rahi hai!","💕 Chhoti si gudiya jaisi bachi!","👧 Allah bachi de — bahut pyari hogi!","💖 Ghar ki pari aayegi!"];
 await sock.sendMessage(from, { text: `👧 *BACHI PREDICTOR* 👧\n\n${msgs[Math.floor(Math.random()*msgs.length)]}\n\n> ${BOT_NAME}` });
 return;
 }
 if (command === "breakup") {
 const bmsgs = ["💔 Uff! Dil toot gaya! Ice cream khao!","😭 Ro lo, phir uthho aur aage badho!","💔 Ek darwaza band, hazaar khulenge!","😤 Unka loss hai, tumhara fayda!","🚀 Single life best life! Enjoy karo!"];
 await sock.sendMessage(from, { text: `💔 *BREAKUP ADVICE* 💔\n\n${bmsgs[Math.floor(Math.random()*bmsgs.length)]}\n\n> ${BOT_NAME}` });
 return;
 }
 if (command === "husband") {
 const hmsgs = ["👨 Tumhara husband bahut caring hoga!","💪 Strong aur loving husband milega!","😍 Handsome aur responsible!","👨‍👩‍👧 Best family man banega!"];
 await sock.sendMessage(from, { text: `👨 *HUSBAND PREDICTOR* 👨\n\n${hmsgs[Math.floor(Math.random()*hmsgs.length)]}\n\n> ${BOT_NAME}` });
 return;
 }
 if (command === "wife") {
 const wmsgs = ["👩 Tumhari wife bahut pyari hogi!","💕 Caring aur loving wife milegi!","😍 Sundar aur samajhdar!","👩‍👩‍👧 Best life partner banegi!"];
 await sock.sendMessage(from, { text: `👩 *WIFE PREDICTOR* 👩\n\n${wmsgs[Math.floor(Math.random()*wmsgs.length)]}\n\n> ${BOT_NAME}` });
 return;
 }
 if (command === "propose") {
 const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
 const name2 = mentioned ? `@${mentioned[0].split("@")[0]}` : (q || "Someone");
 await sock.sendMessage(from, {
 text: `💍 *PROPOSAL* 💍\n\n@${sender.split("@")[0]} ne ${name2} ko propose kiya!\n\n"Kya tum meri zindagi mein shamil hogi/hoge? 🌹"\n\n${Math.random()>0.5?"✅ Accept! Mubarak ho! 🎉":"❌ Reject! Dil mat todo bhai! 💔"}\n\n> ${BOT_NAME}`,
 mentions: mentioned ? [sender, ...mentioned] : [sender],
 });
 return;
 }
 if (command === "crush") {
 const cmsgs = ["😍 Tumhara crush tumhe secretly like karta/karti hai!","💕 Ek din zaroor baat karo!","🌹 Propose kar do, kya pata haan bol de!","😊 Tumhara crush bhi tumhare baare mein sochta/sochti hai!","💫 Waqt aayega, sabar karo!"];
 await sock.sendMessage(from, { text: `😍 *CRUSH READER* 😍\n\n@${sender.split("@")[0]}, ${cmsgs[Math.floor(Math.random()*cmsgs.length)]}\n\n> ${BOT_NAME}`, mentions: [sender] });
 return;
 }
 if (command === "hack") {
 const target = q || sender.split("@")[0];
 await sock.sendMessage(from, { text: `💻 *HACKING: ${target}* 💻\n\n[████░░░░░░] 40% — IP locate ho raha hai...\n[███████░░░] 70% — Firewall bypass...\n[██████████] 100% — ACCESS GRANTED! 🔓\n\n✅ Hack complete!\n📍 Location: Pakistan 🇵🇰\n📱 Device: Android\n⚠️ Just kidding, yeh fake hai 😂\n\n> ${BOT_NAME}` });
 return;
 }
 if (command === "ringtone") {
 const ringtones = ["🎵 Teri Mitti — Kesari","🎵 Tere Bin — Waqar Ex","🎵 O Mere Dil Ke Chain — Kishore","🎵 Raatan Lambiyan — Jubin","🎵 Kesariya — Arijit Singh","🎵 Pasoori — Ali Sethi","🎵 Akhiyaan Nu — AP Dhillon"];
 const rt = ringtones[Math.floor(Math.random() * ringtones.length)];
 await sock.sendMessage(from, { text: `🎵 *RINGTONE SUGGESTION* 🎵\n\n${rt}\n\nYouTube pe search karo: https://youtube.com/results?search_query=${encodeURIComponent(rt.replace("🎵 ",""))}\n\n> ${BOT_NAME}` });
 return;
 }
 // ship command
 if (command === "ship") {
 const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
 if (!mentioned || mentioned.length < 2)
 return await sock.sendMessage(from, { text: `❌ Do logon ko tag karo!\nExample: ${PREFIX}ship @user1 @user2` });
 const percent = Math.floor(Math.random() * 101);
 const bar = "█".repeat(Math.floor(percent / 10)) + "░".repeat(10 - Math.floor(percent / 10));
 await sock.sendMessage(from, {
 text: `💕 *SHIP METER* 💕\n\n@${mentioned[0].split("@")[0]} ❤️ @${mentioned[1].split("@")[0]}\n\n[${bar}] ${percent}%\n\n${percent >= 70 ? "🔥 Perfect Match!" : percent >= 40 ? "💛 Thoda aur try karo!" : "💔 Match nahi!"}\n\n> ${BOT_NAME}`,
 mentions: mentioned,
 });
 return;
 }
 // lovetest command
 if (command === "lovetest") {
 const percent = Math.floor(Math.random() * 101);
 const bar = "█".repeat(Math.floor(percent / 10)) + "░".repeat(10 - Math.floor(percent / 10));
 await sock.sendMessage(from, {
 text: `❤️ *LOVE TEST* ❤️\n\n[${bar}] ${percent}%\n\n${percent >= 70 ? "🔥 Pyaar sachcha hai!" : percent >= 40 ? "💛 Thodi umeed hai!" : "💔 Seedha dosto zone!"}\n\n> ${BOT_NAME}`,
 });
 return;
 }
 // roast command (update existing one in fun)
 if (command === "roast") {
 const roasts = [
 "Tum itne boring ho ke wifi bhi disconnect ho jata hai tumhare saath!",
 "Tumhari smile dekh ke aaine ne istifa de diya!",
 "Tum woh insaan ho jis se Google bhi galat jawab deta hai!",
 "Tumhara IQ aur shoe size same hain!",
 "Tum itne slow ho ke turtle bhi tum se race jeet jata hai!",
 ];
 const roast = roasts[Math.floor(Math.random() * roasts.length)];
 await sock.sendMessage(from, {
 text: `🔥 *ROAST TIME* 🔥\n\n${roast}\n\n> ${BOT_NAME}`,
 });
 return;
 }
 // 8ball command
 if (command === "8ball") {
 if (!q) return await sock.sendMessage(from, { text: `❌ Sawal poocho!\nExample: ${PREFIX}8ball Kya main pass hounga?` });
 const answers = ["✅ Bilkul!", "❌ Nahi lagta", "🤔 Shayad", "💯 Haan zaroor!", "😅 Allah jane", "🎱 Dubara poocho", "⚡ Definitely!", "💔 Nahi re baba"];
 const answer = answers[Math.floor(Math.random() * answers.length)];
 await sock.sendMessage(from, {
 text: `🎱 *8 BALL* 🎱\n\n❓ ${q}\n\n${answer}\n\n> ${BOT_NAME}`,
 });
 return;
 }
 // quote command
 if (command === "quote") {
 const quotes = [
 "Zindagi mein kuch bhi mushkil nahi, bas waqt chahiye. 🌟",
 "Kamyabi wahan milti hai jahan mehnat hoti hai. 💪",
 "Sapne wo nahi jo neend mein aate hain, sapne wo hain jo neend uda dete hain. 🚀",
 "Haar maan lena asaan hai, lekin lad'na sikhao. ⚔️",
 "Kal ki fikr mat karo, aaj ko jiyo. ☀️",
 ];
 const quote = quotes[Math.floor(Math.random() * quotes.length)];
 await sock.sendMessage(from, {
 text: `💬 *QUOTE OF THE DAY* 💬\n\n"${quote}"\n\n> ${BOT_NAME}`,
 });
 return;
 }
 });
}
app.listen(PORT, "0.0.0.0", () => {
 console.log(`🌐 Server: http://localhost:${PORT}`);
 startBot();
});
