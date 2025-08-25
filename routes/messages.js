import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json([
    { id: 1, text: 'Hello' },
    { id: 2, text: 'from the TEST!' }
  ]);
});

export default router;
