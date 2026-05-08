"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { A11y, Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { FILE_BASE } from "@/lib/api";

interface HeroBanner {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  badgeText?: string | null;
  badgeColor?: string | null;
  autoSlide: boolean;
}

export function HeroSlider() {
  const router = useRouter();
  const { data: banners, isLoading } = useSWR<HeroBanner[]>("/banners", {
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return (
      <div className="hero-slider-shell overflow-hidden bg-card">
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5" />
      </div>
    );
  }

  if (!banners?.length) return null;

  const shouldAutoplay = banners.some((banner) => banner.autoSlide);

  return (
    <section className="hero-slider-shell overflow-hidden bg-black">
      <Swiper
        modules={[Autoplay, Pagination, A11y]}
        autoplay={
          shouldAutoplay
            ? { delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }
            : false
        }
        loop={banners.length > 1}
        pagination={{
          clickable: true,
          bulletClass: "slider-dot",
          bulletActiveClass: "slider-dot-active",
        }}
        spaceBetween={0}
        slidesPerView={1}
        onSlideChange={(swiper) => {
          const banner = banners[swiper.realIndex];
          if (!shouldAutoplay || !swiper.autoplay) return;
          if (banner?.autoSlide === false) swiper.autoplay.stop();
          else swiper.autoplay.start();
        }}
        className="h-full"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <article className="relative h-full w-full overflow-hidden">
              <picture>
                <source
                  media="(max-width: 767px)"
                  srcSet={bannerUrl(banner.mobileImageUrl || banner.imageUrl)}
                />
                <img
                  src={bannerUrl(banner.imageUrl)}
                  alt={banner.title}
                  className="h-full w-full object-cover"
                />
              </picture>
              <div className="hero-slider-overlay absolute inset-0" />
              <div className="absolute inset-x-5 bottom-9 z-10 text-center md:inset-x-auto md:left-10 md:max-w-xl md:text-left">
                {banner.badgeText && (
                  <span
                    className="hero-banner-badge mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                    style={{ backgroundColor: banner.badgeColor || "#E53935" }}
                  >
                    {banner.badgeText}
                  </span>
                )}
                <h1 className="hero-slider-title font-display font-bold text-white">
                  {banner.title}
                </h1>
                {banner.subtitle && (
                  <p className="mt-1 line-clamp-2 text-white/85">
                    {banner.subtitle}
                  </p>
                )}
                {banner.ctaText && banner.ctaLink && (
                  <button
                    type="button"
                    className="mt-4 rounded-md bg-[#E53935] px-4 py-2 text-[13px] font-bold text-white shadow-lg transition hover:brightness-110 md:px-5 md:py-2.5 md:text-sm"
                    onClick={() => router.push(banner.ctaLink || "/")}
                  >
                    {banner.ctaText}
                  </button>
                )}
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>

      <style jsx global>{`
        .hero-slider-shell {
          height: 220px;
          width: 100%;
        }
        @media (min-width: 768px) {
          .hero-slider-shell {
            aspect-ratio: 16 / 5;
            height: min(380px, 31.25vw);
          }
        }
        .hero-slider-overlay {
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0.2) 70%
          );
        }
        @media (min-width: 768px) {
          .hero-slider-overlay {
            background: linear-gradient(
              to right,
              rgba(0, 0, 0, 0.75) 0%,
              rgba(0, 0, 0, 0.3) 60%,
              transparent 100%
            );
          }
        }
        .hero-slider-title {
          font-size: clamp(18px, 3vw, 32px);
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
        }
        .hero-banner-badge {
          animation: heroBadgePulse 2s ease-in-out infinite;
        }
        @keyframes heroBadgePulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        .slider-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          margin: 0 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.4);
          transition: width 0.3s ease, background 0.3s ease;
        }
        .slider-dot-active {
          width: 18px;
          background: #fff;
        }
        .hero-slider-shell .swiper-pagination {
          bottom: 12px;
        }
      `}</style>
    </section>
  );
}

function bannerUrl(url?: string | null) {
  if (!url) return "/banners/ff-banner-1.svg";
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/banners/") && !url.endsWith(".svg")) return `${FILE_BASE}${url}`;
  return url;
}
