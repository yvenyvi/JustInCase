# JusticeLink

JusticeLink is a modern legal tech platform designed to bridge the gap between the public and legal professionals in the Philippines.

This repository contains the full stack implementation, with a major focus currently on the **Mobile Application** built with React Native (Expo).

## Current Progress: Mobile App

The mobile application is undergoing rapid development. Here is the current state of the implemented features:

### 🚀 Core Features & UI
* **Authentication Flow:** Complete login and registration screens connected to Supabase Auth.
* **Role-Based Routing:** Seamless navigation for different user types (Public End-Users, Legal Professionals).
* **Modern Design System:** A clean, gap-free, and responsive UI heavily utilizing Tailwind-inspired utility styling and React Native flexbox.

### 🤖 AI-Powered Tools
* **Interactive AI Document Drafter (`DocumentGeneratorScreen`):** 
  * A conversational chat interface where users explain their legal situation.
  * The AI backend actively gathers missing information through follow-up questions.
  * Once sufficient data is collected, the system generates a fully formatted legal document (e.g., Barangay Complaints).
  * **Recent Fixes:** Fully optimized Android keyboard behavior (custom offset tracking for gap-free and clip-free chat interactions).
* **AI Triage System (`TriageScreen`):** Initial conversational interface for evaluating user situations and suggesting immediate legal next steps.

### ⚖️ Legal Professional Dashboard
* **Case Management (`LegalCasesScreen`, `LegalCaseDetailsScreen`):** UI for lawyers to view available cases, active engagements, and detailed case information.
* **Dashboard Overview (`LegalDashboardScreen`):** At-a-glance statistics and recent activities for the logged-in professional.

### 💬 Communication
* **Messaging System (`ChatThreadScreen`):** Real-time chat interface connecting end-users and assigned legal professionals, equipped with the same highly-optimized Android keyboard avoidance architecture used in the AI Drafter.

## Tech Stack

* **Frontend:** React Native, Expo, React Navigation
* **Backend:** Python (FastAPI) for AI endpoints and business logic
* **Database & Auth:** Supabase (PostgreSQL)

## Running the App Locally

Ensure you have your environment variables set up in the `.env` files (both root and `mobile/`).

To start the full stack environment (Backend + Expo Mobile App):
```powershell
.\dev.ps1 start
```

## Next Steps / Active Development
- Refining the prompt logic for specific document generation (e.g., ensuring Barangay Complaints address the barangay generically rather than specific placeholders).
- Finalizing the connection between the AI Triage system and the lawyer-matching database.
- Enhancing real-time WebSocket subscriptions for the messaging system.
