const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// POST /api/messages/generate
router.post('/generate', async (req, res) => {
  try {
    const { taskId, type, channel } = req.body;

    if (!taskId || !type || !channel) {
      return res.status(400).json({ error: 'taskId, type a channel jsou povinné.' });
    }

    if (!['summary', 'reminder'].includes(type)) {
      return res.status(400).json({ error: 'type musí být "summary" nebo "reminder".' });
    }

    if (!['email', 'whatsapp'].includes(channel)) {
      return res.status(400).json({ error: 'channel musí být "email" nebo "whatsapp".' });
    }

    // Načíst úkol s related daty
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        folder: true,
        owner: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Úkol nenalezen.' });
    }

    // Sestavit prompt
    const prompt = buildPrompt(task, type, channel);

    // Volat Perplexity API
    const apiKey = process.env['PERPLEXITY-KEY'];
    if (!apiKey) {
      return res.status(500).json({ error: 'PERPLEXITY-KEY není nastaven.' });
    }

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'Jsi asistent pro správu úkolů. Generuješ profesionální, stručné a přátelské zprávy v češtině. Odpovídej pouze textem zprávy, bez úvodu nebo vysvětlení.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Perplexity API error:', errorData);
      return res.status(500).json({ error: 'Chyba při komunikaci s AI.' });
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || '';

    if (!generatedText) {
      return res.status(500).json({ error: 'AI nevygenerovala žádný text.' });
    }

    res.json({ text: generatedText.trim() });
  } catch (error) {
    console.error('Message generation error:', error);
    res.status(500).json({ error: 'Chyba při generování zprávy.' });
  }
});

function buildPrompt(task, type, channel) {
  const ownerName = task.owner?.name || 'příjemce';
  const folderName = task.folder?.name || '';
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const channelStyle = channel === 'whatsapp' 
    ? 'Zpráva má být krátká, neformální, vhodná pro WhatsApp (max 2-3 věty).'
    : 'Zpráva má být profesionální email s pozdravem a podpisem.';

  if (type === 'summary') {
    return `
Vygeneruj ${channel === 'whatsapp' ? 'WhatsApp zprávu' : 'email'} pro osobu "${ownerName}" s přehledem úkolu.

Informace o úkolu:
- Název: ${task.title}
- Projekt/Firma: ${folderName}
- Popis: ${task.description || 'Bez popisu'}
- Termín: ${dueDate || 'Bez termínu'}
- Stav: ${task.status}
${task.url ? `- Odkaz: ${task.url}` : ''}

${channelStyle}
Zpráva má shrnout o co jde a co je potřeba udělat.
    `.trim();
  } else {
    // reminder
    return `
Vygeneruj ${channel === 'whatsapp' ? 'WhatsApp zprávu' : 'email'} - připomenutí úkolu pro osobu "${ownerName}".

Informace o úkolu:
- Název: ${task.title}
- Projekt/Firma: ${folderName}
- Termín: ${dueDate || 'Bez termínu'}
- Stav: ${task.status}

${channelStyle}
Zpráva má zdvořile připomenout úkol a termín. Buď přátelský ale profesionální.
    `.trim();
  }
}

module.exports = router;
