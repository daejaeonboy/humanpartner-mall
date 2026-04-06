import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getHeroBanners, Banner } from '../src/api/cmsApi';

export const Hero: React.FC = () => {
  const [originalSlides, setOriginalSlides] = useState<Banner[]>([]);
  const [slides, setSlides] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Load banners from DB
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const banners = await getHeroBanners();
        setOriginalSlides(banners);
        if (banners.length > 0) {
          // Clone slides for infinite loop: [Last, ...Original, First]
          setSlides([
            banners[banners.length - 1],
            ...banners,
            banners[0]
          ]);
          setCurrentIndex(1);
        }
      } catch (error) {
        console.error('Failed to load banners:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBanners();
  }, []);

  const handleNext = useCallback(() => {
    if (!isTransitioning && currentIndex >= slides.length - 1) return;
    setCurrentIndex((prev) => prev + 1);
    setIsTransitioning(true);
  }, [isTransitioning, currentIndex, slides.length]);

  const handlePrev = useCallback(() => {
    if (!isTransitioning && currentIndex <= 0) return;
    setCurrentIndex((prev) => prev - 1);
    setIsTransitioning(true);
  }, [isTransitioning, currentIndex]);

  // Handle jump for infinite loop
  useEffect(() => {
    if (currentIndex === 0) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(slides.length - 2);
      }, 500);
      return () => clearTimeout(timer);
    } else if (currentIndex === slides.length - 1) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, slides.length]);

  // Auto-slide effect
  useEffect(() => {
    if (originalSlides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [originalSlides.length, isPaused, handleNext]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) handleNext();
    else if (distance < -50) handlePrev();
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (loading) {
    return (
      <section className="relative w-full h-[300px] md:h-[450px] lg:h-[550px] bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={40} />
      </section>
    );
  }

  if (originalSlides.length === 0) {
    return (
      <section className="relative w-full h-[300px] md:h-[450px] lg:h-[550px] bg-white flex items-center justify-center">
        <p className="text-slate-400">배너가 없습니다. Admin에서 배너를 추가해주세요.</p>
      </section>
    );
  }

  const activeOriginalIndex = 
    currentIndex === 0 ? originalSlides.length - 1 :
    currentIndex === slides.length - 1 ? 0 :
    currentIndex - 1;

  return (
    <section 
      className="relative w-full bg-white overflow-hidden group [--slide-width:100vw] lg:[--slide-width:1280px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slider Container */}
      <div 
        className={`flex items-center ${isTransitioning ? 'transition-transform duration-500 ease-out' : ''}`}
        style={{ 
          // Center logic: 50vw - (slideWidth * (index + 0.5))
          // For mobile (100vw), this naturally aligns perfectly.
          transform: `translateX(calc(50vw - (var(--slide-width) * (${currentIndex} + 0.5))))`,
          width: `calc(var(--slide-width) * ${slides.length})`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, index) => {
          const linkHref = slide.target_product_code ? `/p/${slide.target_product_code}` : slide.link || '/';
          const isExternal = linkHref.startsWith('http');
          const isActive = index === currentIndex;

          const SlideInner = (
            <div 
              className={`relative h-[300px] md:h-[450px] lg:h-[550px] lg:rounded-[16px] overflow-hidden transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-100'}`}
            >
              {/* Background Image */}
              <div
                className="absolute inset-0 w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.image_url})` }}
              >
                <div className="absolute inset-0 bg-black/10 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              </div>

              {/* Content Overlay */}
              <div className={`absolute bottom-8 md:bottom-12 left-8 md:left-16 text-white transition-all duration-700 delay-300 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4 drop-shadow-md">
                  {slide.title}
                </h2>
                <p className="text-sm md:text-xl text-white/90 font-medium drop-shadow-md">
                  {slide.subtitle}
                </p>
              </div>
            </div>
          );

          return (
            <div 
              key={`${slide.id}-${index}`} 
              className="flex-shrink-0 lg:px-3"
              style={{ width: `var(--slide-width)` }}
            >
              {isExternal ? (
                <a href={linkHref} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                  {SlideInner}
                </a>
              ) : (
                <Link to={linkHref} className="block w-full h-full">
                  {SlideInner}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-4 md:left-8 top-[150px] md:top-[225px] lg:top-[275px] -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 md:right-8 top-[150px] md:top-[225px] lg:top-[275px] -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight size={24} />
      </button>

      {/* Indicators (Dots) */}
      <div className="flex justify-center gap-2 mt-4 mb-2">
        {originalSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index + 1);
              setIsTransitioning(true);
            }}
            className={`h-1.5 md:h-2 rounded-full transition-all duration-300 ${index === activeOriginalIndex ? 'w-6 md:w-10 bg-[#001E45]' : 'w-1.5 md:w-2 bg-slate-300 hover:bg-slate-400'}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};
