import { useState, useEffect } from 'react';

const NEWS_TTL_MS = 1000 * 60 * 480; // 8 hours
const STORAGE_KEY = 'newsFeedCache';

const STOP_WORDS = new Set([
  'the','a','an','of','for','on','in','and','or','is','are','to','will','with',
  'by','from','it','that','this','which','at','as','be'
]);

function extractKeywordsFromText(text) {
  const tokens = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
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

      let newsApiItems = [];
      let guardianItems = [];
      let nytItems = [];

      const keywordsMap = Array.isArray(questions) && questions.length
        ? questions.reduce((acc, q) => {
            acc[q.id] = extractKeywordsFromText(q.title || '');
            return acc;
          }, {})
        : {};
      const allKeywords = Object.values(keywordsMap).flat();
      const searchKeywords = allKeywords.length ? Array.from(new Set(allKeywords)) : topic.split(/\s+/);
      const searchQuery = encodeURIComponent(searchKeywords.join(' '));
      const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const newsApiKey = process.env.REACT_APP_NEWS_API_KEY;
      if (newsApiKey) {
        try {
          // NewsAPI changed their free tier to only allow the top-headlines
          // endpoint. Using the everything endpoint now results in a 426
          // Upgrade Required error. Switch to top-headlines and drop the
          // unsupported parameters.
          const url =
            `https://newsapi.org/v2/top-headlines?q=${searchQuery}` +
            `&sources=ap,bbc-news,reuters,npr,the-guardian-uk` +
            `&language=en&pageSize=100&apiKey=${newsApiKey}`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            newsApiItems = json.articles.map(a => ({
              title: a.title,
              url: a.url,
              source: a.source?.name || 'NewsAPI',
              publishedAt: a.publishedAt
            }));
          } else {
            console.warn('NewsAPI request failed', res.status, res.statusText);
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
            guardianItems = json.response.results.map(r => ({
              title: r.webTitle,
              url: r.webUrl,
              source: 'The Guardian',
              publishedAt: r.webPublicationDate
            }));
          }
        } catch (err) {
          console.error('Guardian API error', err);
        }
    } else {
      console.warn('Guardian API key missing, skipping Guardian news fetch');
    }

      const nytKey = process.env.REACT_APP_NYT_API_KEY;
      if (nytKey) {
        try {
          // NYT Top Stories API - business section
          const topUrl = `https://api.nytimes.com/svc/topstories/v2/business.json?api-key=${nytKey}`;
          const topRes = await fetch(topUrl);
          if (topRes.ok) {
            const json = await topRes.json();
            const topItems = json.results
              .filter(r =>
                allKeywords.some(k =>
                  r.title.toLowerCase().includes(k) || r.abstract.toLowerCase().includes(k)
                )
              )
              .map(r => ({
                title: r.title,
                url: r.url,
                source: 'NYTimes',
                publishedAt: r.published_date
              }));
            nytItems = nytItems.concat(topItems);
          }

          // NYT Article Search API using question keywords
          const beginDate = fromDate.replace(/-/g, '');
          const searchUrl = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${searchQuery}&begin_date=${beginDate}&sort=newest&api-key=${nytKey}`;
          const searchRes = await fetch(searchUrl);
          if (searchRes.ok) {
            const json = await searchRes.json();
            const searchItems = json.response.docs.map(doc => ({
              title: doc.headline.main,
              url: doc.web_url,
              source: 'NYTimes',
              publishedAt: doc.pub_date
            }));
            nytItems = nytItems.concat(searchItems);
          }
        } catch (err) {
          console.error('NYTimes API error', err);
        }
      }

      const sources = [newsApiItems, guardianItems, nytItems];
      sources.forEach(arr => arr.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)));
      const maxLen = Math.max(...sources.map(arr => arr.length));
      const items = [];
      for (let i = 0; i < maxLen; i++) {
        for (const arr of sources) {
          if (i < arr.length) items.push(arr[i]);
        }
      }

      // relate articles to questions by matching keywords in the title
      if (questions && questions.length) {
        items.forEach(item => {
          const lower = item.title.toLowerCase();
          item.relatedQuestions = Object.entries(keywordsMap)
            .filter(([, kws]) => kws.some(k => lower.includes(k)))
            .map(([id]) => id);
        });
      }

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
