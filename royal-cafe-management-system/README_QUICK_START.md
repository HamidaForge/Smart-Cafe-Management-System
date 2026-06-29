# 🚀 Royal Cafe - Quick Start (No MySQL Needed!)

## Windows — One Click Start
1. Double-click `START.bat`
2. Wait for "Server running on port 5000"
3. Open browser → http://localhost:5000
4. Done! ✅

## Mac/Linux
```bash
cd royal-cafe-management-system/backend
npm install
node server.js
```
Then open http://localhost:5000

## Login Details
| Role    | Email                     | Password |
|---------|---------------------------|----------|
| Admin   | admin@royalcafe.com       | admin123 |
| Manager | manager@royalcafe.com     | admin123 |
| Waiter  | waiter@royalcafe.com      | admin123 |
| Kitchen | kitchen@royalcafe.com     | admin123 |

## ✅ No MySQL Needed!
This version uses SQLite — the database is automatically created as a file
`backend/data/royal_cafe.db` when you start the server. Zero configuration.

## 🤖 AI Chatbot Setup (Optional)
To enable the AI chatbot:
1. Go to https://console.anthropic.com → Sign up (free)
2. Create an API key
3. Open `backend/.env`
4. Replace `your_api_key_here` with your key
5. Restart the server

## New Features Added
### 🏆 Loyalty & Rewards (Admin Sidebar → Loyalty & Rewards)
- Silver / Gold / Platinum membership tiers
- Points: ₹10 spent = 1 point, 1 point = ₹0.50 discount
- Coupons: WELCOME10, FLAT50, ROYAL20, LOYALTY100

### 💬 AI Chatbot (Customer Portal → Chat tab)
- Menu suggestions, café timings, reservations help
- Powered by Claude AI (requires API key above)

### 🔔 Smart Waiter Calling (Customer Portal → Call Staff tab)
- Tap: Need Water / Call Waiter / Bill Please
- Instant notification on Waiter Dashboard (Admin Sidebar → Waiter Calls)
