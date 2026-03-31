# Blueprint: Smart Office - Visitor Management System

## **1. Project Overview**

This project aims to build a comprehensive smart office management platform. The initial phase focuses on developing a "Visitor Pre-registration and Parking Application" to streamline the visitor check-in process, eliminating the need for manual, on-site registration.

---

## **2. Core Features & Design**

### **Phase 1: Visitor Registration Form**

*   **Functionality:** A web-based form for internal employees or external visitors to submit visit details in advance.
    *   **Input Fields:** Visitor Name, Company, Contact, Car Plate Number, Visit Date & Time, Host Employee Name.
    *   **Action:** A "Submit Application" button that captures the form data. The data will be stored in a Firebase Firestore database.
*   **Design Philosophy:**
    *   **Aesthetics:** A modern, clean, and professional user interface that is intuitive and easy to navigate.
    *   **Color Palette:** A primary theme of blues and grays to convey trust and stability, with accent colors for interactive elements.
    *   **Typography:** Clear, legible fonts with a strong hierarchy to guide the user's attention (e.g., large hero title, clear labels).
    *   **Layout:** A responsive, mobile-first design that ensures a seamless experience on both desktop and mobile devices. A centered, single-column layout for the form to minimize distractions.
    *   **Visuals:** Use of subtle drop shadows on the form container to create a sense of depth and focus.

---

## **3. Current Development Plan**

**Objective:** Integrate Firebase to store visitor registration data.

1.  **Configure Firebase:** Set up the necessary Firebase configuration files and add the Firebase SDK scripts to the project to enable database communication.
2.  **`firebase-config.js`:** Create a dedicated module to initialize the Firebase application. This will keep the configuration details separate and organized.
3.  **`index.html`:** Update the main HTML file to include the Firebase SDKs for core functionality and the Firestore database.
4.  **`main.js` (Web Component):** Modify the `visitor-registration-form` component.
    *   Import the Firebase database instance from `firebase-config.js`.
    *   Update the `_handleSubmit` method: instead of logging to the console, it will now save the submitted form data to a `visitRequests` collection in the Firestore database.
    *   Provide clear user feedback upon successful submission.
5.  **GitHub Sync:** Commit and push all changes to the remote repository.
