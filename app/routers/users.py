from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models , schemas , auth_utils , dependencies# 先ほど作成したファイルをインポート

user_router = APIRouter(
    prefix="/users", 
    tags=["Users"] 
)

user_possessions_router = APIRouter(
    prefix="/user_possessions", 
    tags=["Users"] 
)

user_attendance_router = APIRouter(
    prefix="/user_attendance", 
    tags=["Users"] 
)


# --- ★ユーザー登録APIエンドポイント★ ---
#
# [POST] /users/
# ----------------------------------------------------
@user_router.post("/", response_model=schemas.User, tags=["Users"])
def create_user(
    user: schemas.UserCreate, 
    db: Session = Depends(models.get_db)
):
    """
    新しいユーザーをデータベースに登録します。
    """
    
    # 1. 既存チェック (username)
    db_user_by_username = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user_by_username:
        raise HTTPException(status_code=400, detail=f"ユーザー名 '{user.username}' は既に使用されています。")
        
    # 2. 既存チェック (email)
    db_user_by_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user_by_email:
        raise HTTPException(status_code=400, detail=f"メールアドレス '{user.email}' は既に使用されています。")

    hashed_password = auth_utils.get_password_hash(user.password)
    
    # 3. データ作成
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password 
    )
    
    db.add(new_user)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_user)
    
    return new_user

# --- ★ユーザーの所有物登録API★ ---
@user_possessions_router.post("/user_possessions/", response_model=schemas.UserPossession, tags=["Users"])
def create_user_possession(
    possession: schemas.UserPossessionInput, # 👈 Input用スキーマに変更
    db: Session = Depends(models.get_db),
    current_user: models.User = Depends(dependencies.get_current_user) # 👈 ★門番を追加
):
    """
    ログイン中のユーザーの所有物を登録します。
    (トークン必須)
    """
    
    # 1. entity_type のチェック (変更なし)
    if possession.entity_type == "album":
        db_item = db.query(models.Album).filter(models.Album.id == possession.entity_id).first()
    elif possession.entity_type == "merchandise":
        db_item = db.query(models.Merchandise).filter(models.Merchandise.id == possession.entity_id).first()
    else:
        raise HTTPException(status_code=400, detail=f"無効な entity_type: '{possession.entity_type}'")
        
    if db_item is None:
        raise HTTPException(status_code=404, detail=f"{possession.entity_type} ID {possession.entity_id} が見つかりません。")

    # 2. データ作成 (user_id は current_user.id を使用)
    new_possession = models.UserPossession(
        user_id=current_user.id, # 👈 ★トークンから特定したIDを使う
        **possession.dict()
    )
    
    db.add(new_possession)
    db.commit()
    db.refresh(new_possession)
    
    return new_possession

# --- ★ユーザーの参加履歴登録API (保護版)★ ---
@user_attendance_router.post("/user_attendance/", response_model=schemas.UserAttendance, tags=["Users"])
def create_user_attendance(
    attendance: schemas.UserAttendanceInput, # 👈 Input用スキーマに変更
    db: Session = Depends(models.get_db),
    current_user: models.User = Depends(dependencies.get_current_user) # 👈 ★門番を追加
):
    """
    ログイン中のユーザーの参加履歴を登録します。
    (トークン必須)
    """
    
    # 1. 公演チェック
    db_performance = db.query(models.Performance).filter(models.Performance.id == attendance.performance_id).first()
    if db_performance is None:
        raise HTTPException(status_code=404, detail=f"Performance ID {attendance.performance_id} が見つかりません。")

    # 2. データ作成
    new_attendance = models.UserAttendance(
        user_id=current_user.id, # 👈 ★トークンから特定したIDを使う
        **attendance.dict()
    )
    
    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)
    
    return new_attendance

# --- ★★★ 新規実装: マイページ情報取得 (保護されたAPI) ★★★ ---
# GET /users/me
@user_router.get("/me", response_model=schemas.User)
def read_users_me(
    # ★ ここで門番 (get_current_user) を使う！
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """
    ログイン中のユーザー自身の情報を取得します。
    (トークンが必須です)
    """
    return current_user