from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt

# --- 設定 (本来は .env ファイルなどで管理すべき機密情報) ---
# ※学習用としてここに書きますが、GitHubに上げる際は環境変数に置き換えるのがベストです
SECRET_KEY = "YOUR_SUPER_SECRET_KEY_CHANGE_THIS" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# パスワードハッシュ化の設定 (bcryptを使用)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- 1. パスワード関連の関数 (Level 4: ハッシュ化とソルト) ---

def verify_password(plain_password, hashed_password):
    """
    入力された平文パスワードと、DB内のハッシュを比較検証する
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """
    パスワードをハッシュ化する (ソルトは自動付与される)
    """
    return pwd_context.hash(password)

# --- 2. JWT関連の関数 (Level 3: JWT構造) ---

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    JWTアクセストークンを生成する
    Header: 自動生成
    Payload: data (ユーザー名など) + exp (有効期限)
    Signature: SECRET_KEYで署名
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
        
    # Payloadに有効期限を追加
    to_encode.update({"exp": expire})
    
    # JWTの生成 (エンコード)
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    # type: refresh を入れて、アクセストークンと区別する
    to_encode.update({"exp": expire, "type": "refresh"}) 
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    """
    JWTをデコードし、Payloadを返す。
    失敗した場合は None を返す。
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None