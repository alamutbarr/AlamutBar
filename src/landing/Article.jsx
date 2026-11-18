import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function Article() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`/api/articles/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || 'مقاله پیدا نشد.');
        setArticle(payload.data);
      })
      .catch((err) => setError(err.message));
  }, [slug]);
  return (
    <main dir="rtl" style={{ maxWidth: 760, margin: '40px auto', padding: 20, fontFamily: 'inherit' }}>
      <a href="/">بازگشت به سایت</a>
      {error && <p>{error}</p>}
      {article && (
        <article>
          <p>{article.category}</p>
          <h1>{article.title}</h1>
          <p>{article.summary}</p>
          <div style={{ whiteSpace: 'pre-wrap' }}>{article.body}</div>
        </article>
      )}
    </main>
  );
}
