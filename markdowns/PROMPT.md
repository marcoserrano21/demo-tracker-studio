
# Master Prompt to Build the Tesla Demo Drive Hub

**Your Task:**

Build a comprehensive, production-quality web application called the **"Tesla Demo Drive Hub."** This application will serve as an internal tool for Tesla stores to manage their fleet of demo vehicles, track demo drives, engage advisors through gamification, and provide managers with powerful analytics.

You must build the application based on the detailed specifications outlined in the `README.md`, `docs/backend.json`, and `docs/ACHIEVEMENTS.md` files provided below. The final application must exactly match the features and architecture described.

**Core Requirements & Architecture:**

1.  **Tech Stack**:
    *   **Frontend**: Next.js 14 (App Router) with React 18 and TypeScript.
    *   **UI**: ShadCN UI components, styled with Tailwind CSS. Use Lucide Icons for iconography and Recharts for analytics charts.
    *   **Backend & Database**: Google Firebase, specifically Firestore for the database and Firebase Authentication for user sessions.
    *   **Generative AI**: Google Gemini integrated via Genkit for sentiment analysis of customer feedback.

2.  **Project Structure & Provided Documentation**:
    *   You will be provided with three key documents that define the entire application. You must adhere to them precisely.
        *   **`README.md`**: This is your primary specification. It details all core features, the user experience, and the overall vision.
        *   **`docs/backend.json`**: This file defines the exact data schemas for all entities (Store, Vehicle, Advisor, etc.) and the required Firestore collection structure. Your database implementation must match this structure.
        *   **`docs/ACHIEVEMENTS.md`**: This document lists every achievement, its category, and its description. Your gamification logic must implement these achievements.

3.  **Application Features (High-Level Summary from `README.md`):**
    *   **Multi-Store Fleet Management**: Secure login per store, with distinct "Advisor" and password-protected "Manager" roles.
    *   **Personalized "My Hub" Dashboard**: An advisor-centric view showing personal stats, recent vehicles, and achievement progress.
    *   **Advanced User Personalization**: A settings page allowing users to choose their avatar, theme (Light/Dark/High-Contrast), and default interface preferences (landing page, fleet view).
    *   **Gamification ("Hall of Fame")**: A global leaderboard, searchable public profiles for all advisors, and a comprehensive achievement system that correctly handles ties in rank.
    *   **Real-Time Fleet Tracking**: A live dashboard with multiple views (Grid, Compact, List) showing vehicle status, battery level, and overdue alerts.
    *   **Smart Checkout & Check-in**: A seamless workflow that includes rich feedback collection (text and 5-star rating) and AI-powered issue detection that automatically flags vehicles needing attention.
    *   **Drive Scheduling System**: A calendar and list view for scheduling future drives and preventing booking conflicts.
    *   **Advanced Analytics & Reporting**: A dedicated dashboard for managers with trend analysis and deep filtering capabilities.
    *   **Full Management & Administration**: Full CRUD (Create, Read, Update, Delete) operations for managers on vehicles and advisors, plus a store data reset feature.

**Execution Instructions:**

*   Begin by scaffolding the application with the specified tech stack.
*   Implement the data models and Firestore structure exactly as defined in `docs/backend.json`.
*   Build all user-facing features as detailed in `README.md`.
*   Implement the gamification logic based on the rules and descriptions in `docs/ACHIEVEMENTS.md`.
*   Ensure the final application is polished, responsive across all devices (desktop, tablet, mobile), and provides an excellent user experience.
