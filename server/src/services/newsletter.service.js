import { Subscriber } from '../models/index.js';

/** Idempotent: subscribing twice is not an error. */
export async function subscribe(email, source = 'footer') {
  await Subscriber.updateOne(
    { email: email.toLowerCase().trim() },
    { $setOnInsert: { email: email.toLowerCase().trim(), source } },
    { upsert: true }
  );
}
