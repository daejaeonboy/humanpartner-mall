import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { getBoardPostById, BoardPost, BoardPostType } from '../src/api/cmsApi';
import { parseGnbContent, stripGnbContentImages } from '../src/utils/gnbContent';
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildSeoDescription,
  SITE_URL,
  toAbsoluteUrl,
  toJsonLd,
} from '../src/utils/seo';

interface BoardPostDetailPageProps {
  boardType: BoardPostType;
}

const BOARD_META: Record<BoardPostType, { title: string; path: string }> = {
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

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

const renderLinkedText = (text: string) =>
  text.split(URL_PATTERN).map((part, index) => {
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#001E45] underline underline-offset-4 break-all hover:text-[#02306b]"
        >
          {part}
        </a>
      );
    }

    return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
  });

export const BoardPostDetailPage: React.FC<BoardPostDetailPageProps> = ({ boardType }) => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BoardPost | null>(null);
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
        const data = await getBoardPostById(id);
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
    if (!post) return `${meta.title} - 렌탈어때`;
    return `${post.title} - ${meta.title} - 렌탈어때`;
  }, [meta.title, post]);
  const contentBlocks = useMemo(() => parseGnbContent(post?.content), [post?.content]);
  const plainContent = useMemo(() => stripGnbContentImages(post?.content), [post?.content]);
  const canonicalUrl = `${SITE_URL}${meta.path}${id ? `/${id}` : ''}`;
  const seoDescription = buildSeoDescription(plainContent) || `${meta.title} 상세 페이지입니다.`;
  const seoImage = toAbsoluteUrl(post?.image_url || post?.mobile_image_url);
  const articleStructuredData = post
    ? toJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          buildBreadcrumbJsonLd([
            { name: '홈', item: `${SITE_URL}/` },
            { name: meta.title, item: `${SITE_URL}${meta.path}` },
            { name: post.title, item: canonicalUrl },
          ]),
          buildArticleJsonLd({
            headline: post.title,
            description: seoDescription,
            url: canonicalUrl,
            image: seoImage,
            datePublished: post.created_at,
            dateModified: post.updated_at || post.created_at,
            articleSection: meta.title,
          }),
        ],
      })
    : '';

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content={post ? 'article' : 'website'} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={seoImage} />
        <meta property="og:image:alt" content={post?.title || meta.title} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={seoImage} />
        {!loading && !post && <meta name="robots" content="noindex, nofollow" />}
        {post && <script type="application/ld+json">{articleStructuredData}</script>}
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
                <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 break-words [overflow-wrap:anywhere]">{post.title}</h1>
                <p className="text-sm text-gray-400 mt-4">{formatDate(post.created_at)}</p>
              </header>

              {(post.image_url || post.mobile_image_url) && (
                <div className="mb-10 overflow-hidden border border-gray-100">
                  <picture className="block w-full">
                    {post.mobile_image_url && <source media="(max-width: 767px)" srcSet={post.mobile_image_url} />}
                    <img src={post.image_url || post.mobile_image_url} alt={post.title} className="w-full h-auto object-contain bg-slate-50" />
                  </picture>
                </div>
              )}

              {contentBlocks.length > 0 ? (
                <div className="max-w-full space-y-6">
                  {contentBlocks.map((block, index) => (
                    block.type === 'image' ? (
                      <div key={`${block.type}-${index}`} className="overflow-hidden border border-slate-100 bg-slate-50">
                        <img
                          src={block.value}
                          alt={`${post.title} 본문 이미지 ${index + 1}`}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        key={`${block.type}-${index}`}
                        className="text-[16px] leading-8 text-slate-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                      >
                        {renderLinkedText(block.value)}
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="max-w-full text-[16px] leading-8 text-slate-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  등록된 상세 내용이 없습니다.
                </div>
              )}

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

export default BoardPostDetailPage;

