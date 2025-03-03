# LearnEnglish

- **Live Site URL:** [LearnEnglish](https://learn-english-e286d.web.app)

- **Client Repository:** [Client](https://github.com/mstsurnalyakter/learn_english_client)

## Features
1. **User Registration:** Users can sign up as students, tutors, or administrators.
2. **User Login:** Secure JWT-based authentication with social login options using Google and GitHub.
3. **Role-Based Access Control:** Middleware to ensure only authorized users can access specific endpoints.
4. **Responsive Design:** Fully responsive layout for mobile, tablet, and desktop views.
5. **Tutor Management:** Tutors can create, update, and manage study sessions and materials.
6. **Admin Dashboard:** Admins can view and manage all users, study sessions, and materials, and approve or reject study sessions.
7. **Session Reviews:** Students can leave reviews and ratings for study sessions they attended.
8. **Note Taking:** Students can create, update, and delete personal notes.
9. **Study Materials:** Access to study materials categorized by booked sessions.
10. **Material Downloads:** Option to download study materials for offline use.
11. **Payment Integration:** Secure payment processing for paid sessions.
12. **Session Status:** Real-time status updates for session approval and booking.

## Overview
The LearnEnglish is designed to connect students, tutors, and administrators to streamline study session scheduling, resource sharing, and user management. By integrating these functionalities into a single platform, we aim to enhance collaboration, improve access to study materials, and ensure effective management of educational activities.


## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- MongoDB
- npm or yarn

### Installation

1. Client side repository:

    a. Clone
    ```sh
    git clone https://github.com/mstsurnalyakter/learn_english_server
    cd learn_english_server
    ```

    b. Install server dependencies:

    ```sh
    npm install
    ```

#### Server Configuration

Create a `.env` file in the `server` directory with the following environment variables:

```env
DB_USER=
DB_PASS=
ACCESS_TOKEN_SECRET=
STRIPE_SECRET_KEY=
```

### Run the server:

```sh
    node index.js
```
