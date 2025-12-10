require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidGroup,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');

// Initialize Express app
const app = express();
app.use(express.json());

// Logger configuration
const logger = pino({ level: 'debug' });

// Configuration
const config = {
  n8nWebhook: process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/whatsapp',
  port: process.env.PORT || 3000,
  sessionDir: path.join(__dirname, '../sessions'),
  mediaDir: path.join(__dirname, '../media'),
  maxRetries: 5,
  retryDelay: 3000,
  pairingMode: process.env.PAIRING_MODE || 'qr', // 'qr' or 'code'
  phoneNumber: process.env.PHONE_NUMBER || null,
};

// Ensure directories exist
[config.sessionDir, config.mediaDir].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  } catch (error) {
    logger.error(`Failed to create directory ${dir}:`, error);
    throw error;
  }
});

// Global variables
let sock = null;
let isConnecting = false;
const connectionRetries = {};

/**
 * Initialize WhatsApp connection
 */
async function connectToWhatsApp() {
  try {
    if (isConnecting) {
      logger.info('Connection already in progress');
      return sock;
    }

    isConnecting = true;
    logger.info('Initializing WhatsApp connection...');
    logger.info(`Pairing mode: ${config.pairingMode}`);

    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    // Determine if we should print QR in terminal
    const shouldPrintQR = config.pairingMode === 'qr';

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      auth: state,
      printQRInTerminal: shouldPrintQR,
      generateHighQualityLinkPreview: true,
      shouldIgnoreJid: (jid) => isJidBroadcast(jid),
      syncFullHistory: false,
      markOnlineOnConnect: true,
      retryRequestDelayMs: 1000,
    });

    // Save credentials
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, isOnline } = update;

      if (qr) {
        if (config.pairingMode === 'qr') {
          logger.info('QR Code generated - scan to connect');
          await sendWebhook('qr_generated', { qr });
        } else {
          logger.info('QR Code available but pairing mode is set to code');
        }
      }

      if (connection === 'connecting') {
        logger.info('WhatsApp connecting...');
        isConnecting = true;
      }

      if (connection === 'open') {
        logger.info('WhatsApp connected successfully');
        isConnecting = false;
        connectionRetries[sock?.user?.id] = 0;
        await sendWebhook('connection_open', {
          jid: sock.user.id,
          phoneNumber: sock.user.id.split(':')[0],
          name: sock.user.name || 'WhatsApp User',
        });
      }

      if (connection === 'close') {
        isConnecting = false;
        const reason = lastDisconnect?.error ? new Boom(lastDisconnect.error).output.statusCode : undefined;

        logger.info(`Connection closed with reason: ${reason}`);

        if (reason === DisconnectReason.badSession) {
          logger.error('Bad session detected - clearing session');
          sock = null;
          try {
            fs.rmSync(config.sessionDir, { recursive: true, force: true });
            logger.info('Session directory cleared');
          } catch (err) {
            logger.error('Failed to clear session directory:', err);
          }
        } else if (reason === DisconnectReason.connectionClosed) {
          logger.info('Connection closed - reconnecting...');
          await retryConnection();
        } else if (reason === DisconnectReason.connectionLost) {
          logger.info('Connection lost - reconnecting...');
          await retryConnection();
        } else if (reason === DisconnectReason.connectionReplaced) {
          logger.info('Connection replaced');
          sock = null;
        } else if (reason === DisconnectReason.loggedOut) {
          logger.error('Logged out - clearing session');
          sock = null;
          try {
            fs.rmSync(config.sessionDir, { recursive: true, force: true });
            logger.info('Session directory cleared after logout');
          } catch (err) {
            logger.error('Failed to clear session directory:', err);
          }
        } else if (reason === DisconnectReason.restartRequired) {
          logger.info('Restart required');
          await retryConnection();
        } else if (reason === DisconnectReason.timedOut) {
          logger.info('Connection timed out - reconnecting...');
          await retryConnection();
        } else {
          logger.warn(`Unknown disconnect reason: ${reason}`);
        }

        await sendWebhook('connection_close', { reason });
      }

      if (isOnline !== undefined) {
        logger.info(`Online status: ${isOnline}`);
      }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];

      if (!message.key.fromMe && message.message) {
        await handleIncomingMessage(message);
      }
    });

    // Handle message status updates
    sock.ev.on('message.update', async (m) => {
      for (const { key, update } of m) {
        if (update.status) {
          await sendWebhook('message_status', {
            messageId: key.id,
            status: update.status,
            from: key.remoteJid,
          });
        }
      }
    });

    // Handle presence updates
    sock.ev.on('presence.update', async (presences) => {
      for (const [jid, presence] of Object.entries(presences)) {
        logger.debug(`${jid} is ${presence}`);
      }
    });

    // Handle contacts update
    sock.ev.on('contacts.update', async (contacts) => {
      logger.debug(`Updated ${contacts.length} contacts`);
    });

    return sock;
  } catch (error) {
    logger.error('Error connecting to WhatsApp:', error);
    isConnecting = false;
    await retryConnection();
    throw error;
  }
}

/**
 * Retry connection with exponential backoff
 */
async function retryConnection() {
  const userId = sock?.user?.id || 'default';
  const retries = connectionRetries[userId] || 0;

  if (retries < config.maxRetries) {
    const delay = config.retryDelay * Math.pow(2, retries);
    logger.info(`Retrying connection in ${delay}ms (attempt ${retries + 1}/${config.maxRetries})`);
    connectionRetries[userId] = retries + 1;

    setTimeout(() => {
      sock = null;
      connectToWhatsApp().catch((err) => {
        logger.error('Reconnection failed:', err);
      });
    }, delay);
  } else {
    logger.error('Max retries exceeded');
    await sendWebhook('connection_failed', {
      reason: 'Max retries exceeded',
      attempts: retries,
    });
  }
}

/**
 * Handle incoming messages
 */
async function handleIncomingMessage(message) {
  try {
    const { key, message: msg, timestamp } = message;
    const from = key.remoteJid;
    const pushName = message.pushName;

    let messageData = {
      id: key.id,
      from,
      pushName,
      timestamp: new Date(timestamp * 1000),
      isGroup: isJidGroup(from),
      type: 'unknown',
      content: null,
    };

    // Text message
    if (msg?.conversation) {
      messageData.type = 'text';
      messageData.content = msg.conversation;
    } else if (msg?.extendedTextMessage) {
      messageData.type = 'text';
      messageData.content = msg.extendedTextMessage.text;
      messageData.mentionedJids = msg.extendedTextMessage.contextInfo?.mentionedJid || [];
    }

    // Image message
    else if (msg?.imageMessage) {
      messageData.type = 'image';
      messageData.content = await downloadMedia(msg.imageMessage, 'image');
      messageData.caption = msg.imageMessage.caption || null;
    }

    // Audio message
    else if (msg?.audioMessage) {
      messageData.type = 'audio';
      messageData.content = await downloadMedia(msg.audioMessage, 'audio');
      messageData.mimeType = msg.audioMessage.mimetype;
      messageData.duration = msg.audioMessage.seconds || null;
    }

    // Video message
    else if (msg?.videoMessage) {
      messageData.type = 'video';
      messageData.content = await downloadMedia(msg.videoMessage, 'video');
      messageData.caption = msg.videoMessage.caption || null;
      messageData.mimeType = msg.videoMessage.mimetype;
    }

    // Document message
    else if (msg?.documentMessage) {
      messageData.type = 'document';
      messageData.content = await downloadMedia(msg.documentMessage, 'document');
      messageData.fileName = msg.documentMessage.fileName;
      messageData.mimeType = msg.documentMessage.mimetype;
    }

    // Contact message
    else if (msg?.contactMessage) {
      messageData.type = 'contact';
      messageData.content = {
        name: msg.contactMessage.displayName,
        phone: msg.contactMessage.vcard,
      };
    }

    // Location message
    else if (msg?.locationMessage) {
      messageData.type = 'location';
      messageData.content = {
        latitude: msg.locationMessage.degreesLatitude,
        longitude: msg.locationMessage.degreesLongitude,
        address: msg.locationMessage.address,
      };
    }

    // Send to n8n webhook
    await sendWebhook('message_received', messageData);
    logger.info(`Message received from ${from}: ${messageData.type}`);
  } catch (error) {
    logger.error('Error handling incoming message:', error);
    await sendWebhook('message_error', { error: error.message });
  }
}

/**
 * Download media from WhatsApp message
 */
async function downloadMedia(mediaMessage, mediaType) {
  try {
    const buffer = await sock.downloadMediaMessage(mediaMessage);
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${getFileExtension(mediaMessage.mimetype)}`;
    const filePath = path.join(config.mediaDir, fileName);

    fs.writeFileSync(filePath, buffer);
    logger.info(`Media downloaded: ${filePath}`);

    return {
      fileName,
      path: filePath,
      url: `/media/${fileName}`,
      mimeType: mediaMessage.mimetype,
      fileSize: buffer.length,
    };
  } catch (error) {
    logger.error('Error downloading media:', error);
    return {
      error: 'Failed to download media',
      message: error.message,
    };
  }
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimetype) {
  const ext = mime.extension(mimetype);
  return ext || 'bin';
}

/**
 * Send webhook to n8n
 */
async function sendWebhook(event, data) {
  try {
    await axios.post(config.n8nWebhook, {
      event,
      data,
      timestamp: new Date().toISOString(),
      source: 'whatsapp-gateway',
    });
    logger.debug(`Webhook sent: ${event}`);
  } catch (error) {
    logger.error(`Failed to send webhook (${event}):`, error.message);
  }
}

/**
 * Send text message
 */
async function sendMessage(to, message, options = {}) {
  try {
    if (!sock?.user?.id) {
      throw new Error('WhatsApp not connected');
    }

    const result = await sock.sendMessage(to, {
      text: message,
      ...options,
    });

    logger.info(`Message sent to ${to}`);
    return result;
  } catch (error) {
    logger.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Send media message
 */
async function sendMedia(to, mediaPath, mediaType, options = {}) {
  try {
    if (!sock?.user?.id) {
      throw new Error('WhatsApp not connected');
    }

    if (!fs.existsSync(mediaPath)) {
      throw new Error('Media file not found');
    }

    const buffer = fs.readFileSync(mediaPath);
    const mimeType = options.mimeType || mime.lookup(mediaPath);

    let messagePayload = {
      ...options,
      mimetype: mimeType,
    };

    if (mediaType === 'image') {
      messagePayload = { image: buffer, ...messagePayload };
    } else if (mediaType === 'audio') {
      messagePayload = { audio: buffer, ptt: options.ptt !== false, ...messagePayload };
    } else if (mediaType === 'video') {
      messagePayload = { video: buffer, ...messagePayload };
    } else if (mediaType === 'document') {
      messagePayload = {
        document: buffer,
        fileName: options.fileName || path.basename(mediaPath),
        ...messagePayload,
      };
    } else {
      throw new Error('Unsupported media type');
    }

    const result = await sock.sendMessage(to, messagePayload);
    logger.info(`Media sent to ${to} (${mediaType})`);
    return result;
  } catch (error) {
    logger.error('Error sending media:', error);
    throw error;
  }
}

/**
 * Get connection status
 */
function getConnectionStatus() {
  return {
    connected: !!sock?.user?.id,
    jid: sock?.user?.id || null,
    name: sock?.user?.name || null,
    phoneNumber: sock?.user?.id?.split(':')[0] || null,
    status: isConnecting ? 'connecting' : sock?.user?.id ? 'connected' : 'disconnected',
  };
}

// ============ API ENDPOINTS ============

/**
 * GET /status - Get gateway status
 */
app.get('/status', (req, res) => {
  res.json({
    status: getConnectionStatus(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/**
 * GET /connect - Initialize WhatsApp connection
 */
app.get('/connect', async (req, res) => {
  try {
    if (sock?.user?.id) {
      return res.json({
        success: true,
        message: 'Already connected',
        status: getConnectionStatus(),
      });
    }

    await connectToWhatsApp();
    res.json({
      success: true,
      message: 'Connection initiated',
      status: getConnectionStatus(),
    });
  } catch (error) {
    logger.error('Connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /pairing-code - Request pairing code for phone number
 * Body: { "phoneNumber": "5511999999999" }
 * Response: { "success": true, "code": "ABCD1234" }
 */
app.post('/pairing-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: phoneNumber',
      });
    }

    // Validate phone number format (should be digits only)
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanPhoneNumber || cleanPhoneNumber.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Use format: 5511999999999 (country code + number)',
      });
    }

    // Check if already connected
    if (sock?.user?.id) {
      return res.status(400).json({
        success: false,
        error: 'Already connected. Disconnect first to pair a new device.',
      });
    }

    // Initialize connection if not already started
    if (!sock) {
      logger.info('Initializing connection for pairing code...');
      await connectToWhatsApp();
      
      // Wait a bit for the socket to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!sock) {
      throw new Error('Failed to initialize WhatsApp connection');
    }

    logger.info(`Requesting pairing code for: ${cleanPhoneNumber}`);
    
    // Request pairing code
    const code = await sock.requestPairingCode(cleanPhoneNumber);
    
    logger.info(`Pairing code generated: ${code}`);
    
    await sendWebhook('pairing_code_generated', {
      phoneNumber: cleanPhoneNumber,
      code,
    });

    res.json({
      success: true,
      code,
      phoneNumber: cleanPhoneNumber,
      message: 'Enter this code in WhatsApp: Settings > Linked Devices > Link a Device > Link with Phone Number',
    });
  } catch (error) {
    logger.error('Error generating pairing code:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate pairing code',
    });
  }
});

/**
 * GET /disconnect - Disconnect WhatsApp
 */
app.get('/disconnect', async (req, res) => {
  try {
    if (sock) {
      await sock.end();
      sock = null;
    }

    res.json({
      success: true,
      message: 'Disconnected',
      status: getConnectionStatus(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /send-message - Send text message
 */
app.post('/send-message', async (req, res) => {
  try {
    const { to, message, options } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, message',
      });
    }

    const result = await sendMessage(to, message, options);
    res.json({
      success: true,
      messageId: result.key.id,
      to,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /send-image - Send image message
 */
app.post('/send-image', async (req, res) => {
  try {
    const { to, imageUrl, caption } = req.body;

    if (!to || !imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, imageUrl',
      });
    }

    // Download image from URL
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const fileName = `image_${Date.now()}.jpg`;
    const filePath = path.join(config.mediaDir, fileName);
    fs.writeFileSync(filePath, response.data);

    const result = await sendMedia(to, filePath, 'image', {
      caption: caption || null,
    });

    res.json({
      success: true,
      messageId: result.key.id,
      to,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /send-audio - Send audio message
 */
app.post('/send-audio', async (req, res) => {
  try {
    const { to, audioUrl, ptt } = req.body;

    if (!to || !audioUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, audioUrl',
      });
    }

    // Download audio from URL
    const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    const fileName = `audio_${Date.now()}.m4a`;
    const filePath = path.join(config.mediaDir, fileName);
    fs.writeFileSync(filePath, response.data);

    const result = await sendMedia(to, filePath, 'audio', {
      ptt: ptt !== false,
    });

    res.json({
      success: true,
      messageId: result.key.id,
      to,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /send-video - Send video message
 */
app.post('/send-video', async (req, res) => {
  try {
    const { to, videoUrl, caption } = req.body;

    if (!to || !videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, videoUrl',
      });
    }

    // Download video from URL
    const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    const fileName = `video_${Date.now()}.mp4`;
    const filePath = path.join(config.mediaDir, fileName);
    fs.writeFileSync(filePath, response.data);

    const result = await sendMedia(to, filePath, 'video', {
      caption: caption || null,
    });

    res.json({
      success: true,
      messageId: result.key.id,
      to,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /send-document - Send document
 */
app.post('/send-document', async (req, res) => {
  try {
    const { to, documentUrl, fileName } = req.body;

    if (!to || !documentUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, documentUrl',
      });
    }

    // Download document from URL
    const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
    const docFileName = fileName || `document_${Date.now()}.pdf`;
    const filePath = path.join(config.mediaDir, docFileName);
    fs.writeFileSync(filePath, response.data);

    const result = await sendMedia(to, filePath, 'document', {
      fileName: docFileName,
    });

    res.json({
      success: true,
      messageId: result.key.id,
      to,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /media/:filename - Serve downloaded media
 */
app.get('/media/:filename', (req, res) => {
  try {
    const filePath = path.join(config.mediaDir, req.params.filename);

    // Security: prevent directory traversal
    if (!filePath.startsWith(config.mediaDir)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /group/create - Create WhatsApp group
 */
app.post('/group/create', async (req, res) => {
  try {
    const { groupName, members } = req.body;

    if (!sock?.user?.id) {
      return res.status(400).json({ error: 'WhatsApp not connected' });
    }

    if (!groupName || !members || !Array.isArray(members)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: groupName, members (array)',
      });
    }

    const result = await sock.groupCreate(groupName, members);
    res.json({
      success: true,
      groupId: result.gid,
      groupName,
      members: members.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /contacts - Get all contacts
 */
app.get('/contacts', async (req, res) => {
  try {
    if (!sock?.user?.id) {
      return res.status(400).json({ error: 'WhatsApp not connected' });
    }

    const contacts = await sock.fetchBlocklist?.();
    res.json({
      success: true,
      contacts: contacts || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /webhook/config - Configure n8n webhook
 */
app.post('/webhook/config', (req, res) => {
  try {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: webhookUrl',
      });
    }

    config.n8nWebhook = webhookUrl;
    res.json({
      success: true,
      message: 'Webhook configured',
      webhookUrl,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============ SERVER STARTUP ============

const startServer = async () => {
  try {
    // Start Express server
    app.listen(config.port, () => {
      logger.info(`WhatsApp Gateway running on port ${config.port}`);
      logger.info(`n8n Webhook: ${config.n8nWebhook}`);
    });

    // Initialize WhatsApp connection
    await connectToWhatsApp();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  if (sock) {
    await sock.end();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  if (sock) {
    await sock.end();
  }
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Startup error:', error);
  process.exit(1);
});

module.exports = { app, connectToWhatsApp, sendMessage, sendMedia };
