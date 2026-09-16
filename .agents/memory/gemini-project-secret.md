---
name: Gemini project-secret compatibility
description: The workspace Gemini credential is server-managed, and the available API account may require the current model name returned by its error response.
---

Keep Gemini credentials server-side and choose the model from the account's current supported-model response rather than assuming an older public model name. In this workspace, the API explicitly rejected older Flash model names for new users and directed callers to the current Flash model.

**Why:** The first server smoke test failed with a model-not-available response even though the project secret was present and valid.

**How to apply:** When Gemini returns a model availability error, inspect the sanitized provider message, update the server default and client request together, and rerun a real request without exposing the secret.