import PageHeader from '../components/PageHeader';

const Legal = () => {
  return (
    <div style={{ padding: '48px 32px', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)', lineHeight: 1.6 }}>
      <PageHeader title="Legal Information" subtitle="プライバシーポリシー・利用規約・著作権について" />
      
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>1. 著作権および外部APIの利用について</h2>
        <p>
          当サイト（MusiCurationDesk）は、音楽情報を整理・探求するための非公式キュレーションサービスです。<br />
          当サイト上で表示されているアーティスト画像、アルバムジャケット、および一部の楽曲情報は、<strong>Spotify API</strong> などの外部サービスを通じて取得・表示（Embed等）されています。
        </p>
        <p>
          これらの画像の著作権、肖像権、パブリシティ権その他の権利は、各権利者（アーティスト、所属事務所、レコード会社等）または情報の提供元に帰属します。当サイトは権利を侵害する意図をもって運営されているものではありません。
        </p>
        <p>
          万が一、掲載内容に問題がある場合は、お手数ですがお問い合わせ窓口よりご連絡ください。速やかに確認の上、対応（削除・非公開化等）させていただきます。
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>2. 免責事項</h2>
        <p>
          当サイトの利用により生じた直接的、間接的なトラブルや損害について、運営者は一切の責任を負いません。また、当サイト上の情報は予告なく変更・削除される場合があります。
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>3. プライバシーポリシー</h2>
        <p>
          当サイトは、ユーザーの利便性向上や利用状況の分析のため、Cookieやアクセス解析ツール（Google Analytics等）を使用する場合があります。これにより収集される情報は匿名化されており、個人を特定するものではありません。
        </p>
      </section>
    </div>
  );
};

export default Legal;
