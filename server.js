const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const CryptoJS = require('crypto-js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

let tourists = [];
let alerts = [];
let riskZones = [
  { id: 1, name: 'High Risk Zone', polygon: [[13.91, 78.48], [13.92, 78.49], [13.93, 78.48]] }
];

// 🔐 BLOCKCHAIN Digital ID
app.post('/api/register', (req, res) => {
  const { name, phone, aadhaar, passport, itinerary } = req.body;
  const digitalId = '0x' + CryptoJS.SHA256(JSON.stringify(req.body) + Date.now()).toString().slice(0,16);
  
  const tourist = {
    id: Date.now(),
    digitalId,
    name,
    phone,
    kyc: { aadhaar: CryptoJS.AES.encrypt(aadhaar, 'tourist-secret').toString(), passport },
    itinerary,
    locations: [{ lat: 13.9167, lng: 78.4867, timestamp: Date.now(), speed: 0 }],
    safetyScore: 85,
    consentTracking: false,
    language: 'en',
    validTill: Date.now() + 30*24*60*60*1000 // 30 days
  };
  tourists.push(tourist);
  io.emit('touristUpdate', tourists);
  res.json(tourist);
});

// 🗺️ Real-time location + AI anomaly detection
app.post('/api/location/:id', (req, res) => {
  const tourist = tourists.find(t => t.id == req.params.id);
  if (!tourist) return res.status(404).json({ error: 'Tourist not found' });
  
  const newLoc = { ...req.body, timestamp: Date.now() };
  tourist.locations.push(newLoc);
  if (tourist.locations.length > 50) tourist.locations.shift(); // Keep last 50
  
  // 🤖 AI Safety Score + Anomaly Detection
  const recentLocs = tourist.locations.slice(-5);
  const avgSpeed = recentLocs.slice(1).reduce((sum, loc, i) => {
    const dist = Math.sqrt(Math.pow(loc.lat - recentLocs[i].lat, 2) + Math.pow(loc.lng - recentLocs[i].lng, 2));
    return sum + (dist * 111 * 1000 / ((loc.timestamp - recentLocs[i].timestamp) / 1000 / 3600)); // km/h
  }, 0) / (recentLocs.length - 1);
  
  tourist.safetyScore = avgSpeed > 50 || recentLocs.length > 3 && recentLocs[recentLocs.length-1].speed < 1 ? 45 : 92;
  
  // 🚨 Geo-fencing check
  riskZones.forEach(zone => {
    if (isPointInPolygon(newLoc, zone.polygon)) {
      const alert = { id: Date.now(), touristId: tourist.id, type: 'geofence', zone: zone.name, location: newLoc };
      alerts.unshift(alert);
      io.emit('alert', alert);
    }
  });
  
  io.emit('touristUpdate', tourists);
  res.json(tourist);
});

// 👮 Police Dashboard APIs
app.get('/api/tourists', (req, res) => res.json(tourists.filter(t => t.consentTracking)));
app.get('/api/alerts', (req, res) => res.json(alerts.slice(0, 50)));
app.post('/api/efir', (req, res) => {
  const efirId = 'EFIR-' + Date.now();
  const efir = { ...req.body, efirId, status: 'filed', timestamp: new Date().toISOString() };
  alerts.unshift(efir);
  io.emit('efir', efir);
  res.json({ efirId, status: 'E-FIR generated' });
});

// 🛡️ Geo-fencing helper
function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (((polygon[i][1] > point.lat) !== (polygon[j][1] > point.lat)) &&
        (point.lng < (polygon[j][0] - polygon[i][0]) * (point.lat - polygon[i][1]) / 
         (polygon[j][1] - polygon[i][1]) + polygon[i][0])) {
      inside = !inside;
    }
  }
  return inside;
}

io.on('connection', (socket) => {
  socket.on('panic', (data) => {
    alerts.unshift({ 
      id: Date.now(), 
      type: 'panic', 
      location: data.location,
      timestamp: new Date().toISOString()
    });
    io.to('police').emit('highPriorityAlert', alerts[0]);
  });
  socket.on('join-police', () => socket.join('police'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Backend running on PORT ${PORT}`);
  console.log('✅ Ready for Railway deployment!');
});
