import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage as getFirebaseStorage, type FirebaseStorage } from 'firebase/storage';

import { getFirebaseApp } from './firebase-app';

let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function getDb(): Firestore {
  db ??= getFirestore(getFirebaseApp());
  return db;
}

export function getStorageBucket(): FirebaseStorage {
  storage ??= getFirebaseStorage(getFirebaseApp());
  return storage;
}
