# WhatsApp Pairing Code Guide

Este guia explica como usar o recurso de **Código de Pareamento** (Pairing Code) para conectar o WhatsApp ao Gateway em vez de usar QR Code.

## O que é Pairing Code?

O Pairing Code é um método alternativo de conexão do WhatsApp que permite vincular um dispositivo usando um código de 8 caracteres em vez de escanear um QR Code. É especialmente útil quando:

- Você está em um ambiente sem câmera
- Prefere um método mais direto de conexão
- Está automatizando o processo de conexão

## Como Funciona

1. O gateway gera um código de 8 caracteres (ex: `ABCD1234`)
2. Você insere este código no WhatsApp Web/Desktop através das configurações
3. O WhatsApp valida o código e estabelece a conexão

## Configuração

### 1. Variáveis de Ambiente

Edite o arquivo `.env` no diretório `gateway/`:

```env
# Modo de pareamento: 'qr' ou 'code'
PAIRING_MODE=code

# Outras configurações
PORT=3000
N8N_WEBHOOK_URL=http://localhost:5678/webhook/whatsapp
LOG_LEVEL=debug
```

### 2. Modos Disponíveis

- **`PAIRING_MODE=qr`** (padrão): Usa QR Code para conexão
- **`PAIRING_MODE=code`**: Usa código de pareamento

## Uso da API

### Endpoint: POST /pairing-code

Gera um código de pareamento para um número de telefone.

**Request:**

```bash
curl -X POST http://localhost:3000/pairing-code \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511999999999"
  }'
```

**Formato do Número de Telefone:**
- Deve incluir código do país (sem +)
- Apenas números
- Exemplo: `5511999999999` (Brasil: 55, DDD: 11, Número: 999999999)

**Response (Sucesso):**

```json
{
  "success": true,
  "code": "ABCD1234",
  "phoneNumber": "5511999999999",
  "message": "Enter this code in WhatsApp: Settings > Linked Devices > Link a Device > Link with Phone Number"
}
```

**Response (Erro - Número faltando):**

```json
{
  "success": false,
  "error": "Missing required field: phoneNumber"
}
```

**Response (Erro - Formato inválido):**

```json
{
  "success": false,
  "error": "Invalid phone number format. Use format: 5511999999999 (country code + number)"
}
```

**Response (Erro - Já conectado):**

```json
{
  "success": false,
  "error": "Already connected. Disconnect first to pair a new device."
}
```

## Passo a Passo Completo

### Método 1: Usando a API

1. **Inicie o Gateway:**
   ```bash
   cd gateway
   npm install
   npm start
   ```

2. **Solicite o código:**
   ```bash
   curl -X POST http://localhost:3000/pairing-code \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "5511999999999"}'
   ```

3. **Anote o código retornado** (ex: `ABCD1234`)

4. **No WhatsApp (celular):**
   - Abra o WhatsApp
   - Vá em **Configurações** (⚙️)
   - Selecione **Dispositivos Conectados**
   - Toque em **Conectar Dispositivo**
   - Escolha **Conectar com número de telefone**
   - Digite o código de 8 caracteres: `ABCD-1234`
   - Aguarde a confirmação

5. **Verifique a conexão:**
   ```bash
   curl http://localhost:3000/status
   ```

### Método 2: Automático no Startup (Opcional)

Se você sempre usar o mesmo número, pode configurar no `.env`:

```env
PAIRING_MODE=code
PHONE_NUMBER=5511999999999
```

**Nota:** Com esta configuração, você ainda precisa chamar o endpoint `/pairing-code` ou implementar lógica adicional para gerar o código automaticamente.

## Exemplos de Integração

### Node.js

```javascript
const axios = require('axios');

async function getPairingCode(phoneNumber) {
  try {
    const response = await axios.post('http://localhost:3000/pairing-code', {
      phoneNumber: phoneNumber
    });
    
    console.log('Código de Pareamento:', response.data.code);
    console.log('Digite este código no WhatsApp');
    
    return response.data.code;
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
  }
}

// Uso
getPairingCode('5511999999999');
```

### Python

```python
import requests

def get_pairing_code(phone_number):
    url = 'http://localhost:3000/pairing-code'
    payload = {'phoneNumber': phone_number}
    
    try:
        response = requests.post(url, json=payload)
        data = response.json()
        
        if data.get('success'):
            print(f"Código de Pareamento: {data['code']}")
            print("Digite este código no WhatsApp")
            return data['code']
        else:
            print(f"Erro: {data['error']}")
    except Exception as e:
        print(f"Erro: {str(e)}")

# Uso
get_pairing_code('5511999999999')
```

### cURL com n8n

Você pode usar este exemplo em um workflow do n8n:

```json
{
  "nodes": [
    {
      "parameters": {
        "url": "http://localhost:3000/pairing-code",
        "method": "POST",
        "jsonParameters": true,
        "options": {},
        "bodyParametersJson": "={\n  \"phoneNumber\": \"5511999999999\"\n}"
      },
      "name": "Get Pairing Code",
      "type": "n8n-nodes-base.httpRequest",
      "position": [250, 300]
    }
  ]
}
```

## Troubleshooting

### Problema: "Failed to initialize WhatsApp connection"

**Solução:**
- Verifique se o gateway está rodando
- Aguarde alguns segundos após iniciar o gateway antes de solicitar o código
- Verifique os logs para mais detalhes

### Problema: "Invalid phone number format"

**Solução:**
- Use apenas números
- Inclua o código do país (sem +)
- Formato correto: `5511999999999`
- Formato incorreto: `+55 11 99999-9999`

### Problema: "Already connected"

**Solução:**
- Desconecte primeiro usando: `GET /disconnect`
- Ou reinicie o gateway
- Limpe a pasta `sessions/` se necessário

### Problema: Código não funciona no WhatsApp

**Solução:**
- Verifique se digitou o código corretamente
- O código tem validade limitada, solicite um novo se expirou
- Certifique-se de estar usando o número correto
- Tente reiniciar o gateway e gerar novo código

## Comparação: QR Code vs Pairing Code

| Característica | QR Code | Pairing Code |
|----------------|---------|--------------|
| Requer câmera | Sim | Não |
| Facilidade de uso | Alta | Média |
| Automação | Difícil | Mais fácil |
| Validade | ~30 segundos | ~1-2 minutos |
| Interface | Terminal | API REST |
| Melhor para | Uso manual | Integração/Automação |

## Segurança

⚠️ **Importante:**

- Nunca compartilhe códigos de pareamento
- Use HTTPS em produção
- Proteja o endpoint com autenticação
- Monitore tentativas de pareamento não autorizadas
- Mantenha os logs para auditoria

## Webhooks

Quando usar pairing code, o gateway envia webhooks para os seguintes eventos:

```javascript
// Código gerado
{
  "event": "pairing_code_generated",
  "data": {
    "phoneNumber": "5511999999999",
    "code": "ABCD1234"
  },
  "timestamp": "2025-12-10T12:00:00.000Z",
  "source": "whatsapp-gateway"
}

// Conexão estabelecida
{
  "event": "connection_open",
  "data": {
    "jid": "5511999999999@s.whatsapp.net",
    "phoneNumber": "5511999999999",
    "name": "User Name"
  },
  "timestamp": "2025-12-10T12:01:00.000Z",
  "source": "whatsapp-gateway"
}
```

## Suporte

Para questões ou problemas:

- Abra uma issue no GitHub
- Consulte a documentação do Baileys
- Verifique os logs do gateway em modo debug

## Changelog

### v1.1.0 (2025-12-10)
- ✨ Adicionado suporte a Pairing Code
- ✨ Novo endpoint POST /pairing-code
- ✨ Variável de ambiente PAIRING_MODE
- 🐛 Correções nas dependências
- 🔧 Melhorias no tratamento de erros
- 📝 Documentação completa

### v1.0.0 (2025-12-10)
- 🎉 Release inicial
- ✨ Suporte a QR Code
- ✨ Envio e recebimento de mensagens
