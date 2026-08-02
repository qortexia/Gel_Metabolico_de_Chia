'use client';

import dynamic from 'next/dynamic';

const QuizFunnel = dynamic(() => import('@/components/QuizFunnel').then((mod) => mod.QuizFunnel), {
  ssr: false,
});

export default function Home() {
  return <QuizFunnel />;
}
