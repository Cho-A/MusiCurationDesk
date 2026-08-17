
## General Principles
- **Cross-Check for Similar Issues**: Whenever the user points out a specific UI, logic, or styling issue (e.g., hardcoded CSS colors in Light Mode, bad text wrapping, etc.), always proactively search the codebase for other locations where the same or similar issue might be occurring, and fix them together. Do not just fix the single file the user explicitly mentioned.
- **Detailed and Persistent Responses**: Ensure that responses containing important findings, review details, or explanations are fully written out. Do not let short status updates (like "completed") overwrite or omit crucial information from the conversation.
- **Do Not Git Push**: Never run `git push`. The user will manually push changes. You are only responsible for `git add` and `git commit`.
- **Japanese Commit Messages**: Write `git commit` messages in Japanese unless there is a specific technical reason not to.
- **Temporary Scripts Handling**: After creating and running a temporary one-off script (e.g., for schema migration or data generation), do not delete it automatically. Instead, explicitly ask the user in your response: "I have created and used this temporary script. I plan to delete it now. Is it okay to delete it, or do you want to keep it?"
- **Test-Driven Development (TDD)**: Always write tests before implementing new features, APIs, or components. For existing features, ensure tests are added before or alongside any modifications. Treat tests as executable specifications.

## Coding Standards (Backend)
- **FastAPI Router Unification**: Always instantiate `APIRouter` with `prefix` and `tags` (e.g., `router = APIRouter(prefix="/albums", tags=["Albums"])`). Do not manually repeat paths like `/albums/` in `@router` decorators.
- **Dependency Injection**: Use `from backend.dependencies import get_db, get_current_user` instead of redefining or importing from `models.py`. Standardize DB injection as `db: Session = Depends(get_db)`.
- **Absolute Imports**: Always use absolute imports for backend modules (e.g., `from backend import models, schemas, auth_utils`) instead of relative imports (`from .. import ...`).
- **Ruff Formatting**: The project uses `ruff` for formatting and linting. After writing or modifying backend code, run `ruff check --select I --fix backend` to sort imports, and `ruff format backend` to enforce PEP 8 style standards automatically.
