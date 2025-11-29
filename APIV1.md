# Social Network API Documentation

## 1. File Handlers

### Get Protected File

Retrieves a protected file (like a private post image or message attachment) if the user is authorized to see it.

- **Method**: `GET`
- **URL**: `/api/file`
- **Authentication**: Required
- **Request**:
  - **Query Parameters**:
    - `filetype`: string (e.g., "avatar", "post", "message", "comment")
    - `path`: string (The relative path to the file, e.g., "uploads/Posts/image.png")
- **Response**:
  - **Success (200)**: Binary file content.
  - **Error**:
    ```json
    {
      "error": "Unauthorized access to file"
    }
    ```

### Upload File

Uploads a file to the server.

- **Method**: `POST`
- **URL**: `/api/upload-file`
- **Authentication**: Required (except for `type="avatar"` during registration)
- **Request**:
  - **Body (multipart/form-data)**:
    - `type`: string ("avatar", "post", "message", "comment")
    - `file`: file object
- **Response**:
  - **Success (200)**:
    ```json
    {
      "avatarUrl": "/uploads/Avatars/uuid.png"
      // Key changes based on type: "postUrl", "messageImageUrl", "commentImageUrl"
    }
    ```
  - **Error**:
    ```json
    {
      "error": "Unsupported file type"
    }
    ```

---

## 2. User Handlers

### Register User

Creates a new user account.

- **Method**: `POST`
- **URL**: `/api/register`
- **Authentication**: No
- **Request**:
  - **Body (JSON)**:
    ```json
    {
      "email": "user@example.com",
      "password": "securePassword123",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-01",
      "nickname": "johndoe", // Optional
      "aboutMe": "Hello world",
      "gender": "Male", // "Male", "Female", "Other"
      "avatarUrl": "/uploads/Avatars/default.jpg"
    }
    ```
- **Response**:
  - **Success (201)**:
    ```json
    {
      "message": "User registered successfully"
    }
    ```
  - **Error**:
    ```json
    {
      "error": "User already exists"
    }
    ```

### Update User

Updates the current user's profile information.

- **Method**: `PUT`
- **URL**: `/api/user/update`
- **Authentication**: Required
- **Request**:
  - **Body (JSON)**:
    ```json
    {
      "id": "1",
      "firstName": "John",
      "lastName": "Doe",
      "nickname": "johnny",
      "email": "john@example.com",
      "dateOfBirth": "1990-01-01",
      "avatar": "/uploads/Avatars/new.jpg",
      "aboutMe": "Updated bio",
      "isPrivate": false,
      "url": "johnny"
    }
    ```
- **Response**:
  - **Success (200)**:
    ```json
    {
      "success": true,
      "user": { ...UserData... }
    }
    ```

---

## 3. Notification Handlers

### Get Notifications

Retrieves all notifications for the current user.

- **Method**: `GET`
- **URL**: `/api/notifications`
- **Authentication**: Required
- **Response**:
  - **Success (200)**:
    ```json
    [
      {
        "id": 1,
        "type": "follow",
        "content": "Follow",
        "isRead": false,
        "timestamp": "2023-10-27T10:00:00Z",
        "user": {
          "id": 2,
          "name": "Jane Doe",
          "avatar": "/uploads/Avatars/jane.jpg"
        }
      }
    ]
    ```

### Mark Notification as Read

Marks a specific notification as read.

- **Method**: `PUT`
- **URL**: `/api/mark-notification-as-read/{id}`
- **Authentication**: Required
- **Response**:
  - **Success (200)**: Empty body.

### Mark All Notifications as Read

Marks all notifications for the current user as read.

- **Method**: `PUT`
- **URL**: `/api/mark-all-notification-as-read`
- **Authentication**: Required
- **Response**:
  - **Success (200)**: Empty body.

### Delete Notification

Deletes a specific notification.

- **Method**: `DELETE`
- **URL**: `/api/delete-notification/{id}`
- **Authentication**: Required
- **Response**:
  - **Success (200)**: Empty body.

---

## 4. WebSocket Handlers

### WebSocket Connection

Establishes a WebSocket connection for real-time updates (chat, notifications).

- **Method**: `GET`
- **URL**: `/ws`
- **Authentication**: Required (Session cookie)
- **Response**: Upgrades to WebSocket protocol.

---

## 5. Auth Handlers

### Login

Authenticates a user and sets a session cookie.

- **Method**: `POST`
- **URL**: `/api/login`
- **Authentication**: No
- **Request**:
  - **Body (JSON)**:
    ```json
    {
      "identifier": "user@example.com", // Email or Nickname
      "password": "password123"
    }
    ```
- **Response**:
  - **Success (200)**:
    ```json
    {
      "user": { ...UserData... }
    }
    ```

### Check Logged Status

Checks if the user is currently logged in based on the session cookie.

- **Method**: `POST`
- **URL**: `/api/logged`
- **Authentication**: No (Checks cookie internally)
- **Response**:
  - **Success (200)**:
    ```json
    {
      "user": { ...UserData... }, // or nil
      "loggedIn": true // or false
    }
    ```

### Logout

Invalidates the user's session.

- **Method**: `POST`
- **URL**: `/api/logout`
- **Authentication**: Required
- **Response**:
  - **Success (200)**:
    ```json
    {
      "message": "logged out"
    }
    ```

---

## 6. Follow Handlers

### Follow User

Follows another user.

- **Method**: `POST`
- **URL**: `/api/follow`
- **Authentication**: Required
- **Request**:
  - **Body (JSON)**:
    ```json
    {
      "follower": "1", // Current User ID
      "following": "2" // Target User ID
    }
    ```
- **Response**:
  - **Success (200)**: `{"message": "followed successfully"}`

### Unfollow User

Unfollows a user.

- **Method**: `POST`
- **URL**: `/api/unfollow`
- **Authentication**: Required
- **Request**: Same as Follow User.
- **Response**: `{"message": "unfollowed successfully"}`

### Send Follow Request

Sends a follow request to a private user.

- **Method**: `POST`
- **URL**: `/api/send-follow-request`
- **Authentication**: Required
- **Request**: Same as Follow User.
- **Response**: `{"message": "Follow request sent"}`

### Accept Follow Request

Accepts a pending follow request.

- **Method**: `POST`
- **URL**: `/api/accept-follow-request/{notification_id}`
- **Authentication**: Required
- **Request**: Same as Follow User.
- **Response**: `{"message": "follow request accepted"}`

### Decline Follow Request

Declines a pending follow request.

- **Method**: `POST`
- **URL**: `/api/decline-follow-request/{notification_id}`
- **Authentication**: Required
- **Request**: Same as Follow User.
- **Response**: `{"message": "follow request declined"}`

### Cancel Follow Request

Cancels a sent follow request.

- **Method**: `POST`
- **URL**: `/api/cancel-follow-request`
- **Authentication**: Required
- **Request**: Same as Follow User.
- **Response**: `{"message": "follow request cancelled"}`

### Get Followers

Retrieves the list of followers for the current user.

- **Method**: `GET`
- **URL**: `/api/get-followers`
- **Authentication**: Required
- **Response**:
  - **Success (200)**:
    ```json
    [
      {
        "id": "2",
        "firstName": "Jane",
        "lastName": "Doe",
        "username": "janedoe",
        "avatar": "/uploads/Avatars/jane.jpg"
      }
    ]
    ```

---

## 7. Profile Handlers

### Get Profile

Retrieves a user's profile by their custom URL/Username.

- **Method**: `GET`
- **URL**: `/api/profile/{url}`
- **Authentication**: Required
- **Response**:
  - **Success (200)**:
    ```json
    {
      "user": { ...UserData... },
      "posts": [ ...Post... ],
      "followers": 10,
      "following": 5,
      "isfollowing": true,
      "isfollower": false
    }
    ```

### Get Me

Retrieves the current logged-in user's profile data.

- **Method**: `GET`
- **URL**: `/api/me`
- **Authentication**: Required
- **Response**:
  - **Success (200)**: `{ ...UserData... }`

---

## 8. Post Handlers

### Create Post

Creates a new post.

- **Method**: `POST`
- **URL**: `/api/create-post`
- **Authentication**: Required
- **Request**:
  - **Body (JSON)**:
    ```json
    {
      "content": "This is my new post",
      "image": "/uploads/Posts/img.jpg", // Optional
      "privacy": "public", // "public", "private", "almost-private"
      "selectedFollowers": ["2", "3"] // Required if privacy is "private"
    }
    ```
- **Response**:
  - **Success (201)**: `{ ...Post... }`

### Get Posts

Retrieves the feed of posts visible to the current user.

- **Method**: `GET`
- **URL**: `/api/get-posts`
- **Authentication**: Required
- **Response**:
  - **Success (200)**:
    ```json
    {
      "posts": [ ...Post... ],
      "user": { "userID": 1 }
    }
    ```

---

## 9. Comment Handlers

### Create Comment

Adds a comment to a post.

- **Method**: `POST`
- **URL**: `/api/create-comment`
- **Authentication**: Required
- **Request**:
  - **Body (JSON)**:
    ```json
    {
      "postId": 123,
      "content": "Nice post!",
      "type": "text" // or "image" if supported
    }
    ```
- **Response**:
  - **Success (200)**: `{ ...Comment... }`

### Get Comments

Retrieves all comments for a specific post.

- **Method**: `GET`
- **URL**: `/api/get-comments/{postID}`
- **Authentication**: Required
- **Response**:
  - **Success (200)**: `[ ...Comment... ]`

---

## 10. Message Handlers

### Get Chat Users

Retrieves a list of users the current user has chatted with.

- **Method**: `GET`
- **URL**: `/api/get-users`
- **Authentication**: Required
- **Response**:
  - **Success (200)**:
    ```json
    [
      {
        "id": 1, // Chat ID
        "name": "Jane Doe",
        "userId": 2,
        "username": "janedoe",
        "avatar": "...",
        "isOnline": true
      }
    ]
    ```

### Make Chat

Creates a new chat session with another user.

- **Method**: `POST`
- **URL**: `/api/make-chat/{otherUserID}`
- **Authentication**: Required
- **Response**:
  - **Success (200)**: `123` (The new Chat ID)

### Send Message

Sends a message to a specific chat.

- **Method**: `POST`
- **URL**: `/api/send-message/{chatID}`
- **Authentication**: Required
- **Request**:
  - **Body (JSON)**:
    ```json
    {
      "content": "Hello!",
      "type": "text" // "text" or "emoji"
    }
    ```
- **Response**:
  - **Success (200)**: `{ ...Message... }`

### Get Messages

Retrieves the message history for a specific chat.

- **Method**: `GET`
- **URL**: `/api/get-messages/{chatID}`
- **Authentication**: Required
- **Response**:
  - **Success (200)**: `[ ...Message... ]`
