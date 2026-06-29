const router = require('express').Router();
const db = require('../config/db');

// POST /api/chatbot — stateless, receives full message history
router.post('/', async (req, res) => {
  try {
    const { messages, table_number } = req.body;

    // Build context about the cafe
    const [menuItems] = await db.query(
      `SELECT m.name, m.price, m.description, m.is_veg, c.name as category
       FROM menu_items m JOIN categories c ON m.category_id=c.id
       WHERE m.is_available=1 ORDER BY c.name, m.price`
    );
    const menuText = menuItems.map(i =>
      `• ${i.name} (${i.category}) - ₹${i.price} - ${i.is_veg ? '🌱 Veg' : '🍗 Non-Veg'}${i.description ? ' - ' + i.description : ''}`
    ).join('\n');

    const systemPrompt = `You are "Royal", the friendly AI assistant for Royal Café – a premium café in India.
Your job: help customers with menu suggestions, order tracking, reservations, café info, and general questions.

CAFÉ INFO:
- Name: Royal Café
- Timings: Mon–Sun, 8 AM – 11 PM
- Phone: +91 98765 43210
- Address: Royal Café, Main Street, Chennai
- Table booking: call us or use the Reservations section on this app
- WiFi password: RoyalCafe@2024
- Parking: available (basement)
- Special: Live music every Friday & Saturday evening

CURRENT MENU:
${menuText}

GUIDELINES:
- Be warm, helpful, concise. Use light emojis.
- For menu suggestions, ask about preferences (veg/non-veg, mood, spice level).
- If asked about a specific order status, say: "Please check the 'My Orders' tab in the app for real-time updates."
- If asked to place an order, guide them to the Menu/Cart section.
- For reservations, guide to the Reservations section or offer the phone number.
- Never make up prices or items not in the menu above.
- If unsure, say so and offer alternatives.
${table_number ? `- This customer is at Table ${table_number}.` : ''}`;

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: systemPrompt,
        messages: messages.slice(-10), // last 10 turns
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      // Fallback if no API key
      return res.json({
        reply: "Hi! I'm Royal, your café assistant 🌿 I can help with menu suggestions, café timings, and reservations. What can I help you with today?",
        fallback: true,
      });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Sorry, I could not process that. Please try again!';
    res.json({ reply });
  } catch (e) {
    console.error('Chatbot error:', e.message);
    res.json({
      reply: "Hi! I'm Royal, your café assistant 🌿 I can help with menu suggestions, café timings, and reservations. What would you like to know?",
      fallback: true,
    });
  }
});

module.exports = router;
