import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json([
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' }
  ]);
});
export default router;