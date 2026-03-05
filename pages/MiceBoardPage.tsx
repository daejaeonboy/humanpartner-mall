import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '../components/ui/Container';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMiceTabPosts, MiceTabPost, MiceTabType } from '../src/api/cmsApi';

interface MiceBoardPageProps {
  boardType: MiceTabType;
}

interface BoardMeta {
  title: string;
  description: string;
  placeholder: string;
  metaTitle: string;
  metaDescription: string;
}

const BOARD_META: Record<MiceTabType, BoardMeta> = {
  notice: {
    title: '공지사항',
    description: '휴먼파트너 서비스 최신 공지사항을 확인하실 수 있습니다.',
    placeholder: '공지 제목 또는 내용을 입력해주세요.',
    metaTitle: '공지사항 - 휴먼파트너',
    metaDescription: '휴먼파트너 공지사항 페이지입니다.'
  },
  event: {
    title: '이벤트',
    description: '진행 중인 이벤트와 프로모션 소식을 한눈에 확인하실 수 있습니다.',
    placeholder: '이벤트 제목 또는 내용을 입력해주세요.',
    metaTitle: '이벤트 - 휴먼파트너',
    metaDescription: '휴먼파트너 이벤트 페이지입니다.'
  },
  review: {
    title: '설치후기',
    description: '현장 설치 사례와 운영 후기를 통해 서비스 품질을 확인해보세요.',
    placeholder: '후기 제목 또는 내용을 입력해주세요.',
    metaTitle: '설치후기 - 휴먼파트너',
    metaDescription: '휴먼파트너 설치후기 페이지입니다.'
  }
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ko-KR');
};

const BOARD_PATH: Record<MiceTabType, string> = {
  notice: '/notice',
  event: '/event',
  review: '/review',
};

export const MiceBoardPage: React.FC<MiceBoardPageProps> = ({ boardType }) => {
  const meta = BOARD_META[boardType];
  const [posts, setPosts] = useState<MiceTabPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const data = await getMiceTabPosts(boardType);
        setPosts(data);
      } catch (error) {
        console.error(`Failed to load ${boardType} posts:`, error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [boardType]);

  const filteredPosts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return posts;

    return posts.filter((post) => {
      const haystacks = [post.title, post.summary || '', post.content || ''];
      return haystacks.some((text) => text.toLowerCase().includes(keyword));
    });
  }, [posts, searchTerm]);

  const totalItems = filteredPosts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredPosts.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  return (
    <>
      <Helmet>
        <title>{meta.metaTitle}</title>
        <meta name="description" content={meta.metaDescription} />
      </Helmet>

      <div className="bg-white min-h-screen pb-20">
        <Container>
          <div className="py-10 md:py-16 text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{meta.title}</h2>
            <p className="text-gray-500 whitespace-pre-line text-[14px] md:text-[15px] leading-relaxed break-keep">
              {meta.description}
            </p>
          </div>

          <div className="bg-[#f7f8f9] py-6 md:py-8 px-4 md:px-6 flex justify-start items-center mb-10 rounded-sm">
            <div className="flex w-full max-w-2xl bg-white border border-gray-200 shadow-sm">
              <div className="w-[80px] md:w-[150px] border-r border-gray-200 px-3 md:px-4 py-3 text-sm text-gray-600 flex justify-between items-center bg-white cursor-pointer shrink-0">
                전체
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={meta.placeholder}
                className="flex-1 min-w-0 px-3 md:px-4 py-3 text-sm outline-none bg-transparent"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <button className="bg-[#222] text-white px-5 md:px-8 py-3 text-sm font-medium hover:bg-black transition-colors shrink-0">
                검색
              </button>
            </div>
          </div>

          <div className="flex justify-between items-end pb-4 border-b border-gray-900 mb-8">
            <p className="text-sm">
              <span className="text-gray-500">전체</span> <span className="font-bold text-gray-900">{totalItems}건</span>
              <span className="mx-3 text-gray-300">|</span>
              <span className="text-gray-500">현재페이지</span> <span className="font-bold text-gray-900">{currentPage}/{totalPages}</span>
            </p>
          </div>

          {loading ? (
            <div className="py-24 text-center mb-16">
              <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
            </div>
          ) : currentItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
              {currentItems.map((post, index) => {
                const detailPath = post.id ? `${BOARD_PATH[boardType]}/${post.id}` : BOARD_PATH[boardType];

                return (
                <Link
                  key={post.id || `${post.title}-${index}`}
                  to={detailPath}
                  className="group block"
                >
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-gray-400 transition-colors">
                    <div className="aspect-[16/18] md:aspect-[16/9] bg-[#f2f4f7] overflow-hidden">
                      {(post.image_url || post.mobile_image_url) ? (
                        <picture className="block w-full h-full">
                          {post.mobile_image_url && <source media="(max-width: 767px)" srcSet={post.mobile_image_url} />}
                          <img
                            src={post.image_url || post.mobile_image_url}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          />
                        </picture>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          썸네일 이미지 없음
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="pt-4 px-1">
                    <h3 className="text-[22px] font-bold text-gray-900 leading-tight break-keep line-clamp-2">{post.title}</h3>
                    <p className="text-[15px] text-gray-500 mt-3 leading-relaxed break-keep line-clamp-2">
                      {(post.summary || post.content || '').trim() || '등록된 요약 정보가 없습니다.'}
                    </p>
                    <p className="text-[13px] text-gray-400 mt-5">{formatDate(post.created_at)}</p>
                  </div>
                </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-24 text-center border-b border-gray-200 mb-16">
              <p className="text-gray-500">검색 결과가 없습니다.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 font-sans">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 10 && currentPage > 5) {
                  pageNum = currentPage - 5 + i;
                  if (pageNum > totalPages) return null;
                }
                if (pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center border text-[13px] transition-colors ${currentPage === pageNum
                        ? 'border-[#222] bg-[#222] text-white font-bold'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          )}
        </Container>
      </div>
    </>
  );
};
