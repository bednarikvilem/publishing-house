# API contract

This file contain a list of API calls utilized in the system along with their definition.

## Users

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

  Responses:
  201 Created
  ```json
  {
    "id": "b3d2a1f0-...",
    "email": "jan.novak@example.com",
    "username": "jannovak",
    "full_name": "Jan Novák",
    "email_verified": false
  }
  ```
  409 Conflict — email or username already taken
  ```json
  { "error": "EMAIL_TAKEN" }
  ```

  422 Unprocessable Entity — validation failed
  ```json
  {
    "error": "VALIDATION_ERROR",
    "fields": { "password": "Must be at least 8 characters" }
  }
  ```
  Side effects:
  - Sends a confirmation email to the provided address
  - Creates an audit log entry (operation: USER_REGISTER)

