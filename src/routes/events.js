import { Router } from 'express';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  likeEvent,
  rsvpEvent,
  addPhotos,
  getPhotos
} from '../controllers/eventController.js';

const router = Router();

router.get('/', listEvents);
router.get('/:id', getEvent);
router.post('/', createEvent);
router.patch('/:id', updateEvent);
router.delete('/:id', deleteEvent);

router.post('/:id/like', likeEvent);
router.post('/:id/rsvp', rsvpEvent);

router.post('/:id/photos', addPhotos);
router.get('/:id/photos', getPhotos);

export default router;
