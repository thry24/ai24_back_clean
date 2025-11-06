const router = require('express').Router();
const WaveVideo = require('../models/WaveVideo');

router.post('/', async (req, res) => {
  try {
    const doc = await WaveVideo.create(req.body);
    res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

router.get('/', async (_req, res) => {
  const list = await WaveVideo.find().sort({ createdAt: -1 });
  res.json({ ok: true, data: list });
});

router.get('/:id', async (req, res) => {
  const doc = await WaveVideo.findById(req.params.id);
  if (!doc) return res.status(404).json({ ok: false, msg: 'No encontrado' });
  res.json({ ok: true, data: doc });
});

router.put('/:id', async (req, res) => {
  const doc = await WaveVideo.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ ok: true, data: doc });
});

router.delete('/:id', async (req, res) => {
  await WaveVideo.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
