from __future__ import annotations


from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import auth_utils, models
from .database import SessionLocal

# トークンを取得する場所を指定 (ログインAPIのURL "/token" を指す)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


def get_db():
    """データベースセッションを取得する依存関係
    (main.py や models.py からインポートしても良いが、ここで定義してもOK)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """★ 認証の門番 ★
    ヘッダーのトークンを検証し、ログイン中のユーザーオブジェクトを返す。
    無効な場合は 401 エラーを発生させて弾く。
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. トークンのデコード
    payload = auth_utils.decode_access_token(token)
    if payload is None:
        raise credentials_exception

    # 2. ペイロードからユーザー名 (sub) を取得
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception

    # 3. DBからユーザーを検索
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception

    return user


async def get_current_admin_user(current_user: models.User = Depends(get_current_user)):
    """★ 管理者権限の門番 ★
    現在のユーザーが管理者(is_admin)であるかを確認する。
    管理者でない場合は 403 エラーを発生させて弾く。
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have enough privileges",
        )
    return current_user
