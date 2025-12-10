import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import axios from 'axios';
import pino from 'pino';
import express from 'express';
import fs from 'fs';

const PORT = process.env.PORT || 3000;
const WEBHOOK_MENSAGENS = process.env.WEBHOOK_MENSAGENS || 'http://n8n:5678/webhook/whatsapp'; 
const SEU_NUMERO = process.env.NUMERO_ZAP || '551391095649'; 
const AUTH_PATH = '/app/sessions';

const app = express();
app.use(express.json());
let sock;
let isAskingCode = false;

// --- API BLINDADA (ANTI-CRASH) ---
app.post('/send-message', async (req, res) => {
    const { number, text } = req.body;
    if (!sock) return res.status(500).json({ error: 'WhatsApp desconectado' });

    if (!number || !text) {
        console.error('⚠️ Tentativa rejeitada: Texto vazio!');
        return res.status(400).json({ error: 'Faltou texto' });
    }

    try {
        const id = number.toString().includes('@') ? number : `${number}@s.whatsapp.net`;
        await sock.sendMessage(id, { text: text.toString() });
        console.log(`✅ Enviado para ${id}`);
        res.json({ status: 'sucesso' });
    } catch (error) {
        console.error('❌ Erro envio:', error);
        res.status(500).json({ error: 'Erro envio' });
    }
});

app.get('/', (req, res) => res.send('🚀 Gateway EASY ROBO V2 Ativo'));

app.listen(PORT, () => {
    console.log(`🤖 Servidor ON na porta ${PORT}`);
    startWhatsApp();
});

async function startWhatsApp() {
    if (!fs.existsSync(AUTH_PATH)) fs.mkdirSync(AUTH_PATH, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        syncFullHistory: false
    });

    if (!sock.authState.creds.registered && !isAskingCode) {
        isAskingCode = true;
        setTimeout(async () => {
            try {
                if (!sock.authState.creds.registered) {
                    const code = await sock.requestPairingCode(SEU_NUMERO);
                    const codeFormatado = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log(`🔑 CÓDIGO: ${codeFormatado}`);
                }
            } catch (e) { isAskingCode = false; }
        }, 40000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) {
                setTimeout(() => { isAskingCode = false; startWhatsApp(); }, 5000);
            } else { console.log('⛔ Logout.'); }
        } else if (connection === 'open') {
            console.log('✅ CONECTADO!');
            isAskingCode = true; 
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
            if (!msg.message || msg.key.fromMe) continue;
            const texto = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (texto) {
                try {
                    await axios.post(WEBHOOK_MENSAGENS, {
                        remoteJid: msg.key.remoteJid,
                        pushName: msg.pushName,
                        message: texto
                    });
                } catch (err) {}
            }
        }
    });
}
