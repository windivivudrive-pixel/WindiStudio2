import Link from 'next/link';
import { getPublishedNews } from '@/lib/news-repository';

/** A single, intentionally quiet news line for the top of the home hero. */
export async function HeroNewsTicker() {
  const items = (await getPublishedNews()).slice(0, 4);
  return (
    <section className="hero-news-ticker" aria-label="Tin mới về AI và công cụ">
      <div className="hero-news-track">
        {[...items, ...items].map((item, index) => (
          <Link
            className="hero-news-item"
            href={`/news/${item.slug}`}
            key={`${item.slug}-${index}`}
            aria-hidden={index >= items.length || undefined}
            tabIndex={index >= items.length ? -1 : undefined}
          >
            <b>WINDI NEWS</b>
            <span>{item.ticker}</span>
            <time dateTime={item.publishedAt}>{item.shortDate}</time>
          </Link>
        ))}
      </div>
    </section>
  );
}
