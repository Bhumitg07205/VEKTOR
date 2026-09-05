export const FRAME_COUNT = 240;

export const currentFrame = (index: number) => 
  `/newhero-sequence/frame_${(index + 1).toString().padStart(4, '0')}.webp`;

class HeroPreloader {
  public images: HTMLImageElement[] = [];
  public isLoaded = false;
  private listeners: (() => void)[] = [];
  
  preload() {
    if (this.images.length > 0) return; // already started loading
    
    let loadedCount = 0;
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      // We don't set src immediately for all if we want to stagger, but for now we set it.
      img.src = currentFrame(i);
      
      const onImageLoad = () => {
        loadedCount++;
        if (loadedCount === FRAME_COUNT) {
          this.isLoaded = true;
          this.notifyListeners();
        }
      };

      img.onload = onImageLoad;
      img.onerror = onImageLoad; // Don't block if an image fails
      
      this.images.push(img);
    }
  }

  onLoad(callback: () => void) {
    if (this.isLoaded) {
      callback();
    } else {
      this.listeners.push(callback);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb());
    this.listeners = [];
  }
}

export const heroPreloader = typeof window !== 'undefined' ? new HeroPreloader() : null;
