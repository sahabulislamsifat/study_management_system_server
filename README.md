# Collaborative Study Platform

Welcome to the **Collaborative Study Platform**, a web application designed to connect students, tutors, and administrators for seamless study session scheduling, resource sharing, and user management. This platform enhances collaboration, improves access to study materials, and ensures effective management of educational activities.

---

## Live Site URL

[Visit the Live Site](https://final-assignment-client.vercel.app)

---

## Admin Credentials

- **Admin Email:** `admin@session.com`
- **Admin Password:** `Admin@2025`

---

## Key Features

- **User Authentication:**

  - JWT-based authentication for secure login and session management.
  - Social login (Google, GitHub) with default student role assignment.
  - Role-based access control (Student, Tutor, Admin).

- **Homepage:**

  - Responsive design for mobile, tablet, and desktop views.
  - Banner section with a professional background image.
  - Study session cards with ongoing/closed status and detailed information.
  - Tutor section showcasing all tutors.

- **Student Dashboard:**

  - View booked study sessions with detailed information.
  - Create, update, and delete personal notes.
  - Access study materials (images and Google Drive links) for booked sessions.
  - Post reviews and ratings for study sessions.

- **Tutor Dashboard:**

  - Create study sessions with customizable fields.
  - View approved and rejected study sessions.
  - Upload study materials (images and Google Drive links) for approved sessions.
  - View, update, and delete uploaded materials.

- **Admin Dashboard:**

  - View and manage all users (update roles, search by name or email).
  - Approve or reject study sessions with feedback.
  - View and manage all study sessions and materials.
  - Remove inappropriate or outdated content.

- **Additional Features:**
  - Sweet alerts/toasts for CRUD operations and authentication.
  - TanStack Query for efficient data fetching (GET requests).
  - Pagination implemented on at least two pages.
  - Environment variables for Firebase and MongoDB credentials.
  - Responsive design for all devices, including the dashboard.

---

## Technologies Used

- **Frontend:** React.js, TanStack Query, Axios, SweetAlert2, React Router.
- **Backend:** Node.js, Express.js, MongoDB, JWT.
- **Authentication:** Firebase (Email/Password, Google, GitHub).
- **Styling:** Tailwind CSS or CSS (as per your choice).
- **Deployment:** Vercel (Frontend), Render/Heroku (Backend).

---

## Installation and Setup

1. **Clone the repositories:**

   - Client Side: `https://github.com/Programming-Hero-Web-Course4/b10a12-client-side-sahabulislamsifat`
   - Server Side: `https://github.com/Programming-Hero-Web-Course4/b10a12-server-side-sahabulislamsifat`

2. **Install dependencies:**

   - Navigate to the client and server directories and run:
     ```bash
     npm install
     ```

3. **Set up environment variables:**

   - Create a `.env` file in both client and server directories.
   - Add Firebase and MongoDB credentials.

4. **Run the application:**
   - Start the server:
     ```bash
     npm start
     ```
   - Start the client:
     ```bash
     npm start
     ```

---

## GitHub Commits

- **Client Side:** 20+ notable commits.
- **Server Side:** 12+ notable commits.

---

## Challenges Implemented

- **TanStack Query:** Used for all data fetching (GET requests).
- **JWT Authentication:** Implemented for email/password and social login.
- **Pagination:** Added on at least two pages.
- **Admin Rejection Feedback:** Modal popup for rejection reason and feedback.
- **Tutor Dashboard:** Tutors can view rejection reasons and feedback.

---

## Optional Features

- Axios interceptor implemented.
- Admin announcement system with a public route for announcements.
- Student dashboard route to show classmates for booked study sessions.

---

## Screenshots

(Add screenshots of your application here if needed.)

---

## Contributors

- [Your Name](https://github.com/sahabulislamsifat)

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
