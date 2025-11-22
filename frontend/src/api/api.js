// src/api/api.js

import api from "./axios";

// ---- USER AUTH ----
export const authApi = {
  register: (username, password) =>
    api.post("/auth/register", { username, password }),

  login: (username, password) =>
    api.post("/auth/login", { username, password }),

  logout: () => api.post("/auth/logout"),
  me: () => api.get("/me"),
};

// ---- DECKS ----
export const deckApi = {
  getAll: (user_id) => api.get(`/decks?user_id=${user_id}`),
  getOne: (id) => api.get(`/decks/${id}`),
  getSummary: (id) => api.get(`/decks/${id}/summary`),
  create: (data) => api.post("/decks", data),
  update: (id, data) => api.put(`/decks/${id}`, data),
  delete: (id) => api.delete(`/decks/${id}`),
};

// ---- FLASHCARDS ----
export const flashcardApi = {
  getAll: (deckId) => api.get(`/decks/${deckId}/flashcards`),
  create: (deckId, data) =>
    api.post(`/decks/${deckId}/flashcards`, data),
  update: (id, data) => api.put(`/flashcards/${id}`, data),
  delete: (id) => api.delete(`/flashcards/${id}`),
};

// ---- STUDY MODE ----
export const studyApi = {
  startSession: (deckId) => api.post(`/study/start`, { deckId }),
  submitReview: (cardId, rating) =>
    api.post(`/study/review`, { cardId, rating }),
};

// ---- STATS ----
export const statsApi = {
  today: () => api.get("/stats/today"),
  streak: () => api.get("/stats/streak"),
};
