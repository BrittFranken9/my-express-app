import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../config/db.js';
import Event from '../models/Event.js';
import User from '../models/User.js';

const now = new Date();

const seed = async () => {
  await connectDB();

  const count = await Event.countDocuments();
  if (count > 0) {
    console.log('Events already exist, skipping seed.');
    process.exit(0);
  }

  const demoUser = await User.create({
    displayName: 'Demo Org',
    avatarUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?q=80&w=400'
  });

  const sample = [
    {
      title: 'Open Air Summer Fest',
      organisation: 'City Culture',
      location: 'Parc du Cinquantenaire, Brussels',
      price: 12,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 18, 0, 0),
      website: 'https://example.com/summerfest',
      coverImage: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1200',
      teaser: 'Live bands, food trucks, and sunset vibes.',
      createdBy: demoUser._id
    },
    {
      title: 'Tech Meetup XB',
      organisation: 'DevCircle',
      location: 'BeCentral, Brussels',
      price: 0,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 19, 0, 0),
      website: 'https://example.com/techxb',
      coverImage: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=1200',
      teaser: 'Talks about React Native & Expo.',
      createdBy: demoUser._id
    },
    {
      title: 'Art Night Market',
      organisation: 'Museum Lab',
      location: 'Sablon, Brussels',
      price: 5,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5, 20, 0, 0),
      website: 'https://example.com/artnight',
      coverImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200',
      teaser: 'Local artists, prints, and late-night DJs.',
      createdBy: demoUser._id,
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?q=80&w=1200',
          uploadedBy: demoUser._id
        }
      ]
    }
  ];

  await Event.insertMany(sample);
  console.log('Seeded sample events.');
  process.exit(0);
};

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
