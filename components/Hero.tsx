import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Container } from './ui/Container';
import { getHeroBanners, Banner } from '../src/api/cmsApi';

export const Hero: React.FC = () => {
  const [slides, setSlides] = useState<Banner[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<number | null>(null);
  const dragCurrentRef = useRef<number | null>(null);
  const suppressSlideClickRef = useRef(false);
  const suppressResetTimerRef = useRef<number | null>(null);

  // Load banners from DB
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const banners = await getHeroBanners();
        setSlides(banners);
      } catch (error) {
        console.error('Failed to load banners:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBanners();
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (slides.length === 0 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const resetDragState = () => {
    dragStartRef.current = null;
    dragCurrentRef.current = null;
    setIsDragging(false);
  };

  const beginDrag = (clientX: number) => {
    if (suppressResetTimerRef.current) {
      window.clearTimeout(suppressResetTimerRef.current);
      suppressResetTimerRef.current = null;
    }

    dragStartRef.current = clientX;
    dragCurrentRef.current = clientX;
    setIsDragging(true);
    suppressSlideClickRef.current = false;
    setIsPaused(true);
  };

  const updateDrag = (clientX: number) => {
    if (dragStartRef.current === null) return;

    dragCurrentRef.current = clientX;
    if (Math.abs(dragStartRef.current - clientX) > 10) {
      suppressSlideClickRef.current = true;
    }
  };

  const endDrag = () => {
    if (dragStartRef.current === null || dragCurrentRef.current === null) {
      resetDragState();
      setIsPaused(false);
      return;
    }

    const distance = dragStartRef.current - dragCurrentRef.current;
    if (distance > 50) nextSlide();
    else if (distance < -50) prevSlide();

    if (suppressSlideClickRef.current) {
      suppressResetTimerRef.current = window.setTimeout(() => {
        suppressSlideClickRef.current = false;
        suppressResetTimerRef.current = null;
      }, 0);
    }

    resetDragState();
    setIsPaused(false);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateDrag(e.clientX);
    };

    const handleMouseUp = () => {
      endDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    return () => {
      if (suppressResetTimerRef.current) {
        window.clearTimeout(suppressResetTimerRef.current);
      }
    };
  }, []);

  const handleSlideClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!suppressSlideClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    suppressSlideClickRef.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    beginDrag(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    beginDrag(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    updateDrag(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    endDrag();
  };

  if (loading) {
    return (
      <section className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={40} />
      </section>
    );
  }

  if (slides.length === 0) {
    return (
      <section className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] bg-slate-900 flex items-center justify-center">
        <p className="text-white/50">배너가 없습니다. Admin에서 배너를 추가해주세요.</p>
      </section>
    );
  }

  return (
    <section
      className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] bg-slate-900 overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (!isDragging) {
          setIsPaused(false);
        }
      }}
    >
      <div
        className={`relative h-full select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Slides */}
        {slides.map((slide, index) => {
          const linkHref = slide.target_product_code ? `/p/${slide.target_product_code}` : slide.link || '/';
          const isExternal = linkHref.startsWith('http');

          const SlideContent = (
            <>
              {/* Background Image */}
              <div
                className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-[7000ms] group-hover/slide:scale-105"
                style={{ backgroundImage: `url(${slide.image_url})` }}
              >
                <div className="absolute inset-0 bg-black/30 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
              </div>

              {/* Content Area */}
              <Container className="relative h-full flex flex-col justify-center text-white z-20">
                <div className="max-w-4xl">
                  {/* Brand Text */}
                  <div className={`text-white text-[18px] md:text-[20px] font-medium mb-2 md:mb-4 transition-all duration-700
                    ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}>
                    {slide.brand_text?.trim() || 'Humanpartner'}
                  </div>

                  {/* Main Title */}
                  <h1 className={`text-3xl md:text-5xl lg:text-6xl font-semibold leading-[1.1] tracking-tight text-white mb-4 md:mb-6 transition-all duration-1000 delay-300 transform
                    ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                  `}>
                    {slide.title}
                  </h1>

                  {/* Subtitle */}
                  <p className={`text-[18px] md:text-[22px] font-normal text-white/90 leading-relaxed break-keep max-w-2xl transition-all duration-1000 delay-500 transform
                    ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                  `}>
                    {slide.subtitle}
                  </p>

                  {/* Action CTA */}
                  <div className={`mt-8 md:mt-10 transition-all duration-1000 delay-700 transform
                    ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                  `}>
                    <div className="inline-flex items-center justify-center gap-2 w-[160px] md:w-[220px] h-[44px] md:h-[52px] rounded-lg bg-white text-[#001E45] text-sm md:text-base font-semibold shadow-lg transition-all duration-300 hover:bg-[#f8f9fa] hover:-translate-y-0.5">
                      {slide.button_text?.trim() || '바로가기'}
                    </div>
                  </div>
                </div>
              </Container>
            </>
          );

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out
                ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}
              `}
            >
              {isExternal ? (
                <a
                  href={linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full relative group/slide cursor-pointer"
                  onClick={handleSlideClick}
                >
                  {SlideContent}
                </a>
              ) : (
                <Link
                  to={linkHref}
                  className="block w-full h-full relative group/slide cursor-pointer"
                  onClick={handleSlideClick}
                >
                  {SlideContent}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        onClick={prevSlide}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md hidden md:flex items-center justify-center text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft size={28} />
      </button>
      <button
        type="button"
        onClick={nextSlide}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md hidden md:flex items-center justify-center text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight size={28} />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goToSlide(index)}
            className="group py-4"
            aria-label={`Go to slide ${index + 1}`}
          >
            <div className={`h-1 transition-all duration-500 rounded-full
              ${index === currentSlide ? 'w-10 bg-[#001E45]' : 'w-6 bg-white/30 group-hover:bg-white/50'}
            `} />
          </button>
        ))}
      </div>
    </section>
  );
};
