import { Router } from 'express';
import { upsertUser, archiveLikes, archiveGoing, archivePast } from '../controllers/userController.js';

const router = Router();

router.post('/', upsertUser);
router.get('/:userId/archive/likes', archiveLikes);
router.get('/:userId/archive/going', archiveGoing);
router.get('/:userId/archive/past', archivePast);

export default router;
