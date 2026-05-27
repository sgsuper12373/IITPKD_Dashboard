import { useState, useEffect } from 'react';
import './ImageSlider.css';

function ImageSlider({ images = [], autoSlideInterval = 4000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Normalize: plain strings → cover + autoSlideInterval; objects use their own props.
  const slides = images.map((img) =>
    typeof img === 'string'
      ? { src: img, duration: autoSlideInterval, objectFit: 'cover' }
      : {
          src: img.src,
          duration: img.duration ?? autoSlideInterval,
          objectFit: img.objectFit ?? 'cover',
        }
  );

  // Per-slide auto-advance via setTimeout so each slide can have its own duration.
  useEffect(() => {
    if (slides.length <= 1) return;
    const duration = slides[currentIndex]?.duration ?? autoSlideInterval;
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, slides.length, autoSlideInterval]);

  const goToSlide = (index) => setCurrentIndex(index);

  const goToPrevious = () =>
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  const goToNext = () =>
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));

  if (!images || images.length === 0) {
    return (
      <div className="image-slider-container">
        <div className="image-slider-placeholder">
          <p>No images available. Please add images to display.</p>
          <p className="image-slider-instructions">
            Place images in: <code>Frontend/src/assets/images/iit-palakkad/</code>
            <br />
            Then import and pass them to the ImageSlider component.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="image-slider-container">
      {/* Row: [prev arrow] [image box] [next arrow] — arrows are flex siblings, NOT inside the image box */}
      <div className="image-slider-row">
        {slides.length > 1 && (
          <button
            className="slider-button slider-button-prev"
            onClick={goToPrevious}
            aria-label="Previous image"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 6 L8 12 L14 18" />
            </svg>
          </button>
        )}

        {/* Image box — overflow:hidden stays here; arrows are outside so they won't be clipped */}
        <div className="image-slider-wrapper">
          <div className="image-slider-track">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`slider-slide ${index === currentIndex ? 'active' : ''}`}
              >
                <img
                  src={slide.src}
                  alt={`IIT Palakkad ${index + 1}`}
                  className="slider-image"
                  style={{ objectFit: slide.objectFit }}
                  decoding="async"
                />
              </div>
            ))}
          </div>
        </div>

        {slides.length > 1 && (
          <button
            className="slider-button slider-button-next"
            onClick={goToNext}
            aria-label="Next image"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 6 L16 12 L10 18" />
            </svg>
          </button>
        )}
      </div>

      {/* Dots below the image row */}
      {slides.length > 1 && (
        <div className="slider-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`slider-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageSlider;
