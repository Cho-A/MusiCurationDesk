import React, { useState } from 'react';
import { X, Clipboard, ArrowRight, AlertTriangle, ArrowLeft, CheckSquare } from 'lucide-react';

interface MBTrack {
  position: number;
  number: string;
  title: string;
  length: number;
}

interface MBMedia {
  position: number;
  format: string;
  track_count: number;
  tracks: MBTrack[];
}

interface MBReleaseDetail {
  id: string;
  title: string;
  date: string;
  barcode: string;
  media: MBMedia[];
}

interface SmartPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParseComplete: (release: MBReleaseDetail) => void;
}

interface ParsedRow {
  id: string;
  include: boolean;
  disc: number;
  track: number;
  title: string;
  originalText: string;
}

const SmartPasteModal: React.FC<SmartPasteModalProps> = ({ isOpen, onClose, onParseComplete }) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [text, setText] = useState('');
  const [releaseTitle, setReleaseTitle] = useState('New Custom Release');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  
  if (!isOpen) return null;

  const runParser = () => {
    if (!text.trim()) return;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsedRows: ParsedRow[] = [];
    
    let currentDiscNum = 1;
    let trackPos = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let include = true;
      let title = line;
      let isDiscMarker = false;

      // 1. Disc markers
      const discMatch = line.match(/^(?:Disc|CD|BD|DVD|Blu-ray|DISC)[\s\.-]*(\d+)/i) || 
                        line.match(/^【(?:BD|DVD|CD).*収録/i) ||
                        line.match(/^\[(?:BD|DVD|CD)/i);
      
      if (discMatch) {
        isDiscMarker = true;
        include = false; // By default don't include disc marker as a track
        if (discMatch[1]) {
          currentDiscNum = parseInt(discMatch[1], 10);
        } else if (i > 0) {
          currentDiscNum++;
        }
        trackPos = 1; // reset track pos
      }

      // 2. Track markers
      let matchedTrack = false;
      if (!isDiscMarker) {
        const trackMatch = line.match(/^(?:M?\d+[\.\s\-:\]\)]+)(.*)$/i) || line.match(/^(\d{1,2})\s+(.*)$/);
        if (trackMatch) {
          matchedTrack = true;
          title = trackMatch[1].trim();
          if (trackMatch.length > 2 && trackMatch[2]) {
             title = trackMatch[2].trim();
          }
        }
      }

      // 3. Heuristics for exclusion
      if (!isDiscMarker && !matchedTrack) {
        if (title.length > 60) include = false;
        if (title.match(/^(?:※|初回|通常|特典|発売日|価格|規格|ボーナス|監督|プロデューサー)/)) include = false;
      }

      parsedRows.push({
        id: `row-${Date.now()}-${i}`,
        include: include,
        disc: currentDiscNum,
        track: include ? trackPos : 0,
        title: title,
        originalText: line
      });

      if (include) {
        trackPos++;
      }
    }

    setRows(parsedRows);
    setStep('preview');
  };

  const handleFinish = () => {
    const includedRows = rows.filter(r => r.include);
    
    // Group by disc
    const discMap = new Map<number, ParsedRow[]>();
    includedRows.forEach(r => {
      if (!discMap.has(r.disc)) discMap.set(r.disc, []);
      discMap.get(r.disc)!.push(r);
    });

    const medias: MBMedia[] = [];
    const sortedDiscs = Array.from(discMap.keys()).sort((a, b) => a - b);
    
    sortedDiscs.forEach(dNum => {
      const discRows = discMap.get(dNum)!;
      // Sort by track number
      discRows.sort((a, b) => a.track - b.track);
      
      const tracks: MBTrack[] = discRows.map((r, idx) => ({
        position: idx + 1,
        number: r.track.toString(),
        title: r.title,
        length: 0
      }));

      medias.push({
        position: dNum,
        format: 'CD',
        track_count: tracks.length,
        tracks: tracks
      });
    });

    const fauxRelease: MBReleaseDetail = {
      id: `smart-paste-${Date.now()}`,
      title: releaseTitle || 'New Custom Release',
      date: new Date().toISOString().split('T')[0],
      barcode: '',
      media: medias
    };

    onParseComplete(fauxRelease);
  };

  const updateRow = (id: string, field: keyof ParsedRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', width: step === 'input' ? '800px' : '1000px', 
        maxWidth: '95%', height: '90vh',
        borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'width 0.3s'
      }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clipboard size={24} color="var(--spotify-color)" />
            スマートテキストインポート {step === 'preview' && '(プレビュー確認)'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {step === 'input' ? (
            <>
              <div style={{ backgroundColor: 'rgba(29, 185, 84, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(29, 185, 84, 0.3)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--spotify-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} />
                  テキストを貼り付けてください
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  タワーレコード等のサイトからコピーしたテキストを貼り付けてください。<br/>
                  自動解析後、次の画面で表形式のプレビューが表示され、手動で修正できます。
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>作品タイトル (オプション)</label>
                <input 
                  type="text" 
                  value={releaseTitle}
                  onChange={e => setReleaseTitle(e.target.value)}
                  placeholder="例: UNISON SQUARE GARDEN 20th Anniversary LIVE..."
                  style={{ 
                    width: '100%', padding: '12px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', 
                    border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>トラックリスト テキスト</label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={`【BD/DVD収録曲】\n1. Catch up, latency\n2. サンポサキマイライフ\n...`}
                  style={{ 
                    width: '100%', flex: 1, minHeight: '300px', padding: '12px', backgroundColor: 'var(--bg-tertiary)', 
                    color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', 
                    fontSize: '0.95rem', boxSizing: 'border-box', fontFamily: 'monospace', resize: 'none'
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ backgroundColor: 'rgba(29, 185, 84, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(29, 185, 84, 0.3)', flexShrink: 0 }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--spotify-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckSquare size={18} />
                  プレビューの確認と修正
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  解析結果です。誤ってトラックとして認識された行はチェックを外し、Disc番号や曲名がおかしい場合は直接編集してください。
                </p>
              </div>

              <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 10 }}>
                    <tr>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', width: '60px', textAlign: 'center' }}>対象</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', width: '80px' }}>Disc</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', width: '80px' }}>Track</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>曲名</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>元のテキスト</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        backgroundColor: row.include ? 'transparent' : 'rgba(255,255,255,0.02)',
                        opacity: row.include ? 1 : 0.5
                      }}>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={row.include}
                            onChange={e => updateRow(row.id, 'include', e.target.checked)}
                            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input 
                            type="number" 
                            value={row.disc}
                            onChange={e => updateRow(row.id, 'disc', parseInt(e.target.value) || 1)}
                            disabled={!row.include}
                            style={{ width: '50px', padding: '6px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input 
                            type="number" 
                            value={row.track}
                            onChange={e => updateRow(row.id, 'track', parseInt(e.target.value) || 1)}
                            disabled={!row.include}
                            style={{ width: '50px', padding: '6px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input 
                            type="text" 
                            value={row.title}
                            onChange={e => updateRow(row.id, 'title', e.target.value)}
                            disabled={!row.include}
                            style={{ width: '100%', padding: '6px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box' }}
                          />
                        </td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.originalText}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          {step === 'preview' ? (
             <button 
               onClick={() => setStep('input')}
               style={{ padding: '12px 24px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
             >
               <ArrowLeft size={18} />
               戻る
             </button>
          ) : (
            <div /> // placeholder for flex-between
          )}

          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              onClick={onClose}
              style={{ padding: '12px 24px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              キャンセル
            </button>
            
            {step === 'input' ? (
              <button 
                onClick={runParser}
                disabled={!text.trim()}
                style={{ 
                  padding: '12px 24px', background: 'var(--spotify-color)', border: 'none', color: 'black', borderRadius: '8px', 
                  cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
                  opacity: text.trim() ? 1 : 0.5
                }}
              >
                プレビューへ進む
                <ArrowRight size={18} />
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                style={{ 
                  padding: '12px 24px', background: 'var(--spotify-color)', border: 'none', color: 'black', borderRadius: '8px', 
                  cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                ビルダーを開く
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartPasteModal;
