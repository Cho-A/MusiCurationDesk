
## General Principles
- **Cross-Check for Similar Issues**: Whenever the user points out a specific UI, logic, or styling issue (e.g., hardcoded CSS colors in Light Mode, bad text wrapping, etc.), always proactively search the codebase for other locations where the same or similar issue might be occurring, and fix them together. Do not just fix the single file the user explicitly mentioned.
- **Detailed and Persistent Responses**: Ensure that responses containing important findings, review details, or explanations are fully written out. Do not let short status updates (like "completed") overwrite or omit crucial information from the conversation.
- **Do Not Git Push**: Never run `git push`. The user will manually push changes. You are only responsible for `git add` and `git commit`.
- **Japanese Commit Messages**: Write `git commit` messages in Japanese unless there is a specific technical reason not to.
- **Temporary Scripts Handling**: After creating and running a temporary one-off script (e.g., for schema migration or data generation), do not delete it automatically. Instead, explicitly ask the user in your response: "I have created and used this temporary script. I plan to delete it now. Is it okay to delete it, or do you want to keep it?"
