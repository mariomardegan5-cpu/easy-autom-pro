# 🚀 WhatsApp Gateway - Easy Robo V2

Gateway de WhatsApp profissional e estável, utilizando **Baileys** com pareamento via código (sem QR Code). Código em produção validado e blindado contra crashes.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Características](#características)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Deploy no Easypanel](#deploy-no-easypanel)
- [Conectando via Código de Pareamento](#conectando-via-código-de-pareamento)
- [API Endpoints](#api-endpoints)
- [Integração com n8n](#integração-com-n8n)
- [Troubleshooting](#troubleshooting)

## 🎯 Visão Geral

Este gateway fornece uma interface robusta para enviar e receber mensagens do WhatsApp, integrado perfeitamente com n8n para automações. Utiliza o método de **pareamento por código** (requestPairingCode), eliminando a necessidade de escanear QR Codes.

### Diferencial desta versão:

- ✅ **Pareamento automático por código** após 40 segundos
- ✅ **API blindada** contra mensagens vazias (anti-crash)
- ✅ **Reconexão automática** inteligente
- ✅ **Logs formatados** e informativos
- ✅ **ES Modules** (código moderno)
- ✅ **Validado em produção**

## ✨ Características

- 📱 Envio de mensagens de texto
- 🔄 Recebimento de mensagens via webhook
- 🛡️ Proteção contra crash por mensagens vazias
- 🔐 Autenticação via código de pareamento
- 🔌 Integração nativa com n8n
- 📊 Logs claros e informativos
- 🚀 Reconexão automática

## 📦 Pré-requisitos

- Node.js 20 ou superior
- Docker (para deploy no Easypanel)
- Número de WhatsApp válido
- Instância n8n (opcional, mas recomendado)

## 🔧 Instalação

### 1. Clone o Repositório

```bash
git clone https://github.com/mariomardegan5-cpu/easy-autom-pro.git
cd easy-autom-pro/gateway
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure as Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
PORT=3000
WEBHOOK_MENSAGENS=http://n8n:5678/webhook/whatsapp
NUMERO_ZAP=5511999999999
```

### 4. Execute Localmente

```bash
npm start
```

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta do servidor Express | `3000` |
| `WEBHOOK_MENSAGENS` | URL do webhook n8n para receber mensagens | `http://n8n:5678/webhook/whatsapp` |
| `NUMERO_ZAP` | Seu número do WhatsApp (com código do país, sem +) | `551391095649` |

**Importante:** O `NUMERO_ZAP` deve estar no formato internacional sem o sinal de `+`. Exemplo: `5511999999999` (55 = Brasil, 11 = DDD, 999999999 = número).

## 🐳 Deploy no Easypanel

### Checklist de Instalação

- [ ] **1. Criar novo serviço no Easypanel**
  - Tipo: Docker
  - Nome: `zap-easy-autom` (ou outro nome de sua preferência)

- [ ] **2. Configurar variáveis de ambiente**
  ```
  PORT=3000
  WEBHOOK_MENSAGENS=http://n8n:5678/webhook/whatsapp
  NUMERO_ZAP=5511999999999
  ```

- [ ] **3. Configurar Dockerfile**
  - Usar o Dockerfile fornecido neste repositório
  - Path: `/gateway`

- [ ] **4. Configurar volume para persistência de sessão**
  - Volume: `/app/sessions`
  - Importante para não perder a sessão após restart

- [ ] **5. Expor a porta 3000**

- [ ] **6. Deploy e aguardar logs**

### Estrutura de Deploy

```yaml
services:
  zap-easy-autom:
    build: ./gateway
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - WEBHOOK_MENSAGENS=http://n8n:5678/webhook/whatsapp
      - NUMERO_ZAP=5511999999999
    volumes:
      - ./sessions:/app/sessions
    restart: unless-stopped
```

## 📱 Conectando via Código de Pareamento

### Como Funciona

1. **Inicie o gateway** - O serviço irá iniciar e tentar conectar
2. **Aguarde 40 segundos** - O código será solicitado automaticamente
3. **Visualize o código nos logs** - Formato: `XXXX-XXXX`
4. **No seu WhatsApp:**
   - Abra o WhatsApp
   - Vá em `Configurações` > `Aparelhos Conectados`
   - Clique em `Conectar Aparelho`
   - Escolha `Conectar com número de telefone`
   - Digite o código exibido nos logs

### Logs Esperados

```
🤖 Servidor ON na porta 3000
🔑 CÓDIGO: 1234-5678
✅ CONECTADO!
```

### Primeira Conexão

Na primeira execução:
1. O sistema aguarda 40 segundos
2. Solicita o código de pareamento
3. Exibe o código formatado no console
4. Aguarda você inserir o código no WhatsApp

### Reconexões

Após a primeira conexão bem-sucedida:
- A sessão é salva em `/app/sessions`
- Reconexões automáticas não precisam de novo código
- Apenas em caso de logout será necessário novo pareamento

## 🔌 API Endpoints

### POST /send-message

Envia uma mensagem de texto.

**Request:**
```json
{
  "number": "5511999999999",
  "text": "Olá! Esta é uma mensagem de teste."
}
```

**Response (Sucesso):**
```json
{
  "status": "sucesso"
}
```

**Response (Erro - WhatsApp desconectado):**
```json
{
  "error": "WhatsApp desconectado"
}
```

**Response (Erro - Faltou texto):**
```json
{
  "error": "Faltou texto"
}
```

### GET /

Health check simples.

**Response:**
```
🚀 Gateway EASY ROBO V2 Ativo
```

## 🔗 Integração com n8n

### Fluxo de Mensagens

1. **Cliente envia mensagem no WhatsApp** → Gateway recebe
2. **Gateway envia para webhook n8n** → n8n processa
3. **n8n envia resposta para API** → Gateway envia para WhatsApp

### Configuração do Webhook n8n

1. Importe o fluxo `n8n-flows/fluxo_bia_producao_v2.json`
2. Configure suas credenciais OpenAI
3. Ative o workflow
4. O webhook estará disponível em: `http://n8n:5678/webhook/whatsapp`

### Dados Enviados ao Webhook

```json
{
  "remoteJid": "5511999999999@s.whatsapp.net",
  "pushName": "Nome do Contato",
  "message": "Texto da mensagem"
}
```

## 🔍 Troubleshooting

### Problema: "WhatsApp desconectado"

**Solução:**
1. Verifique se o código de pareamento foi inserido corretamente
2. Aguarde alguns segundos para reconexão automática
3. Verifique os logs do container

### Problema: "Código não aparece nos logs"

**Solução:**
1. Aguarde pelo menos 40 segundos após o início
2. Verifique se a variável `NUMERO_ZAP` está configurada corretamente
3. Delete a pasta `sessions` e reinicie o serviço

### Problema: "Erro envio"

**Solução:**
1. Verifique se o número está no formato correto (com @s.whatsapp.net ou sem)
2. Certifique-se de que o texto não está vazio
3. Verifique se o WhatsApp está conectado

### Problema: "Sessão perdida após restart"

**Solução:**
1. Certifique-se de que o volume `/app/sessions` está configurado
2. Verifique as permissões da pasta
3. No Easypanel, configure um volume persistente

### Logs Importantes

- `🤖 Servidor ON na porta 3000` - Servidor iniciado
- `🔑 CÓDIGO: XXXX-XXXX` - Código de pareamento disponível
- `✅ CONECTADO!` - WhatsApp conectado com sucesso
- `✅ Enviado para ...` - Mensagem enviada com sucesso
- `⚠️ Tentativa rejeitada: Texto vazio!` - Proteção anti-crash ativada
- `⛔ Logout.` - WhatsApp desconectado (requer novo pareamento)

## 🛡️ Segurança

- ✅ Validação de mensagens vazias (anti-crash)
- ✅ Tratamento de erros robusto
- ✅ Reconexão automática inteligente
- ✅ Logs sem informações sensíveis
- ✅ Sessão criptografada pelo Baileys

## 📝 Notas Importantes

1. **Primeira execução:** Sempre aguarde pelo menos 40 segundos para o código aparecer
2. **Número no formato internacional:** Sem `+`, apenas dígitos (ex: 5511999999999)
3. **Volume persistente:** Essencial para manter a sessão após restarts
4. **Webhook n8n:** Deve estar acessível pela rede do gateway
5. **Limite de mensagens:** Respeite os limites do WhatsApp para evitar bloqueios

## 📄 Licença

Este projeto é parte do Easy Automation Pro.

## 🤝 Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Consulte a documentação do Baileys
- Verifique os logs do container
