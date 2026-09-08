import type { Metadata } from 'next';
import { NewsPage } from '@/windi/news-page';

export const metadata: Metadata = {
  title: 'Tin tức AI & Xu hướng công nghệ mới nhất | Windi News',
  description: 'Tổng hợp tin tức AI, Copilot, ChatGPT, Gemini chính thống từ nguồn gốc, phân tích chuyên sâu kèm hình ảnh minh họa và liên kết kiểm chứng.',
  alternates: { canonical: '/news' },
  openGraph: {
    title: 'Tin tức AI & Xu hướng công nghệ mới nhất · Windi News',
    description: 'Bản tin AI chọn lọc, phân tích chuyên sâu cho công việc thực tế, có ảnh và link nguồn gốc đối chiếu.',
    url: 'https://windistudio.app/news',
    siteName: 'WindiStudio',
    locale: 'vi_VN',
    type: 'website',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        width: 1200,
        height: 630,
        alt: 'Windi News - Tin tức AI chọn lọc',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tin tức AI chọn lọc · Windi News',
    description: 'Bản tin AI chọn lọc, viết dễ hiểu cho công việc thực tế, có ảnh và link nguồn gốc.',
    images: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'],
  },
};

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { category = '' } = await searchParams;
  return <NewsPage category={category} />;
}
