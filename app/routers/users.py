from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models , schemas # 先ほど作成したファイルをインポート

user_router = APIRouter(
    prefix="/users", 
    tags=["Users"] 
)

user_possessions_router = APIRouter(
    prefix="/tieups", 
    tags=["Users"] 
)

user_attendance_router = APIRouter(
    prefix="/tieups", 
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
    (この段階ではパスワードはハッシュ化されません - 認証実装時に修正)
    """
    
    # 1. 既存チェック (username)
    db_user_by_username = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user_by_username:
        raise HTTPException(status_code=400, detail=f"ユーザー名 '{user.username}' は既に使用されています。")
        
    # 2. 既存チェック (email)
    db_user_by_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user_by_email:
        raise HTTPException(status_code=400, detail=f"メールアドレス '{user.email}' は既に使用されています。")

    # ★★★【重要】★★★
    # 本来はここでパスワードをハッシュ化する
    # hashed_password = auth_utils.hash_password(user.password)
    # が、今は認証を実装していないため、ダミーのハッシュ（または平文のまま）を保存
    # (※セキュリティ上、本番環境では絶対に行わないでください)
    dummy_hashed_password = f"DUMMY_HASH_FOR_{user.password}"
    
    # 3. データ作成
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=dummy_hashed_password 
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
#
# [POST] /user_possessions/
# ----------------------------------------------------
@user_possessions_router.post("/", response_model=schemas.UserPossession, tags=["Users"])
def create_user_possession(
    possession: schemas.UserPossessionCreate, 
    db: Session = Depends(models.get_db)
):
    """
    ユーザー (user_id) が特定のアイテム (entity_id) を
    所有している (Owned) または欲しい (Wishlist) ことを登録します。
    """
    
    # --- 外部キー制約のチェック ---
    # 1. ユーザー (User) が存在するかチェック
    db_user = db.query(models.User).filter(models.User.id == possession.user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail=f"User ID {possession.user_id} が見つかりません。")
        
    # 2. entity_type に応じて、対象のアイテムが存在するかチェック (任意だが推奨)
    if possession.entity_type == "album":
        db_item = db.query(models.Album).filter(models.Album.id == possession.entity_id).first()
    elif possession.entity_type == "merchandise":
        db_item = db.query(models.Merchandise).filter(models.Merchandise.id == possession.entity_id).first()
    else:
        raise HTTPException(status_code=400, detail=f"無効な entity_type: '{possession.entity_type}'")
        
    if db_item is None:
        raise HTTPException(status_code=404, detail=f"{possession.entity_type} ID {possession.entity_id} が見つかりません。")

    # --- データ作成 ---
    new_possession = models.UserPossession(**possession.dict())
    
    db.add(new_possession)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_possession)
    
    return new_possession

# [POST] /user_attendance/
# ----------------------------------------------------
@user_attendance_router.post("/", response_model=schemas.UserAttendance, tags=["Users"])
def create_user_attendance(
    attendance: schemas.UserAttendanceCreate, 
    db: Session = Depends(models.get_db)
):
    """
    ユーザー (user_id) が特定の公演 (performance_id) に
    参加した (Attended) ことを登録します。
    """
    
    # 1. ユーザー (User) が存在するかチェック
    db_user = db.query(models.User).filter(models.User.id == attendance.user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail=f"User ID {attendance.user_id} が見つかりません。")
        
    # 2. 公演 (Performance) が存在するかチェック
    db_performance = db.query(models.Performance).filter(models.Performance.id == attendance.performance_id).first()
    if db_performance is None:
        raise HTTPException(status_code=404, detail=f"Performance ID {attendance.performance_id} が見つかりません。")

    new_attendance = models.UserAttendance(**attendance.dict())
    db.add(new_attendance)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_attendance)
    return new_attendance