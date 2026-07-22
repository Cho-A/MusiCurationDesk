from __future__ import annotations
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas  # 先ほど作成したファイルをインポート

# --- 1. APIRouter のインスタンスを作成 ---
performance_router = APIRouter(
    prefix="/performances",
    tags=["Performances"],
)

performance_roster_router = APIRouter(
    prefix="/performance_roster",
    tags=["Performances"],
)

setlist_entries_router = APIRouter(
    prefix="/setlist_entries",
    tags=["Performances"],
)


# --- ★公演登録APIエンドポイント★ ---
#
# [POST] /performances/
# ----------------------------------------------------
@performance_router.post("/", response_model=schemas.Performance, tags=["Performances"])
def create_performance(
    performance: schemas.PerformanceCreate,
    db: Session = Depends(models.get_db),
):
    """新しい公演（ツアー公演、フェス出演、ワンマンなど）をデータベースに登録します。"""
    # --- 外部キー制約のチェック ---

    # 1. アーティスト (Artist) が存在するかチェック
    if performance.artist_id is not None:
        db_artist = (
            db.query(models.Artist)
            .filter(models.Artist.id == performance.artist_id)
            .first()
        )
        if db_artist is None:
            raise HTTPException(
                status_code=404,
                detail=f"Artist ID {performance.artist_id} が見つかりません。",
            )

    # 2. ツアー (Tour) IDが提供された場合、存在するかチェック
    if performance.tour_id:
        db_tour = (
            db.query(models.Tour).filter(models.Tour.id == performance.tour_id).first()
        )
        if db_tour is None:
            raise HTTPException(
                status_code=404,
                detail=f"Tour ID {performance.tour_id} が見つかりません。",
            )

    # --- データ作成 ---
    new_performance = models.Performance(**performance.dict())

    db.add(new_performance)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")

    db.refresh(new_performance)

    return new_performance

@performance_router.get("/", response_model=list[schemas.Performance], tags=["Performances"])
def get_performances(
    tour_id: int = Query(None, description="Filter by Tour ID"),
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(models.get_db)
):
    """登録されているすべての公演/単発ライブ一覧を取得します。"""
    query = db.query(models.Performance).options(
        joinedload(models.Performance.venue),
        joinedload(models.Performance.main_artist),
        joinedload(models.Performance.tour)
    )
    if tour_id is not None:
        query = query.filter(models.Performance.tour_id == tour_id)
    
    performances = query.order_by(models.Performance.date.desc()).offset(skip).limit(limit).all()
    return performances

@performance_router.get("/{performance_id}", response_model=schemas.PerformanceDetail, tags=["Performances"])
def get_performance(performance_id: int, db: Session = Depends(models.get_db)):
    """指定されたIDの公演詳細（セットリスト、参加メンバー等含む）を取得します。"""
    performance = (
        db.query(models.Performance)
        .options(
            joinedload(models.Performance.setlist_entries).joinedload(models.SetlistEntry.song),
            joinedload(models.Performance.roster_entries).joinedload(models.PerformanceRoster.artist),
            joinedload(models.Performance.venue),
            joinedload(models.Performance.main_artist),
            joinedload(models.Performance.tour)
        )
        .filter(models.Performance.id == performance_id)
        .first()
    )
    if not performance:
        raise HTTPException(status_code=404, detail="Performance not found")
    return performance


# --- ★公演参加者名簿登録API★ ---
#
# [POST] /performance_roster/
# ----------------------------------------------------
@performance_roster_router.post(
    "/", response_model=schemas.PerformanceRoster, tags=["Performances"]
)
def add_performance_roster_entry(
    roster_entry: schemas.PerformanceRosterCreate,
    db: Session = Depends(models.get_db),
):
    """特定の公演に、サポートメンバーやゲスト (artist_id) を追加します。"""
    # --- 外部キー制約のチェック ---
    # 1. 公演 (Performance) が存在するかチェック
    db_performance = (
        db.query(models.Performance)
        .filter(models.Performance.id == roster_entry.performance_id)
        .first()
    )
    if db_performance is None:
        raise HTTPException(
            status_code=404,
            detail=f"Performance ID {roster_entry.performance_id} が見つかりません。",
        )

    # 2. 参加アーティスト (Artist) が存在するかチェック
    db_artist = (
        db.query(models.Artist)
        .filter(models.Artist.id == roster_entry.artist_id)
        .first()
    )
    if db_artist is None:
        raise HTTPException(
            status_code=404,
            detail=f"Artist ID {roster_entry.artist_id} が見つかりません。",
        )

    # --- 紐付けデータを作成 ---
    new_entry = models.PerformanceRoster(
        performance_id=roster_entry.performance_id,
        artist_id=roster_entry.artist_id,
        role=roster_entry.role,
        context=roster_entry.context,
    )

    db.add(new_entry)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(
                status_code=400,
                detail="この公演に、このアーティストは既に同じ役割で登録されています。",
            )
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")

    db.refresh(new_entry)

    return new_entry


# --- ★公演詳細情報 API★ ---


# [GET] /performances/
# ----------------------------------------------------
@performance_router.get(
    "/", response_model=list[schemas.PerformanceSummary], tags=["Performances"]
)
def read_performances(
    # クエリパラメータを定義
    artist_id: int | None = Query(
        None, description="メインアクトのアーティストIDでフィルタリングします。"
    ),
    skip: int = Query(
        0,
        ge=0,
        description="取得を開始するレコードのオフセット（ページネーション用）。",
    ),
    limit: int = Query(
        100,
        ge=1,
        le=100,
        description="取得するレコードの最大数（ページネーション用）。",
    ),
    db: Session = Depends(models.get_db),
):
    """公演履歴を一覧で取得します。アーティストIDによるフィルタリングと、日付降順でのソートを行います。"""
    query = db.query(models.Performance).options(
        # 一覧表示に必要な情報のみをEager Loadする (N+1問題対策)
        joinedload(models.Performance.main_artist),
        joinedload(models.Performance.tour),
    )

    # --- フィルタリング処理 ---
    if artist_id is not None:
        # artist_idが指定された場合、そのアーティストの公演のみに絞り込む
        query = query.filter(models.Performance.artist_id == artist_id)

    # --- ソート処理 ---
    # 新しい公演から順に（日付降順）並べる
    query = query.order_by(models.Performance.date.desc())

    # --- ページネーション処理 ---
    performances = query.offset(skip).limit(limit).all()

    # 取得したリストを返却する
    return performances


# [GET] /performances/{performance_id}
# ----------------------------------------------------
@performance_router.get(
    "/{performance_id}", response_model=schemas.Performance, tags=["Performances"]
)
def read_performance(
    performance_id: int,
    db: Session = Depends(models.get_db),
):
    """指定されたIDの公演情報を取得します。
    セットリスト、公演参加者 (ゲスト/サポート) の詳細を含みます。
    """
    db_performance = (
        db.query(models.Performance)
        .options(
            joinedload(models.Performance.tour),
            joinedload(models.Performance.main_artist),
            # セットリスト情報を取得（ソートはmodels.pyで定義済み）
            joinedload(models.Performance.setlist_entries),
            # ★★★ 修正点: Roster情報と、そのアーティスト情報をロード ★★★
            joinedload(models.Performance.roster_entries).joinedload(
                models.PerformanceRoster.artist
            ),
        )
        .filter(models.Performance.id == performance_id)
        .first()
    )

    if db_performance is None:
        raise HTTPException(status_code=404, detail="公演情報が見つかりません。")

    return db_performance


@performance_router.put(
    "/{performance_id}/setlist",
    response_model=list[schemas.SetlistEntry],
    tags=["Performances"]
)
def update_setlist(
    performance_id: int,
    payload: schemas.SetlistUpdatePayload,
    db: Session = Depends(models.get_db),
):
    """公演のセットリストを一括更新します。"""
    db_performance = db.query(models.Performance).filter(models.Performance.id == performance_id).first()
    if not db_performance:
        raise HTTPException(status_code=404, detail="Performance not found")

    # 既存のセットリストを削除
    db.query(models.SetlistEntry).filter(models.SetlistEntry.performance_id == performance_id).delete()

    new_entries = []
    for entry in payload.entries:
        if entry.song_id is not None:
            db_song = db.query(models.Song).filter(models.Song.id == entry.song_id).first()
            if not db_song:
                raise HTTPException(status_code=404, detail=f"Song ID {entry.song_id} not found")
        
        new_entry = models.SetlistEntry(
            performance_id=performance_id,
            song_id=entry.song_id,
            entry_type=entry.entry_type,
            unresolved_song_name=entry.unresolved_song_name,
            order_index=entry.order_index,
            notes=entry.notes
        )
        db.add(new_entry)
        new_entries.append(new_entry)

    db.commit()

    # refresh each entry
    for entry in new_entries:
        db.refresh(entry)

    # Re-fetch to populate relationships like song
    updated_setlist = (
        db.query(models.SetlistEntry)
        .options(joinedload(models.SetlistEntry.song))
        .filter(models.SetlistEntry.performance_id == performance_id)
        .order_by(models.SetlistEntry.order_index)
        .all()
    )
    return updated_setlist


# --- ★セットリスト登録APIエンドポイント★ ---
#
# [POST] /setlist_entries/
# ----------------------------------------------------
@setlist_entries_router.post(
    "/", response_model=schemas.SetlistEntry, tags=["Performances"]
)
def create_setlist_entry(
    entry: schemas.SetlistEntryCreate,
    db: Session = Depends(models.get_db),
):
    """特定の公演 (performance_id) に、演奏された楽曲 (song_id) を追加します。

    (エラーチェック: performance_id, song_id がDBに存在するか確認します)
    """
    # --- 外部キー制約のチェック ---

    # 1. 公演 (Performance) が存在するかチェック
    db_performance = (
        db.query(models.Performance)
        .filter(models.Performance.id == entry.performance_id)
        .first()
    )
    if db_performance is None:
        raise HTTPException(
            status_code=404,
            detail=f"Performance ID {entry.performance_id} が見つかりません。",
        )

    # 2. 楽曲 (Song) が存在するかチェック (song_idが指定されている場合のみ)
    if entry.song_id is not None:
        db_song = db.query(models.Song).filter(models.Song.id == entry.song_id).first()
        if db_song is None:
            raise HTTPException(
                status_code=404, detail=f"Song ID {entry.song_id} が見つかりません。"
            )

    # --- 紐付けデータを作成 ---
    new_entry = models.SetlistEntry(**entry.dict())

    db.add(new_entry)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # ★ UNIQUE制約エラーをここでキャッチ
        if "UNIQUE constraint failed" in str(e):
            # 内部的な複合主キー (performance_id, song_id, order_index) の重複を防ぐ
            raise HTTPException(
                status_code=400,
                detail="この公演に、同じ曲順または同じ曲が重複して登録されています。",
            )
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")

    db.refresh(new_entry)

    return new_entry

@performance_router.put(
    "/{performance_id}", response_model=schemas.PerformanceDetail, tags=["Performances"]
)
def update_performance(
    performance_id: int,
    payload: schemas.PerformanceUpdate,
    db: Session = Depends(models.get_db),
):
    """公演メタデータを更新します。"""
    
    db_performance = db.query(models.Performance).filter(models.Performance.id == performance_id).first()
    if db_performance is None:
        raise HTTPException(status_code=404, detail="Performance not found.")
        
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_performance, key, value)
        
    try:
        db.commit()
        db.refresh(db_performance)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update performance: {e}")
        
    return db_performance


@performance_router.post(
    "/{performance_id}/copy-setlist", response_model=schemas.PerformanceDetail, tags=["Performances"]
)
def copy_setlist(
    performance_id: int,
    from_performance_id: int,
    db: Session = Depends(models.get_db),
):
    """指定した公演からセットリストをコピーします。"""
    
    target_perf = db.query(models.Performance).filter(models.Performance.id == performance_id).first()
    if not target_perf:
        raise HTTPException(status_code=404, detail="Target performance not found.")
        
    source_perf = db.query(models.Performance).filter(models.Performance.id == from_performance_id).first()
    if not source_perf:
        raise HTTPException(status_code=404, detail="Source performance not found.")
        
    if target_perf.setlist_entries:
        raise HTTPException(status_code=400, detail="Target performance already has a setlist.")
        
    if not source_perf.setlist_entries:
        raise HTTPException(status_code=400, detail="Source performance has no setlist to copy.")
        
    # Copy entries
    for entry in source_perf.setlist_entries:
        new_entry = models.SetlistEntry(
            performance_id=target_perf.id,
            song_id=entry.song_id,
            entry_type=entry.entry_type,
            unresolved_song_name=entry.unresolved_song_name,
            order_index=entry.order_index,
            notes=entry.notes
        )
        db.add(new_entry)
        
    try:
        db.commit()
        db.refresh(target_perf)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to copy setlist: {e}")
        
    return target_perf

from pydantic import BaseModel

class BulkUpdateTourRequest(BaseModel):
    performance_ids: List[int]
    tour_id: int | None

@performance_router.post("/bulk-update-tour")
def bulk_update_tour(req: BulkUpdateTourRequest, db: Session = Depends(models.get_db)):
    perfs = db.query(models.Performance).filter(models.Performance.id.in_(req.performance_ids)).all()
    for perf in perfs:
        perf.tour_id = req.tour_id
    db.commit()
    return {"message": f"Updated {len(perfs)} performances."}

class BulkCopySetlistRequest(BaseModel):
    target_performance_ids: List[int]
    source_performance_id: int

@performance_router.post("/bulk-copy-setlist")
def bulk_copy_setlist(req: BulkCopySetlistRequest, db: Session = Depends(models.get_db)):
    source_perf = db.query(models.Performance).filter(models.Performance.id == req.source_performance_id).first()
    if not source_perf:
        raise HTTPException(status_code=404, detail="Source performance not found")
        
    if not source_perf.setlist_entries:
        raise HTTPException(status_code=400, detail="Source performance has no setlist")
        
    target_perfs = db.query(models.Performance).filter(models.Performance.id.in_(req.target_performance_ids)).all()
    updated_count = 0
    
    for perf in target_perfs:
        # Delete existing setlist entries for this performance
        db.query(models.SetlistEntry).filter(models.SetlistEntry.performance_id == perf.id).delete()
        
        # Copy from source
        for entry in source_perf.setlist_entries:
            new_entry = models.SetlistEntry(
                performance_id=perf.id,
                song_id=entry.song_id,
                entry_type=entry.entry_type,
                unresolved_song_name=entry.unresolved_song_name,
                order_index=entry.order_index,
                notes=entry.notes
            )
            db.add(new_entry)
        updated_count += 1
        
    db.commit()
    return {"message": f"Copied setlist to {updated_count} performances."}
