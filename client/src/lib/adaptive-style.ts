// Adaptive Style Strength Calculator
// Automatically adjusts style strength based on image content analysis

export interface ImageAnalysis {
  brightness: number;
  contrast: number;
  complexity: number;
  dominantColors: string[];
  hasText: boolean;
  hasFaces: boolean;
}

export interface StyleRecommendation {
  strength: number;
  reasoning: string;
  confidence: number;
}

export class AdaptiveStyleCalculator {
  
  /**
   * Analyze image content to determine optimal style strength
   */
  static async analyzeImage(imageFile: File | string): Promise<ImageAnalysis> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = Math.min(img.width, 256);
        canvas.height = Math.min(img.height, 256);
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        if (!imageData) {
          resolve(this.getDefaultAnalysis());
          return;
        }
        
        const analysis = this.calculateImageMetrics(imageData);
        resolve(analysis);
      };
      
      img.onerror = () => resolve(this.getDefaultAnalysis());
      
      if (typeof imageFile === 'string') {
        img.src = imageFile;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(imageFile);
      }
    });
  }
  
  /**
   * Calculate optimal style strength based on image analysis
   */
  static calculateOptimalStrength(
    analysis: ImageAnalysis, 
    modelType: string = 'STYLE'
  ): StyleRecommendation {
    let baseStrength = 0.7; // Default strength
    let reasoning = "Standardní síla stylu";
    let confidence = 0.7;
    
    // Adjust based on image complexity
    if (analysis.complexity > 0.8) {
      baseStrength = Math.max(0.3, baseStrength - 0.3);
      reasoning = "Snížená síla pro složité obrázky";
      confidence = 0.9;
    } else if (analysis.complexity < 0.3) {
      baseStrength = Math.min(1.0, baseStrength + 0.2);
      reasoning = "Zvýšená síla pro jednoduché obrázky";
      confidence = 0.8;
    }
    
    // Adjust for low contrast images
    if (analysis.contrast < 0.3) {
      baseStrength = Math.min(1.0, baseStrength + 0.1);
      reasoning = "Zvýšená síla pro nízký kontrast";
      confidence = Math.max(confidence, 0.8);
    }
    
    // Adjust for images with text or faces
    if (analysis.hasText || analysis.hasFaces) {
      baseStrength = Math.max(0.2, baseStrength - 0.2);
      reasoning = "Snížená síla pro zachování čitelnosti/tváří";
      confidence = 0.95;
    }
    
    // Model-specific adjustments
    if (modelType === 'PERSON') {
      baseStrength = Math.max(0.4, baseStrength - 0.1);
      reasoning += " (upraveno pro PERSON model)";
    }
    
    return {
      strength: Math.round(baseStrength * 100) / 100,
      reasoning,
      confidence
    };
  }
  
  /**
   * Generate real-time preview parameters
   */
  static getPreviewParams(strength: number, fast: boolean = true): {
    styleStrength: number;
    width: number;
    height: number;
    steps?: number;
  } {
    return {
      styleStrength: strength,
      width: fast ? 256 : 512,
      height: fast ? 256 : 512,
      ...(fast && { steps: 10 }) // Rychlejší generování pro preview
    };
  }
  
  private static calculateImageMetrics(imageData: ImageData): ImageAnalysis {
    const { data, width, height } = imageData;
    const pixels = data.length / 4;
    
    let totalBrightness = 0;
    let totalVariance = 0;
    const colorCounts: { [key: string]: number } = {};
    
    // Analyze each pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate brightness
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      totalBrightness += brightness;
      
      // Track dominant colors (simplified)
      const colorKey = `${Math.floor(r/32)}_${Math.floor(g/32)}_${Math.floor(b/32)}`;
      colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
    }
    
    const avgBrightness = totalBrightness / pixels;
    
    // Calculate variance for complexity estimation
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      totalVariance += Math.pow(brightness - avgBrightness, 2);
    }
    
    const variance = totalVariance / pixels;
    const contrast = Math.sqrt(variance);
    
    // Calculate complexity based on color diversity
    const uniqueColors = Object.keys(colorCounts).length;
    const complexity = Math.min(1, uniqueColors / (pixels * 0.1));
    
    // Get dominant colors
    const sortedColors = Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([color]) => {
        const [r, g, b] = color.split('_').map(x => parseInt(x) * 32);
        return `rgb(${r},${g},${b})`;
      });
    
    // Simple heuristics for text/face detection
    const hasHighContrast = contrast > 0.6;
    const hasStructuredPatterns = this.detectStructuredPatterns(imageData);
    
    return {
      brightness: Math.round(avgBrightness * 100) / 100,
      contrast: Math.round(contrast * 100) / 100,
      complexity: Math.round(complexity * 100) / 100,
      dominantColors: sortedColors,
      hasText: hasHighContrast && hasStructuredPatterns,
      hasFaces: false // Placeholder - would need more sophisticated detection
    };
  }
  
  private static detectStructuredPatterns(imageData: ImageData): boolean {
    // Simplified pattern detection
    // In a real implementation, this would use edge detection algorithms
    const { data, width } = imageData;
    let edgeCount = 0;
    
    for (let i = 0; i < data.length - width * 4; i += 4) {
      const current = data[i] + data[i + 1] + data[i + 2];
      const below = data[i + width * 4] + data[i + width * 4 + 1] + data[i + width * 4 + 2];
      
      if (Math.abs(current - below) > 100) {
        edgeCount++;
      }
    }
    
    return edgeCount > (data.length / 4) * 0.1; // 10% edge threshold
  }
  
  private static getDefaultAnalysis(): ImageAnalysis {
    return {
      brightness: 0.5,
      contrast: 0.5,
      complexity: 0.5,
      dominantColors: ['rgb(128,128,128)'],
      hasText: false,
      hasFaces: false
    };
  }
}

// Real-time preview utilities
export class PreviewGenerator {
  private static previewCache = new Map<string, string>();
  
  static async generatePreview(
    imageFile: File,
    modelId: string,
    strength: number,
    onProgress?: (progress: number) => void
  ): Promise<string | null> {
    const cacheKey = `${imageFile.name}_${modelId}_${strength}`;
    
    if (this.previewCache.has(cacheKey)) {
      return this.previewCache.get(cacheKey)!;
    }
    
    try {
      // Simulate progressive loading
      if (onProgress) {
        onProgress(0);
        await new Promise(resolve => setTimeout(resolve, 100));
        onProgress(30);
        await new Promise(resolve => setTimeout(resolve, 200));
        onProgress(70);
        await new Promise(resolve => setTimeout(resolve, 300));
        onProgress(100);
      }
      
      // In real implementation, this would call the EverArt API with preview parameters
      const previewParams = AdaptiveStyleCalculator.getPreviewParams(strength, true);
      
      // For now, return a placeholder that indicates preview generation
      const previewUrl = `preview_${modelId}_${strength}_${Date.now()}`;
      this.previewCache.set(cacheKey, previewUrl);
      
      return previewUrl;
    } catch (error) {
      console.error('Preview generation failed:', error);
      return null;
    }
  }
  
  static clearCache() {
    this.previewCache.clear();
  }
  
  static getCacheSize(): number {
    return this.previewCache.size;
  }
}