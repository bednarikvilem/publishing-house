# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: article-rejection-workflow.spec.ts >> editor rejects article and author sees REJECTED status
- Location: e2e/article-rejection-workflow.spec.ts:64:0

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - link "ClaudeDaily" [ref=e6] [cursor=pointer]:
        - /url: /claudedaily
      - navigation [ref=e7]:
        - link "Home" [ref=e8] [cursor=pointer]:
          - /url: /claudedaily
        - link "AI & Machine Learning" [ref=e9] [cursor=pointer]:
          - /url: /claudedaily/category/ai-machine-learning
        - link "New Tech & Gadgets" [ref=e10] [cursor=pointer]:
          - /url: /claudedaily/category/new-tech-gadgets
        - link "Software & Coding" [ref=e11] [cursor=pointer]:
          - /url: /claudedaily/category/software-coding
        - link "Cybersecurity" [ref=e12] [cursor=pointer]:
          - /url: /claudedaily/category/cybersecurity
      - generic [ref=e14]:
        - img [ref=e15]
        - textbox "Search articles…"
      - generic [ref=e18]:
        - button "Toggle dark mode" [ref=e19]:
          - img [ref=e20]
        - generic [ref=e22]:
          - link "Dashboard" [ref=e23] [cursor=pointer]:
            - /url: /claudedaily/author-dashboard
            - img [ref=e24]
            - text: Dashboard
          - button "Subscribe" [ref=e29]
          - button "JN Jan Novak" [ref=e31]:
            - generic [ref=e33]: JN
            - generic [ref=e34]: Jan Novak
            - img [ref=e35]
  - generic [ref=e37]:
    - complementary [ref=e38]:
      - generic [ref=e39]:
        - img "Jan Novak" [ref=e41]
        - generic [ref=e42]:
          - generic [ref=e43]: Jan Novak
          - generic [ref=e44]: "@jannovak"
      - navigation [ref=e45]:
        - generic [ref=e46]:
          - paragraph [ref=e47]: Author
          - link "My Articles" [ref=e48] [cursor=pointer]:
            - /url: /claudedaily/author-dashboard?section=my-articles
            - img [ref=e49]
            - text: My Articles
          - link "New Article" [ref=e52] [cursor=pointer]:
            - /url: /claudedaily/articles/new
            - img [ref=e53]
            - text: New Article
        - generic [ref=e56]:
          - paragraph [ref=e57]: Filter by Status
          - button "All Articles" [ref=e58]: All Articles
          - button "Drafts" [ref=e60]: Drafts
          - button "Submitted" [ref=e62]: Submitted
          - button "In Review" [ref=e64]: In Review
          - button "Approved" [ref=e66]: Approved
          - button "Published" [ref=e68]: Published
          - button "Rejected" [ref=e70]: Rejected
      - generic [ref=e72]:
        - link "My Profile" [ref=e73] [cursor=pointer]:
          - /url: /claudedaily/profile
          - img [ref=e74]
          - text: My Profile
        - button "Log Out" [ref=e77]:
          - img [ref=e78]
          - text: Log Out
    - main [ref=e81]:
      - generic [ref=e82]:
        - generic [ref=e83]:
          - heading "Submitted" [level=1] [ref=e84]
          - link "New Article" [ref=e85] [cursor=pointer]:
            - /url: /claudedaily/articles/new
            - img [ref=e86]
            - text: New Article
        - generic [ref=e88]:
          - generic [ref=e90]:
            - generic [ref=e91]:
              - generic [ref=e92]: E2E Rejection 1780779270153
              - generic [ref=e93]: E2E rejection test perex
              - generic [ref=e94]: Updated Jun 6, 2026
            - generic [ref=e96]: Submitted
          - generic [ref=e98]:
            - generic [ref=e99]:
              - generic [ref=e100]: E2E Rejection Manager 1780779270132
              - generic [ref=e101]: E2E rejection test perex
              - generic [ref=e102]: Updated Jun 6, 2026
            - generic [ref=e104]: Submitted
          - generic [ref=e106]:
            - generic [ref=e107]:
              - generic [ref=e108]: E2E Workflow 1780779138600
              - generic [ref=e109]: E2E test perex
              - generic [ref=e110]: Updated Jun 6, 2026
            - generic [ref=e112]: Submitted
          - generic [ref=e114]:
            - generic [ref=e115]:
              - generic [ref=e116]: E2E Rejection 1780776290031
              - generic [ref=e117]: E2E rejection test perex
              - generic [ref=e118]: Updated Jun 6, 2026
            - generic [ref=e120]: Submitted
          - generic [ref=e122]:
            - generic [ref=e123]:
              - generic [ref=e124]: E2E Rejection Manager 1780776290097
              - generic [ref=e125]: E2E rejection test perex
              - generic [ref=e126]: Updated Jun 6, 2026
            - generic [ref=e128]: Submitted
          - generic [ref=e130]:
            - generic [ref=e131]:
              - generic [ref=e132]: E2E Rejection Manager 1780775140427
              - generic [ref=e133]: E2E rejection test perex
              - generic [ref=e134]: Updated Jun 6, 2026
            - generic [ref=e136]: Submitted
          - generic [ref=e138]:
            - generic [ref=e139]:
              - generic [ref=e140]: E2E Rejection 1780775140449
              - generic [ref=e141]: E2E rejection test perex
              - generic [ref=e142]: Updated Jun 6, 2026
            - generic [ref=e144]: Submitted
```