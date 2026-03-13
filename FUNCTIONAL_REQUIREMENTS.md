# Newspaper Website - Functional Requirements

## 0. Introduction

This document describes the functional requirements for a web-based
newspaper platform. 

------------------------------------------------------------------------

## 1. Overview

The system is a web-based platform for publishing newspapers and articles.
Users can browse articles, search for content, and interact with articles through comments and likes.
Authors can create and manage articles, while editorial staff review and approve them before publication.
The platform supports multiple newspapers managed within a publishing house

Email communication is required for:
- Registration confirmation
- Article approval/rejection notifications
- Password reset

Subscription payments are not required; creating an account is sufficient

## 2. User Roles and Permissions

The system supports the following roles (higher roles inherit permissions of lower roles):

Visitor
Registered User (base for all other roles)
Author
Editor
Newspaper Manager
Director
System Administrator

Note: Roles are assigned by the System Administrator. Once a role is assigned, the user interface adapts to the new role after login.

## 3. Role Definitions

### 3.1 Visitor

A visitor is any user who accesses the website without authentication.

A visitor shall be able to:
- Create an account
- Log in
- View the homepage
- Browse published articles
- View the articles previews
- View articles by category
- Search for articles

A visitor shall not be able to:
- Read full articles restricted to subscribers
- Comment on articles
- Like articles

### 3.2 Registred User

A registered user has a valid account.

A registred user shall be able to:
- Log in and log out
- Browse articles
- Read full articles
- Leave comments on articles
- Like or unlike articles
- View their own profile

### 3.3 Author

An author is a registered user who can create and manage articles.

An author shall be able to:
- Access the author panel
- Create new articles
- Submit articles for editorial review
- Edit their own articles
- Delete their own articles
- Upload images for articles
- Assign categories to articles
- View a list of their articles
- View the status of their articles

Authors cannot publish articles directly.

### 3.4 Editor

An editor reviews articles submitted by authors.

An editor shall be able to:
- View submitted articles
- Edit submitted articles
- Approve articles
- Reject articles with feedback
- Request revisions from authors

Approved articles proceed to the Newspaper Manager.

### 3.5 Newspaper Manager

A newspaper manager supervises a specific newspaper.

A newspaper manager shall be able to:
- Manage articles belonging to their newspaper
- Approve editor-reviewed articles
- Schedule articles for publication
- Assign editors to articles
- Manage categories for their newspaper

Difference vs Director:
- The Newspaper Manager acts at the level of a single newspaper
- They make operational editorial decisions (article approval, scheduling, editor assignment)

### 3.6 Director

A director oversees the publishing house and approves final publication.

A director shall be able to:
- Approve newspapers for publication (final step) 
- Manage multiple newspapers (e.g., view and oversee all newspapers under the publishing house)
- Review publication statistics (optional: number of published articles, total comments, likes, editor performance)
- Make high-level editorial decisions (e.g., approving changes in categories, assigning managers, setting publication policies)

### 3.7 System Administrator

The system administrator manages the technical platform.

An administrator shall be able to:
- Assign roles to registered users (no need to create user accounts; users self-register)
- Add or remove authors and editors
- Create and manage categories
- Delete any article
- Manage system configuration
- Moderate comments

------------------------------------------------------------------------

## 4. Article Management

The system shall allow authors to create and manage articles.

Each article shall exist in one of the following states:
- Draft
- Submitted
- Under review
- Approved by Editor
- Approved by Manager
- Published 
- Rejected (Optional)

Workflow:
- Author creates article -> Draft
- Author submits article -> Submitted
- Editor reviews article -> Under Review
- Editor approves -> Approved by Editor
- Manager approves -> Approved by Manager
- Article becomes Published
- Rejected articles return to the author for editing.

------------------------------------------------------------------------

## 5. Article Structure

The system shall allow authors and editors to manage articles.

The system shall:
- Allow article creation with:
    - Title
    - Text content
    - Images
    - Categories
- Store publication date
- Store author information
- Store article status
- Track revision history

Each article shall include:
- Title
- Author
- Publication date
- Category
- Article content
- Images (Optional)
- Comments
- Number of likes

------------------------------------------------------------------------

## 6. Article Viewing

Visitors and subscribers shall be able to read articles.

The system shall:
- Display recent articles on the homepage
- Display article previews
- Display full article content
- Show:
    - author name
    - publication date
    - category
- Display article images
- Provide navigation to related article


------------------------------------------------------------------------

## 7. Categories

Articles shall be organized into categories.

The system shall allow:
- Creation of categories
- Editing of categories
- Deleting categories (only if empty)

Example categories:
- Politics
- Technology
- Sports
- Culture
- Pokémon Go
- Yu-Gi-Oh!

------------------------------------------------------------------------

## 8. Author Pages

Each author shall have a profile page.

The system shall display:
- Author name
- Author biography
- List of published articles 
- Profile picture (Optional)

------------------------------------------------------------------------

## 9. Comments

Subscribers shall be able to comment on articles.

The system shall allow:
- Creating comments
- Editing own comments
- Deleting own comments

Administrators and editors shall be able to:
- Delete inappropriate comments
- Moderate comment discussions

------------------------------------------------------------------------

## 10. Article likes

Subscribers shall be able to like articles.

The system shall:
- Allow one like per user per article
- Allow removing a like
- Display total number of likes

Visitors cannot like articles.

------------------------------------------------------------------------

## 11. Search functionality

The system shall provide search functionality.

Users shall be able to search articles by:
- keywords
- title
- article content
- author name
- category
- date

Search results shall display:
- article title
- preview text
- author
- publication date

------------------------------------------------------------------------

## 12. Navigation

The website shall provide clear navigation.

The system shall include:
- A main navigation menu
- Category menu
- Author pages
- Homepage Links
- Search bar
- Breadcrumb navigation (optional)

------------------------------------------------------------------------

## 13. Responsive Design

The system shall support multiple devices:
- Desktop browsers
- Tablet devices
- Mobile devices

The layout shall adapt to screen size.

------------------------------------------------------------------------

## 14. Error Handling

The system shall display appropriate messages when errors occur.

Examples include:
- Article not found
- Search returned no results
- Invalid login credentials
- Unauthorized access attempt
- Failed article submission

------------------------------------------------------------------------

## 15. Security Requirements

The system shall ensure basic security measures:
- Password hashing
- Authentication and authorization
- Input validation
