import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Event from '../models/Event.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydb';

async function run() {
  await mongoose.connect(mongoUri);

  await Event.deleteMany({}); // remove old seeds (optional)

  await Event.create([
    {
      organizerName: 'Alice Janssens',
      organizationName: 'Kultur Klub',
      date: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      imageUrl: 'https://example.com/event1.jpg',
      teaser: 'Sunset rooftop party with live DJ.',
      location: 'Antwerpen',
      ticketsUrl: 'https://tickets.example.com/abc',
      websiteUrl: '',
      keywordsRaw: 'party;dj;rooftop;summer',
    },
    {
      organizerName: 'Tom Peeters',
      organizationName: '',
      date: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      imageUrl: 'https://example.com/event2.jpg',
      teaser: 'Indie film night — Q&A with director.',
      location: 'Gent',
      ticketsUrl: '',
      websiteUrl: 'https://filmhuis.example.com',
      keywordsRaw: 'film;indie;cinema;q&a',
    },
  ]);

  console.log('Seeded events ✔');
  await mongoose.disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
