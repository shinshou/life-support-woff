const express = require('express');
const router = require('./src/router');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS（フロントエンドが GitHub Pages など別ドメインから呼ぶ場合に必要）
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/', router.handleGet);
app.post('/', router.handlePost);

// Cloud Scheduler から叩かれる日次通知エンドポイント
app.post('/trigger/daily', router.handleDailyTrigger);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, data: null, error: err.message, code: 500 });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
