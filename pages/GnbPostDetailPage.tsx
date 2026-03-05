import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { getMiceTabPostById, MiceTabPost, MiceTabType } from '../src/api/cmsApi';

interface GnbPostDetailPageProps {
  boardType: MiceTabType;
}

const BOARD_META: Record<MiceTabType, { title: string; path: string }> = {
  notice: { title: '공지사항', path: '/notice' },
  event: { title: '이벤트', path: '/event' },
  review: { title: '설치후기', path: '/review' },
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ko-KR');
};

export const GnbPostDetailPage: React.FC<GnbPostDetailPageProps> = ({ boardType }) => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<MiceTabPost | null>(null);
  const [loading, setLoading] = useState(true);

  const meta = BOARD_META[boardType];

  useEffect(() => {
    const loadPost = async () => {
      if (!id) {
        setPost(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getMiceTabPostById(id);
        if (!data || data.board_type !== boardType) {
          setPost(null);
          return;
        }
        setPost(data);
      } catch (error) {
        console.error('Failed to load post detail:', error);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [boardType, id]);

  const pageTitle = useMemo(() => {
    if (!post) return `${meta.title} - 휴먼파트너`;
    return `${post.title} - ${meta.title} - 휴먼파트너`;
  }, [meta.title, post]);

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={post?.summary || `${meta.title} 상세 페이지입니다.`}
        />
      </Helmet>

      <div className="bg-white min-h-screen pb-20">
        <Container>
          <div className="py-10 md:py-12">
            <Link
              to={meta.path}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#001E45] transition-colors"
            >
              <ChevronLeft size={16} />
              {meta.title} 목록으로
            </Link>
          </div>

          {loading ? (
            <div className="py-24 text-center text-gray-500">데이터를 불러오는 중입니다...</div>
          ) : !post ? (
            <div className="py-24 text-center border border-gray-200 rounded-xl text-gray-500">
              게시글을 찾을 수 없습니다.
            </div>
          ) : (
            <article className="pb-10">
              <header className="border-b border-gray-200 pb-6 mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 break-words [overflow-wrap:anywhere]">{post.title}</h1>
                <p className="text-sm text-gray-400 mt-4">{formatDate(post.created_at)}</p>
              </header>

              {(post.image_url || post.mobile_image_url) && (
                <div className="mb-10 rounded-xl overflow-hidden border border-gray-100">
                  <picture className="block w-full">
                    {post.mobile_image_url && <source media="(max-width: 767px)" srcSet={post.mobile_image_url} />}
                    <img src={post.image_url || post.mobile_image_url} alt={post.title} className="w-full h-auto object-contain bg-slate-50" />
                  </picture>
                </div>
              )}

              {post.summary && (
                <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {post.summary}
                </div>
              )}

              <div className="max-w-full text-[16px] leading-8 text-slate-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {post.content?.trim() || '등록된 상세 내용이 없습니다.'}
              </div>

              {post.link && (
                <div className="mt-10 pt-6 border-t border-gray-100">
                  <a
                    href={post.link}
                    target={post.link.startsWith('http') ? '_blank' : undefined}
                    rel={post.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center px-5 py-2.5 bg-[#001E45] text-white rounded-lg hover:bg-[#022a5f] transition-colors text-sm font-medium"
                  >
                    관련 링크 바로가기
                  </a>
                </div>
              )}
            </article>
          )}
        </Container>
      </div>
    </>
  );
};
