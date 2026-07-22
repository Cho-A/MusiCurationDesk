import React from 'react';
import { Shield, AlertTriangle, HelpCircle } from 'lucide-react';

const Terms: React.FC = () => {
  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)', lineHeight: '1.6' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '32px' }}>利用規約・免責事項</h1>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={24} color="var(--primary-color)" />
          コンテンツの取り扱いについて
        </h2>
        <p>
          MusiCurationDesk（以下、当サイト）は、個人的な音楽キュレーションおよびデータベース管理を目的としたサービスです。
          当サイト内で表示されているテキスト情報（アーティスト名、楽曲名、アルバム名、セットリスト等）は事実に基づくメタデータです。
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={24} color="#ffb84d" />
          画像および音源に関する免責事項
        </h2>
        <p style={{ marginBottom: '16px' }}>
          当サイトでは著作権・肖像権の保護を最優先とし、CDジャケットやアーティスト写真などの著作物・肖像を当サイトのサーバーに無断でアップロード・保存する機能を排除しております。
        </p>
        <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <li>
            <strong>Spotify公式ウィジェットの利用：</strong><br />
            一部のアルバムや楽曲詳細ページでは、Spotify社が公式に提供する埋め込みプレイヤー（Embed Widget）を利用してジャケット画像等を表示しています。これらはSpotify Developer Terms（API利用規約）に則った合法的な埋め込みであり、各画像の著作権はSpotify社および各コンテンツプロバイダー（レコード会社、アーティスト等）に帰属します。
          </li>
          <li>
            <strong>アーティスト画像について：</strong><br />
            アーティスト詳細ページ等では、肖像権およびパブリシティ権を尊重し、プレースホルダー（汎用アイコン）を使用しております。
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle size={24} color="var(--accent-primary)" />
          お問い合わせ・削除要請について
        </h2>
        <p>
          当サイトは権利侵害を目的としたものでは一切ございません。<br />
          万が一、当サイトの掲載内容において著作権、肖像権、その他権利を侵害するおそれがある場合は、権利者ご本人様よりご連絡をお願いいたします。<br />
          事実確認の上、速やかに修正・削除等の対応をとらせていただきます。
        </p>
        <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <strong>【ご連絡窓口】</strong><br />
          (ここに将来的にメールアドレスやフォームへのリンクを記載します)
        </div>
      </section>
    </div>
  );
};

export default Terms;
