import { useState, useEffect } from 'react';

const NEWS_TTL_MS = 1000 * 60 * 480; // 8 hours
const STORAGE_KEY = 'newsFeedCache';

export default function useNewsFeed(topic = 'economy') {
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

      const newsApiKey = process.env.REACT_APP_NEWS_API_KEY;
      if (newsApiKey) {
        try {
          const url = `https://newsapi.org/v2/top-headlines?q=${encodeURIComponent(topic)}&sources=ap,bbc-news,reuters,npr,the-guardian-uk&language=en&apiKey=${newsApiKey}`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            items = json.articles.map(a => ({
              title: a.title,
              url: a.url,
              source: a.source?.name || 'NewsAPI'
            }));
          }
        } catch (err) {
          console.error('NewsAPI error', err);
        }
      }

      if (items.length === 0) {
        const guardianKey = process.env.REACT_APP_GUARDIAN_API_KEY || 'test';
        try {
          const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(topic)}&api-key=${guardianKey}`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            items = json.response.results.map(r => ({
              title: r.webTitle,
              url: r.webUrl,
              source: 'The Guardian'
            }));
          }
        } catch (err) {
          console.error('Guardian API error', err);
        }
      }

      setNews(items);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: items, timestamp: Date.now() }));
      } catch (err) {
        console.error('Failed to cache news', err);
      }
    };

    fetchNews();
  }, [topic]);

  return news;
}
