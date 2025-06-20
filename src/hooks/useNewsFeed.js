import { useState, useEffect } from 'react';

const NEWS_TTL_MS = 1000 * 60 * 480; // 8 hours
const STORAGE_KEY = 'newsFeedCache';

const STOP_WORDS = new Set([
  'the','a','an','of','for','on','in','and','or','is','are','to','will','with',
  'by','from','it','that','this','which','at','as','be'
]);

function extractKeywords(questions) {
  const text = questions.join(' ').toLowerCase();
  const tokens = text.match(/\b[a-z]+\b/g) || [];
  const filtered = tokens.filter(t => !STOP_WORDS.has(t));
  return Array.from(new Set(filtered));
}

export default function useNewsFeed(
  topic = 'economy',
  questions,
  daysBack = 35
) {
  const [news, setNews] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < NEWS_TTL_MS) {
            setNews(data);
            return;
          }
        } catch (err) {
          console.error('Failed to parse cached news', err);
        }
      }

      let items = [];

      const keywords = Array.isArray(questions) && questions.length
        ? extractKeywords(questions)
        : topic.split(/\s+/);
      const searchQuery = encodeURIComponent(keywords.join(' '));
      const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const newsApiKey = process.env.REACT_APP_NEWS_API_KEY;
      if (newsApiKey) {
        try {
          const url = `https://newsapi.org/v2/everything?q=${searchQuery}&sources=ap,bbc-news,reuters,npr,the-guardian-uk&language=en&from=${fromDate}&sortBy=publishedAt&apiKey=${newsApiKey}`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            items = json.articles.map(a => ({
              title: a.title,
              url: a.url,
              source: a.source?.name || 'NewsAPI',
              publishedAt: a.publishedAt
            }));
          }
        } catch (err) {
          console.error('NewsAPI error', err);
        }
      }

      const guardianKey = process.env.REACT_APP_GUARDIAN_API_KEY;
      if (guardianKey) {
        try {
          const url = `https://content.guardianapis.com/search?q=${searchQuery}&from-date=${fromDate}&order-by=newest&api-key=${guardianKey}`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            const guardianItems = json.response.results.map(r => ({
              title: r.webTitle,
              url: r.webUrl,
              source: 'The Guardian',
              publishedAt: r.webPublicationDate
            }));
            items = items.concat(guardianItems);
          }
        } catch (err) {
          console.error('Guardian API error', err);
        }
      } else {
        console.warn('Guardian API key missing, skipping Guardian news fetch');
      }

      items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      setNews(items);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: items, timestamp: Date.now() }));
      } catch (err) {
        console.error('Failed to cache news', err);
      }
    };

    fetchNews();
  }, [topic, questions, daysBack]);

  return news;
}
