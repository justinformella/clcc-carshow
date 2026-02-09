/* eslint-disable @next/next/no-img-element */
export default function Gallery() {
  return (
    <section className="gallery">
      <div className="gallery-header">
        <span className="section-label">From Previous Years</span>
        <h2 className="section-title">Gallery</h2>
      </div>
      <div className="gallery-grid">
        <div className="gallery-item large">
          <img
            src="/images/PXL_20250831_173006625.jpg"
            alt="Classic Jaguar XK at Crystal Lake Cars and Caffeine"
          />
        </div>
        <div className="gallery-item">
          <img
            src="/images/PXL_20250831_160924653.jpg"
            alt="Ferrari California at car show"
          />
        </div>
        <div className="gallery-item">
          <img
            src="/images/PXL_20250831_161026331.jpg"
            alt="Classic hot rod"
          />
        </div>
        <div className="gallery-item">
          <img
            src="/images/PXL_20250831_160203006.jpg"
            alt="Mazda Miata at downtown Crystal Lake"
          />
        </div>
        <div className="gallery-item">
          <img
            src="/images/PXL_20250831_155601203.jpg"
            alt="Street view of car show"
          />
        </div>
        <div className="gallery-item">
          <img
            src="/images/PXL_20250831_155721458.jpg"
            alt="Downtown Crystal Lake with cars"
          />
        </div>
        <div className="gallery-item">
          <img
            src="/images/PXL_20250831_173144069.jpg"
            alt="Classic car detail"
          />
        </div>
      </div>
    </section>
  );
}
