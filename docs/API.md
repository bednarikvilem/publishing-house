# API contract

This file contain a list of API calls utilized in the system along with their definition.

## Authorization

### POST /api/auth/register

Register a new user account. On success, sends a confirmation email and
returns the created user. The new user is assigned the REGISTERED_USER
role automatically.

**Auth required:** No

**Request body:**
```json
{
    "newspaper_id": "4dfsa..",
    "email": "jan.novak@example.com",
    "username": "jannovak",
    "full_name": "Jan Novák",
    "password": "securePassword123"
}
```
Field rules:
```
┌───────────────┬──────────┬──────────────────────────────────────────────────────────┐
│   Field       │ Required │                  Notes                                   │
├───────────────┼──────────┼──────────────────────────────────────────────────────────┤
│ newspaper_id  │ yes      │ newspaper uuid, valid uuid of a newspaper                │
├───────────────┼──────────┼──────────────────────────────────────────────────────────┤
│ email         │ yes      │ (email, newspaper_id) must be unique, valid email format │
├───────────────┼──────────┼──────────────────────────────────────────────────────────┤
│ username      │ yes      │ (username, newspaper_id) must be unique                  │
├───────────────┼──────────┼──────────────────────────────────────────────────────────┤
│ full_name     │ no       │ display name                                             │
├───────────────┼──────────┼──────────────────────────────────────────────────────────┤
│ password      │ yes      │ min 8 characters, stored as bcrypt hash                  │
└───────────────┴──────────┴──────────────────────────────────────────────────────────┘
```
**Responses:**
`201 Created`
```json
{
    "id": "b3d2a1f0-...",
    "email": "jan.novak@example.com",
    "username": "jannovak",
    "full_name": "Jan Novák",
    "email_verified": false
}
```
`409 Conflict` — email or username already taken
```json
{ "error": "EMAIL_TAKEN" }
```

`422 Unprocessable Entity` — validation failed
```json
{
    "error": "VALIDATION_ERROR",
    "fields": { "password": "Must be at least 8 characters" }
}
```
Side effects:
- Sends a confirmation email to the provided address
- Creates an audit log entry (operation: USER_REGISTER)

### POST /api/auth/verify-email

The email contains a link like https://your-site.com/verify-email?token=<token>. The frontend extracts the token and calls:

**Auth required:** No

**Request body:**

```json
{ "token": "a7f3c2..." }
```
**Responses:**

`200 OK` — account activated, user can now log in
```json
{ "message": "Email verified successfully" }
```

`400 Bad Request` — invalid token
```json
{ "error": "INVALID_TOKEN" }
```

### POST /api/auth/login

Authenticate a user within a specific newspaper. Returns a JWT token to be
included in the Authorization header of subsequent requests.

**Auth required:** No

**Request body:**
```json
{
    "newspaper_id": "d4e5f6...",
    "email": "jan.novak@example.com",
    "password": "securePassword123"
}
```
Field rules:
```
┌──────────────┬──────────┬────────────────────────────────────────┐
│    Field     │ Required │                 Notes                  │
├──────────────┼──────────┼────────────────────────────────────────┤
│ newspaper_id │ yes      │ identifies which newspaper to log into │
├──────────────┼──────────┼────────────────────────────────────────┤
│ email        │ yes      │                                        │
├──────────────┼──────────┼────────────────────────────────────────┤
│ password     │ yes      │                                        │
└──────────────┴──────────┴────────────────────────────────────────┘
```
**Responses:**
`200 OK`
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": "b3d2a1f0-...",
        "email": "jan.novak@example.com",
        "username": "jannovak",
        "full_name": "Jan Novák",
        "roles": ["REGISTERED_USER"]
    }
}
```
`401 Unauthorized` — wrong email or password
```json
{ "error": "INVALID_CREDENTIALS" }
```

`403 Forbidden` — email not yet verified
```json
{ "error": "EMAIL_NOT_VERIFIED" }
```

`404 Not Found` — newspaper does not exist
```json
{ "error": "NEWSPAPER_NOT_FOUND" }
```

### POST /api/auth/logout

Invalidate the current token and log the user out.

### POST /api/auth/forgot-password - optional

Send a password reset link to the user's email address.

### POST /api/auth/reset-password - optional

Set a new password using the token received in the reset email.

### POST /api/auth/resend-verification - optional

Resend the email verification link to the user's email address.

## User Profile

### GET /api/users/me

Return the profile of the currently authenticated user.

### PUT /api/users/me

Update the profile of the currently authenticated user (username, full name, password).

## Authors

### GET /api/newspapers/:newspaper_id/authors/:author_id

Return the public profile of an author including biography, profile picture, and list of published articles.

## Newspaper Articles

### GET /api/newspapers/:newspaper_id/articles

Returns a paginated list of published articles for a newspaper, sorted by
publication date descending. Used to populate the homepage.

**Auth required:** No

**URL parameters:**
| Parameter     | Description                  |
|---|---|
| newspaper_id  | UUID of the newspaper        |

**Query parameters:**
| Parameter | Type    | Required | Default | Description                        |
|---|---|---|---|---|
| page      | integer | no       | 1       | Page number                        |
| limit     | integer | no       | 20      | Articles per page (max 50)         |
| category  | string  | no       | —       | Filter by category name            |

**Responses:**
 `200 OK`:
```json
  {
    "data": [
    {
        "id": "a1b2c3...",
        "title": "Breaking Article",
        "perex": "Short introduction",
        "publication_date": "2026-04-10T08:00:00Z",
        "category": "Sport",
        "keywords": ["football", "UEFA"],
        "primary_image": {
          "url": "https://...",
          "caption": "Image caption"
        },
        "author": {
          "id": "u1u2u3...",
          "full_name": "Andy Anderson",
          "profile_picture": "https://..."
        }
    }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 84,
        "total_pages": 5
    }
  }
```
`404 Not Found` — newspaper does not exist
```json
{ "error": "NEWSPAPER_NOT_FOUND" }
```

### GET /api/newspapers/:newspaper_id/articles/:article_id

Returns the full content of a single published article.

**Auth required:** Yes — `REGISTERED_USER` or above within this newspaper

**URL parameters:**
```
| Parameter     | Description           |
|---------------|-----------------------|
| newspaper_id  | UUID of the newspaper |
| article_id    | UUID of the article   |
```

**Headers:**
Authorization: Bearer

**Responses:**

`200 OK`:
```json
{
    "id": "a1b2c3...",
    "title": "První článek",
    "perex": "Krátký úvod do článku...",
    "content": "Plný text článku...",
    "publication_date": "2026-04-10T08:00:00Z",
    "category": "Technology",
    "keywords": ["bun", "typescript"],
    "likes_count": 42,
    "liked_by_me": true,
    "author": {
        "id": "u1u2u3...",
        "full_name": "Jan Novák",
        "profile_picture": "https://..."
    },
    "images": [
        {
        "url": "https://...",
        "caption": "Image caption",
        "is_primary": true
        }
    ],
    "comments": [
        {
        "id": "c1c2c3...",
        "content": "Skvělý článek!",
        "created_at": "2026-04-10T09:00:00Z",
        "author": {
            "id": "u4u5u6...",
            "username": "petrnovak"
        }
        }
    ]
}
```

`401 Unauthorized` — no token provided
``` json
{ "error": "UNAUTHORIZED" }
```
`403 Forbidden` — token is valid but user belongs to a different newspaper
``` json
{ "error": "FORBIDDEN" }
```
`404 Not Found` — article does not exist or is not published
```json
{ "error": "ARTICLE_NOT_FOUND" }
```

### POST /api/newspapers/:newspaper_id/articles

Create a new article draft. Auth required: `AUTHOR`.

### PUT /api/newspapers/:newspaper_id/articles/:article_id

Edit an existing draft. Auth required: `AUTHOR` (own articles only).

### DELETE /api/newspapers/:newspaper_id/articles/:article_id

Delete an article. Auth required: `AUTHOR` (own articles) or `SYSTEM_ADMINISTRATOR`.

### POST /api/newspapers/:newspaper_id/articles/:article_id/submit

Submit a draft for editorial review. Auth required: `AUTHOR` (own articles only).

### POST /api/newspapers/:newspaper_id/articles/:article_id/images

Upload an image for an article. Auth required: `AUTHOR` (own articles only).

### DELETE /api/newspapers/:newspaper_id/articles/:article_id/images/:image_id

Remove an image from an article. Auth required: `AUTHOR` (own articles only).

### POST /api/newspapers/:newspaper_id/articles/:article_id/review

Submit a review decision (approve / reject / request revision) for an article. Auth required: `EDITOR`.

### POST /api/newspapers/:newspaper_id/articles/:article_id/assign-editor

Assign an editor to an article. Auth required: `NEWSPAPER_MANAGER`.

### POST /api/newspapers/:newspaper_id/articles/:article_id/approve

Approve an article — advances the article to the next state based on the caller's role (`NEWSPAPER_MANAGER` or `DIRECTOR`).

### POST /api/newspapers/:newspaper_id/articles/:article_id/schedule

Set the publication date for an approved article. Auth required: `NEWSPAPER_MANAGER`.

## Categories

### GET /api/newspapers/:newspaper_id/categories

Return all categories for a newspaper. Auth required: No.

### POST /api/newspapers/:newspaper_id/categories

Create a new category. Auth required: `NEWSPAPER_MANAGER`.

### DELETE /api/newspapers/:newspaper_id/categories/:category_id

Delete a category. Fails if any articles are assigned to it. Auth required: `NEWSPAPER_MANAGER`.

## Comments

### POST /api/newspapers/:newspaper_id/articles/:article_id/comments

Post a comment on an article. Auth required: `REGISTERED_USER`.

## Likes

### POST /api/newspapers/:newspaper_id/articles/:article_id/likes

Like an article. Auth required: `REGISTERED_USER`.

### DELETE /api/newspapers/:newspaper_id/articles/:article_id/likes

Remove a like from an article. Auth required: `REGISTERED_USER`.

## Newspapers

### GET /api/newspapers

Return all newspapers in the publishing house. Auth required: `DIRECTOR`.

## System Administration

### GET /api/newspapers/:newspaper_id/users

Return all users registered in a newspaper. Auth required: `SYSTEM_ADMINISTRATOR`.

### POST /api/newspapers/:newspaper_id/users/:user_id/roles

Assign a role to a user within a newspaper. Auth required: `SYSTEM_ADMINISTRATOR`.

### DELETE /api/newspapers/:newspaper_id/users/:user_id/roles/:role

Remove a role from a user within a newspaper. Auth required: `SYSTEM_ADMINISTRATOR`.
