const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// 🔥 ADD THESE ENHANCED ROUTES HERE (After app.use(express.json()))
let tourists = [];
let alerts = [];

// 🚀 PROFESSIONAL TOURIST REGISTRATION w/ Digital ID
app.post('/api/register', (req, res) => {
  const tourist = {
    id: Date.now().toString(),
    name: req.body.name || `Tourist ${Math.floor(Math.random() * 1000)}`,
    location: {
      lat: 13.9167 + (Math.random() - 0.5) * 0.02,
      lng: 78.4867 + (Math.random() - 0.5) * 0.02
    },
    safetyScore: 70 + Math.floor(Math.random() * 30),
    timestamp: Date.now(),
    digitalID: `ID${Date.now().toString().slice(-6)}`,
    status: 'active'
  };
  tourists.push(tourist);
  res.json(tourist);
});

// 🚨 E-FIR PANIC ALERT SYSTEM
app.post('/api/alerts', (req, res) => {
  const alert = {
    id: Date.now().toString(),
    touristId: req.body.touristId,
    location: req.body.location || [13.9167, 78.4867],
    type: 'panic',
    timestamp: Date.now(),
    status: 'police-dispatched',
    efirId: `E-FIR${Date.now().toString().slice(-6)}`
  };
  alerts.unshift(alert); // Newest first
  io.emit('newAlert', alert); // Real-time broadcast
  res.json(alert);
});

// 📊 API Endpoints
app.get('/api/tourists', (req, res) => res.json(tourists));
app.get('/api/alerts', (req, res) => res.json(alerts.slice(0, 10)));

// 🏠 API Status Page
app.get('/', (req, res) => {
  res.json({
    message: "🚀 SafeTravel AI Backend - LIVE!",
    endpoints: ["/api/tourists", "/api/alerts", "/api/register"],
    stats: { tourists: tourists.length, alerts: alerts.length },
    status: "Science Day 2026 Production Ready!"
  });
});

// Socket.io real-time
io.on('connection', (socket) => {
  socket.on('panic', (data) => {
    const alert = {
      id: Date.now().toString(),
      ...data,
      status: 'active'
    };
    alerts.unshift(alert);
    io.emit('alert', alert);
  });
});

// PORT for production (Render/Vercel)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 SafeTravel AI Backend running on PORT ${PORT}`);
  console.log(`📊 Tourists: ${tourists.length} | Alerts: ${alerts.length}`);
});
