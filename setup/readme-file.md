# Angular 18 Chat Application with Firebase

A real-time chat application built with Angular 18 and Firebase Firestore featuring both public and private messaging.

## Features

- User authentication with user selection or creation
- Public chat room for all users
- Private messaging between users
- Real-time message updates with Firebase Firestore
- User online/offline status tracking
- Clean, responsive UI with status indicators
- Message timestamps and read receipts
- Modern UI with animations
- Auto-scroll to latest messages
- Standalone components architecture

## How It Works

1. **User Authentication**:
   - Users can create a new profile or select an existing user
   - User status (online/offline) is tracked in real-time

2. **Public Chat**:
   - By default, all messages are sent to the public chat
   - All online users can see these messages

3. **Private Messaging**:
   - Click on a user in the sidebar to start a private conversation
   - Messages are only visible to the sender and recipient
   - Private messages are indicated with a special style

4. **Real-time Updates**:
   - All messages and user statuses update instantly across all clients
   - Firebase Firestore provides automatic synchronization

## Data Structure

The application uses Firestore with two main collections:

1. **users** - Stores user information:
   - User name
   - Online status
   - Last active timestamp 
   - Avatar color

2. **messages** - Stores all messages:
   - Message text
   - Sender name
   - Recipient name (or "everyone" for public chat)
   - Timestamp
   - Flag indicating if the message is private

## Prerequisites

- Node.js (v18.x or later)
- npm (v9.x or later)
- Firebase account (free tier is sufficient)

## Installation

1. Install Angular CLI globally (if not already installed):

```bash
npm install -g @angular/cli
```

2. Clone this repository or create a new Angular project:

```bash
# Option 1: Start from scratch
ng new angular-chat-app
cd angular-chat-app

# Option 2: Clone repository (if available)
# git clone <repository-url>
# cd angular-chat-app
```

3. Install dependencies including Firebase:

```bash
npm install
npm install @angular/fire firebase
```

4. Set up Firebase:

- Create a Firebase project at https://console.firebase.google.com/
- Add a web app to your Firebase project
- Enable Firestore database in your Firebase project
- Copy your Firebase configuration to `src/app/firebase-config.ts`
- Setup Firestore collections: `users` and `messages`

## Project Structure

The application is organized as follows:

```
src/
├── app/
│   ├── components/
│   │   ├── chat/
│   │   │   └── chat.component.ts
│   │   ├── message-list/
│   │   │   └── message-list.component.ts
│   │   ├── message-input/
│   │   │   └── message-input.component.ts
│   │   └── user-list/
│   │       └── user-list.component.ts
│   ├── services/
│   │   └── chat.service.ts
│   ├── app.component.ts
│   ├── app.routes.ts
│   └── ...
└── ...
```

## Development Server

Run the development server:

```bash
ng serve
```

Navigate to `http://localhost:4200/` in your browser. The application will automatically reload if you change any of the source files.

## Building for Production

To build the application for production:

```bash
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## Extending the Application

### Authentication

The current implementation does not include user authentication. To add authentication:

1. Enable Authentication in your Firebase project
2. Implement login/signup components
3. Update Firestore security rules to require authentication
4. Add user profile management

### Additional Features

You can extend this application with:

### Possible Enhancements

- Message read receipts
- Typing indicators
- Image and file sharing
- User profiles
- Group chats
- Message search functionality
- Notifications
- Emoji support

## Angular 18 Features Used

- Standalone components (default in Angular 18)
- Simplified imports
- Modern control flow with @for, @if, etc.
- Improved performance with signals (can be implemented)
- Lightweight architecture

## License

MIT
