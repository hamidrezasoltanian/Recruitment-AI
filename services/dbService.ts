

import { Candidate } from '../types';

const DB_NAME = 'RecruitmentDB_React_V1';
const CANDIDATES_STORE = 'candidates';
const RESUMES_STORE = 'resumes';
const TEST_FILES_STORE = 'test_files'; // New store for test result files
const DB_VERSION = 2; // Incremented version for schema change

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('خطا در باز کردن پایگاه داده.'));
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(CANDIDATES_STORE)) {
        dbInstance.createObjectStore(CANDIDATES_STORE, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(RESUMES_STORE)) {
        dbInstance.createObjectStore(RESUMES_STORE);
      }
      if (!dbInstance.objectStoreNames.contains(TEST_FILES_STORE)) {
        dbInstance.createObjectStore(TEST_FILES_STORE);
      }
    };
  });
};

const dbOp = async <T,>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const dbInstance = await openDB();
  return new Promise<T>((resolve, reject) => {
    const transaction = dbInstance.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const dbService = {
  saveCandidate: (candidate: Candidate) => dbOp(CANDIDATES_STORE, 'readwrite', store => store.put(candidate)),
  getAllCandidates: () => dbOp<Candidate[]>(CANDIDATES_STORE, 'readonly', store => store.getAll()),
  getCandidate: (id: string) => dbOp<Candidate>(CANDIDATES_STORE, 'readonly', store => store.get(id)),
  deleteCandidate: (id: string) => dbOp(CANDIDATES_STORE, 'readwrite', store => store.delete(id)),
  clearAllCandidates: () => dbOp(CANDIDATES_STORE, 'readwrite', store => store.clear()),
  
  saveResume: (id: string, file: File) => dbOp(RESUMES_STORE, 'readwrite', store => store.put(file, id)),
  getResume: (id: string) => dbOp<File>(RESUMES_STORE, 'readonly', store => store.get(id)),
  deleteResume: (id: string) => dbOp(RESUMES_STORE, 'readwrite', store => store.delete(id)),
  clearAllResumes: () => dbOp(RESUMES_STORE, 'readwrite', store => store.clear()),

  // Methods for test files
  saveTestFile: (id: string, file: File) => dbOp(TEST_FILES_STORE, 'readwrite', store => store.put(file, id)),
  getTestFile: (id: string) => dbOp<File>(TEST_FILES_STORE, 'readonly', store => store.get(id)),
  deleteTestFile: (id: string) => dbOp(TEST_FILES_STORE, 'readwrite', store => store.delete(id)),
};