from fastapi.security import OAuth2PasswordRequestForm
from fastapi import APIRouter, Depends, HTTPException,Body
from datetime import timedelta, datetime
from sqlalchemy.orm import Session
from .. import auth_utils, models,schemas,dependencies

token_router = APIRouter(
    prefix="/token", 
    tags=["Auth"] 
)

refresh_router = APIRouter(
    prefix="/refresh", 
    tags=["Auth"] 
)

logout_router = APIRouter(
    prefix="/logout", 
    tags=["Auth"] 
)

# --- ★ ログインAPI (トークン発行) ★ ---
# POST /token
@token_router.post("/", tags=["Auth"])
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(models.get_db)
):
    """
    username と password を受け取り、認証に成功したら JWT を返す
    """
    # 1. ユーザーをDBから検索
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    # 2. ユーザーが存在しない、またはパスワードが間違っている場合
    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="ユーザー名またはパスワードが間違っています",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. 認証成功：アクセストークン (JWT) を発行
    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": user.username}, # Payload: sub (Subject) にユーザー名を入れるのが一般的
        expires_delta=access_token_expires
    )

    # 2. ★ リフレッシュトークン作成 (7日) ★
    refresh_token_expires = timedelta(days=auth_utils.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = auth_utils.create_refresh_token(
        data={"sub": user.username},
        expires_delta=refresh_token_expires
    )

    # ★★★ 追加: DBに保存 ★★★
    new_db_token = models.RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.now() + refresh_token_expires
    )
    db.add(new_db_token)
    db.commit()
    
    # 4. トークンを返す (RFC準拠のレスポンス形式)
    return {"access_token": access_token,
            "refresh_token": refresh_token,
             "token_type": "bearer"}

# --- ★★★ 新規追加: トークン再発行 (リフレッシュ) API ★★★ ---
# POST /refresh
@refresh_router.post("/", response_model=schemas.Token, tags=["Auth"])
def refresh_token(
    refresh_token: str = Body(..., embed=True), # JSON body: { "refresh_token": "..." }
    db: Session = Depends(dependencies.get_db)
):
    """
    リフレッシュトークンを受け取り、新しいアクセストークンを発行します。
    """
    # 1. リフレッシュトークンを検証
    payload = auth_utils.decode_access_token(refresh_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="無効なリフレッシュトークンです")
    
    # 2. トークンタイプが "refresh" か確認 (アクセストークンの誤用防止)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="これはリフレッシュトークンではありません")
    
    # ★★★ 追加: DB存在チェック ★★★
    # トークンがDBにない（＝ログアウト済み or 不正）場合はエラー
    db_token = db.query(models.RefreshToken).filter(models.RefreshToken.token == refresh_token).first()
    if db_token is None:
        raise HTTPException(status_code=401, detail="このリフレッシュトークンは無効化されています（再ログインしてください）")
        
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=401, detail="トークンにユーザー情報が含まれていません")

    # 3. ユーザーが存在するか再確認 (セキュリティ)
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="ユーザーが見つかりません")

    # 4. 新しいアクセストークンを作成
    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = auth_utils.create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    # リフレッシュトークンは既存のものをそのまま返すか、新しく作り直す（ローテーション）戦略がある
    # ここではシンプルに、アクセストークンだけ更新して返す
    return {
        "access_token": new_access_token,
        "refresh_token": refresh_token, # そのまま返す
        "token_type": "bearer"
    }

@logout_router.post("/", tags=["Auth"])
def logout(
    refresh_token: str = Body(..., embed=True),
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_user) # ログイン必須
):
    """
    リフレッシュトークンをDBから削除し、無効化します（ログアウト）。
    """
    # DBから該当トークンを検索して削除
    db.query(models.RefreshToken).filter(models.RefreshToken.token == refresh_token).delete()
    db.commit()
    
    return {"message": "ログアウトしました"}