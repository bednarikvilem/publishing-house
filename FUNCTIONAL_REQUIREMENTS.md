# Newspaper Website - Functional Requirements

## 1. Introduction

This document describes the functional requirements for a web-based
newspaper platform. 

------------------------------------------------------------------------

## 2. User Roles

### 2.1 Visitor (User who does not have an account)

A visitor is any user accessing the website without logging in.

A visitor shall be able to:
- Create an account and become a Subscriber
- Log in and switch into a Subscriber mode
- View the homepage
- Browse articles
- Read the **preview** of individual articles
- View articles by category
- View articles written by specific authors
- Search for articles

### 2.2 Subscriber (User with valid account)

A subscriber is a user with a valid account.

A subscriber shall be able to:
- View the homepage
- Browse articles
- Read individual articles
- View articles by category
- View articles written by specific authors
- Search for articles
- Leave comments on articles
- Like articles

### 2.3 Author (User who can manage articles)

An author is a registered user in the **administration system** who can create and manage articles.

An author shall be able to:
- Log in to the administration system
- Create new articles
- Send articles to revision by the administrator
- Edit their own articles
- Delete their own articles
- Upload images for articles
- View a list of their published articles

### 2.4 Administrator

The administrator manages the platform.

An administrator shall be able to:
- Add a new author
- Add a new article category
- Edit or delete any article
- Review a new article
- Publish a new article

------------------------------------------------------------------------

## 3. Article Management

The system shall allow authors to create and manage articles.

The system shall:
- Allow authors to create articles with a title and content
- Allow authors to assign a category to an article
- Store the publication date of each article
- Associate each article with an author
- Display articles on the website

------------------------------------------------------------------------

## 4. Article Viewing

Visitors shall be able to read articles.

The system shall:
- Display a list of recent articles on the homepage
- Display the full content of an article on an article page
- Show the author name and publication date
- Display images included in the article
- Provide navigation back to category or homepage

------------------------------------------------------------------------

## 5. Categories

Articles shall be organized into categories.

The system shall:
- Allow categories to be created
- Allow articles to be assigned to categories
- Display articles grouped by category
- Allow users to browse articles by category

Example categories: - Politics - Technology - Sports - Culture

------------------------------------------------------------------------

## 6. Author Pages

Each author shall have a profile page.

The system shall:
- Display the author name
- Display a list of articles written by the author

------------------------------------------------------------------------

## 7. Search

The system shall provide article search functionality.

Users shall be able to:
- Search articles by keywords
- View a list of matching articles

------------------------------------------------------------------------

## 8. Navigation

The website shall provide clear navigation.

The system shall include:
- A main navigation menu
- Links to major categories
- Links to the homepage
- Links to author pages
- Breadcrumb navigation (optional)

------------------------------------------------------------------------

## 9. Responsive Design

The website shall be usable on different screen sizes.

The system shall:
- Support desktop browsers
- Support tablet devices
- Support mobile devices

------------------------------------------------------------------------

## 10. Error Handling

The system shall:
- Display a message when an article is not found
- Display a message when a search returns no results
