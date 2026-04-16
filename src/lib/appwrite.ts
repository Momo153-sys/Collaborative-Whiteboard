// src/lib/appwrite.ts
import { Client, Account, Databases, ID, Query } from 'appwrite';

export const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const SHAPES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_SHAPES_COLLECTION_ID;
export const ROOMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_ROOMS_COLLECTION_ID;

export { ID, Query };