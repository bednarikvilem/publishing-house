# Use Case Specification

This document lists the use cases for the Newspaper Website project.

## 1. Visitor & Registered User Use Cases

### Registration & Authentication
*   **UC1: Register Account** - Create a new account; includes email confirmation.
*   **UC2: Log In / Log Out** - Authenticate or terminate a session.
*   **UC3: Reset Password** - Request a password reset link via email.

### Content Consumption
*   **UC4: Browse Articles** - View the homepage and recent articles.
*   **UC5: View Article** - Visitors can see the preview (perex); registered users can see full content.
*   **UC6: Search Articles** - Search by keyword, title, author, category, or publication date.
*   **UC7: Filter Articles by Category** - View a list of articles belonging to a specific category.
*   **UC8: View Author Profile** - View an author's name, biography, photo, and list of published articles.

### Interaction
*   **UC9: Post Comment** - Add comments to articles or reply to existing comments (Registered Users only).
*   **UC10: React to Article** - Add or remove a reaction (Registered Users only).
*   **UC11: View Own Profile** - Access and view personal user profile data.

## 2. Author Use Cases

### Article Creation & Editing
*   **UC12: Create Article Draft** - Initialize a new article entry.
*   **UC13: Edit Article Draft** - Modify title or content.
*   **UC14: Upload Images to Article** - Add images to an unpublished article (at least one image is mandatory before submission).
*   **UC15: Assign Categories and Keywords** - Categorize and tag articles for better searchability.
*   **UC16: Delete Own Article** - Remove an author's own unpublished articles.

### Workflow Management
*   **UC17: Submit Article for Review** - Change article state from Draft to Submitted for editorial review.
*   **UC18: View Status of Own Articles** - Monitor the workflow progress (Draft, Submitted, In Review, Approved, etc.).

### Profile Management
*   **UC19: Update Author Bio and Picture** - Mandatory profile completion required upon first login after being assigned the Author role.

## 3. Editorial & Management Use Cases

### Editor
*   **UC20: Review Assigned Articles** - Access a list of submitted articles assigned for review.
*   **UC21: Evaluate Article** - Perform one of three actions: Approve (forward to Manager), Reject (with feedback), or Request Revision (return to Author).

### Newspaper Manager
*   **UC22: Assign Editor to Article** - Assign a specific Editor to a submitted article (state moves to In Review).
*   **UC23: Final Editorial Approval** - Approve an article that has already been reviewed by an Editor.
*   **UC24: Schedule Article Publication** - Set a future date and time for an approved article to go live.
*   **UC25: Manage Newspaper Categories** - Create new categories or delete existing ones (only if they contain no articles).

### Director
*   **UC26: Approve Newspaper for Publication** - Final approval gate for the publishing house.
*   **UC27: Monitor Publication Statistics** - Review metrics such as article counts, comment volume, and editor performance.
*   **UC28: Manage Newspaper Portfolio** - Oversee and manage multiple newspapers within the publishing house.

## 4. System Administrator Use Cases

### User Management
*   **UC29: Assign/Remove User Roles** - Elevate registered users to roles like Author, Editor, Manager, Director, or Admin.

### System Maintenance
*   **UC30: Moderate Comments** - Delete inappropriate comments or manage discussions.
*   **UC31: Delete Any Article** - Administrative removal of any article regardless of its state or owner.
*   **UC32: Manage System Configuration** - Update global platform settings.

### Oversight
*   **UC33: Review Audit Logs** - Inspect the chronological record of all system operations, including timestamps, user IDs, and results.
