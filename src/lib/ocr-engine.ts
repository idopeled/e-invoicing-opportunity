import { createWorker, Worker } from 'tesseract.js'

// Dynamic import for PDF.js to avoid SSR issues
let pdfjs: any = null

async function loadPdfjs() {
  if (typeof window !== 'undefined' && !pdfjs) {
    // Import react-pdf components
    const reactPdf = await import('react-pdf')
    pdfjs = reactPdf.pdfjs
    
    // Configure worker manually to ensure it works
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      // Try different worker URLs in order of preference
      const workerUrls = [
        `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
        // Fallback to a known working version
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
      ]
      
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrls[0]
    }
    
    console.log(`PDF.js loaded with version ${pdfjs.version}, worker: ${pdfjs.GlobalWorkerOptions.workerSrc}`)
  }
  return pdfjs
}

export interface ExtractedInvoiceData {
  id: string
  invoiceNumber?: string
  date?: string
  time?: string
  dueDate?: string
  vendor?: string
  vendorAddress?: string
  vendorPhone?: string
  vendorEmail?: string
  billTo?: string
  billToAddress?: string
  subtotal?: number
  tax?: number
  total?: number
  currency?: string
  
  // Financial/Transaction fields
  transactionId?: string
  authorizationCode?: string
  terminalId?: string
  merchantId?: string
  cardNumber?: string
  paymentMethod?: string
  
  // Extra fields for additional data
  extraField1?: string
  extraField2?: string
  extraField3?: string
  extraField4?: string
  extraField5?: string
  
  items?: InvoiceItem[]
  rawText?: string
  
  // Processing metadata
  processingMethod?: string
  confidence?: number
  processingTime?: number
}

export interface InvoiceItem {
  description: string
  quantity?: number
  unitPrice?: number
  amount?: number
}

interface ImageVariant {
  canvas: HTMLCanvasElement
  name: string
  description: string
}

interface OCRConfig {
  psm: string
  name: string
  description: string
  parameters?: Record<string, string>
}

interface OCRResult {
  text: string
  confidence: number
  method: string
  processingTime: number
}

export class EnterpriseOCREngine {
  private worker: Worker | null = null
  private isInitialized = false
  private processingStats = {
    totalProcessed: 0,
    averageConfidence: 0,
    averageProcessingTime: 0
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      console.log('🚀 Initializing Enterprise OCR Engine...')
      this.worker = await createWorker('eng')
      
      // Basic initialization with optimal settings
      await this.worker.setParameters({
        tessedit_pageseg_mode: 6 as any,
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$():- \n\t',
      })
      
      this.isInitialized = true
      console.log('✅ Enterprise OCR Engine initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize OCR Engine:', error)
      throw new Error(`OCR initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async processDocument(file: File): Promise<string> {
    const startTime = performance.now()
    
    try {
      if (!this.worker || !this.isInitialized) {
        await this.initialize()
      }

      console.log(`📄 Processing document: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      
      let result: string
      
      if (file.type === 'application/pdf') {
        result = await this.processPDF(file)
      } else {
        result = await this.processImage(file)
      }
      
      const processingTime = performance.now() - startTime
      console.log(`✅ Document processing completed in ${processingTime.toFixed(2)}ms`)
      console.log(`📊 Extracted ${result.length} characters`)
      
      // Update processing stats
      this.updateProcessingStats(processingTime)
      
      return result
    } catch (error) {
      const processingTime = performance.now() - startTime
      console.error(`❌ Document processing failed after ${processingTime.toFixed(2)}ms:`, error)
      throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async processPDF(file: File): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('PDF processing is only available in the browser')
    }

    try {
      const pdfjsLib = await loadPdfjs()
      if (!pdfjsLib) {
        throw new Error('Failed to load PDF processing library')
      }

      console.log('📖 Converting PDF to images...')
      const arrayBuffer = await file.arrayBuffer()
      
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      })
      
      const pdf = await loadingTask.promise
      console.log(`📄 PDF loaded: ${pdf.numPages} pages`)
      
      let combinedText = ''

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`📋 Processing page ${pageNum}/${pdf.numPages}`)
        const page = await pdf.getPage(pageNum)
        const viewport = page.getViewport({ scale: 3.0 }) // Higher scale for better OCR
        
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')!
        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        await page.render(renderContext).promise
        
        // Process this page image with our advanced OCR
        const pageText = await this.processImageCanvas(canvas, `${file.name}-page-${pageNum}`)
        combinedText += pageText + '\n\n'
      }

      await loadingTask.destroy()
      console.log('✅ PDF processing completed')
      return combinedText
    } catch (error) {
      console.error('❌ PDF processing failed:', error)
      throw new Error(`Unable to process PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async processImage(file: File): Promise<string> {
    console.log('🖼️ Processing image with advanced OCR pipeline...')
    
    // Create multiple preprocessed variants
    const imageVariants = await this.createImageVariants(file)
    console.log(`🎨 Created ${imageVariants.length} image variants`)
    
    // Define OCR configuration strategies
    const ocrConfigs = this.getOCRConfigurations()
    console.log(`⚙️ Testing ${ocrConfigs.length} OCR configurations`)
    
    // Process all combinations and find the best result
    const bestResult = await this.performMultiEngineOCR(imageVariants, ocrConfigs, file.name)
    
    return bestResult.text
  }

  private async processImageCanvas(canvas: HTMLCanvasElement, filename: string): Promise<string> {
    console.log('🖼️ Processing canvas with advanced OCR pipeline...')
    
    // Convert canvas to image variants
    const imageVariants = await this.createCanvasVariants(canvas)
    console.log(`🎨 Created ${imageVariants.length} canvas variants`)
    
    // Define OCR configuration strategies
    const ocrConfigs = this.getOCRConfigurations()
    
    // Process all combinations and find the best result
    const bestResult = await this.performMultiEngineOCR(imageVariants, ocrConfigs, filename)
    
    return bestResult.text
  }

  private async createImageVariants(file: File): Promise<ImageVariant[]> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = async () => {
        try {
          const variants = await this.createCanvasVariants(img)
          resolve(variants)
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  private async createCanvasVariants(source: HTMLImageElement | HTMLCanvasElement): Promise<ImageVariant[]> {
    const variants: ImageVariant[] = []
    
    // Get source dimensions
    const sourceWidth = source instanceof HTMLImageElement ? source.width : source.width
    const sourceHeight = source instanceof HTMLImageElement ? source.height : source.height
    
    console.log(`📐 Source dimensions: ${sourceWidth}x${sourceHeight}`)
    
    // Calculate optimal target size (ensure minimum 400px width, maximum 2500px)
    const minWidth = 400
    const maxWidth = 2500
    const targetWidth = Math.max(minWidth, Math.min(maxWidth, sourceWidth * 2))
    const targetHeight = Math.round((targetWidth / sourceWidth) * sourceHeight)
    
    console.log(`🎯 Target dimensions: ${targetWidth}x${targetHeight}`)
    
    // Variant 1: Enhanced contrast with noise reduction
    variants.push(await this.createProcessedVariant(source, targetWidth, targetHeight, 'enhanced', {
      description: 'Enhanced contrast with noise reduction',
      contrastBoost: 1.3,
      brightnessAdjust: 10,
      noiseReduction: true
    }))
    
    // Variant 2: High contrast black and white
    variants.push(await this.createProcessedVariant(source, targetWidth, targetHeight, 'blackwhite', {
      description: 'High contrast black and white',
      threshold: 128,
      adaptiveThreshold: true
    }))
    
    // Variant 3: Sharpened original
    variants.push(await this.createProcessedVariant(source, targetWidth, targetHeight, 'sharpened', {
      description: 'Sharpened with edge enhancement',
      sharpen: true,
      edgeEnhancement: 0.8
    }))
    
    // Variant 4: Optimized for text recognition
    variants.push(await this.createProcessedVariant(source, targetWidth, targetHeight, 'textOptimized', {
      description: 'Optimized specifically for text recognition',
      textOptimization: true,
      contrastBoost: 1.2
    }))

    return variants
  }

  private async createProcessedVariant(
    source: HTMLImageElement | HTMLCanvasElement, 
    width: number, 
    height: number, 
    name: string, 
    options: any
  ): Promise<ImageVariant> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    canvas.width = width
    canvas.height = height
    
    // Draw with high quality settings
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, width, height)
    
    // Apply processing based on variant type
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Convert to grayscale
      let gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      
      let processed: number
      
      switch (name) {
        case 'enhanced':
          // Enhanced contrast with noise reduction
          if (options.contrastBoost) {
            gray = Math.round((gray - 128) * options.contrastBoost + 128)
          }
          if (options.brightnessAdjust) {
            gray += options.brightnessAdjust
          }
          processed = Math.max(0, Math.min(255, gray))
          break
          
        case 'blackwhite':
          // Adaptive threshold for better text separation
          const threshold = options.adaptiveThreshold ? 
            this.calculateAdaptiveThreshold(data, i, width, height) : 
            options.threshold
          processed = gray < threshold ? 0 : 255
          break
          
        case 'sharpened':
          // Apply sharpening filter (simplified)
          processed = options.sharpen ? 
            Math.max(0, Math.min(255, gray + (gray - 128) * 0.5)) : gray
          break
          
        case 'textOptimized':
          // Specifically optimize for text readability
          if (gray < 80) {
            processed = Math.max(0, gray - 20) // Make dark text darker
          } else if (gray > 200) {
            processed = Math.min(255, gray + 20) // Make background lighter
          } else {
            processed = gray < 140 ? gray - 10 : gray + 10 // Increase contrast in mid-range
          }
          break
          
        default:
          processed = gray
      }
      
      data[i] = processed     // Red
      data[i + 1] = processed // Green  
      data[i + 2] = processed // Blue
      // Alpha stays the same
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    return {
      canvas,
      name,
      description: options.description
    }
  }

  private calculateAdaptiveThreshold(data: Uint8ClampedArray, index: number, width: number, height: number): number {
    // Simple adaptive threshold calculation
    // In a real implementation, this would be more sophisticated
    const pixel = Math.floor(index / 4)
    const x = pixel % width
    const y = Math.floor(pixel / width)
    
    let sum = 0
    let count = 0
    
    // Sample surrounding pixels in a 5x5 area
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4
          const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2])
          sum += gray
          count++
        }
      }
    }
    
    const average = count > 0 ? sum / count : 128
    return Math.max(80, Math.min(200, average - 10)) // Adaptive threshold with bounds
  }

  private getOCRConfigurations(): OCRConfig[] {
    return [
      {
        psm: '6',
        name: 'uniform_block',
        description: 'Uniform block of text - ideal for receipts',
        parameters: {
          preserve_interword_spaces: '1',
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$():- \n\t'
        }
      },
      {
        psm: '8', 
        name: 'single_word',
        description: 'Single word recognition - good for amounts',
        parameters: {
          preserve_interword_spaces: '1',
          tessedit_char_whitelist: '0123456789.$,'
        }
      },
      {
        psm: '7',
        name: 'single_text_line', 
        description: 'Single text line - good for structured data',
        parameters: {
          preserve_interword_spaces: '1'
        }
      },
      {
        psm: '4',
        name: 'single_column',
        description: 'Single column of text - good for receipts',
        parameters: {
          preserve_interword_spaces: '1'
        }
      },
      {
        psm: '3',
        name: 'fully_automatic',
        description: 'Fully automatic page segmentation',
        parameters: {
          preserve_interword_spaces: '1'
        }
      },
      {
        psm: '11',
        name: 'sparse_text',
        description: 'Sparse text - good for low-quality images',
        parameters: {
          preserve_interword_spaces: '1'
        }
      },
      {
        psm: '13',
        name: 'raw_line',
        description: 'Raw line - treats image as single text line',
        parameters: {
          preserve_interword_spaces: '1'
        }
      }
    ]
  }

  private async performMultiEngineOCR(
    imageVariants: ImageVariant[], 
    ocrConfigs: OCRConfig[], 
    filename: string
  ): Promise<OCRResult> {
    console.log(`🔄 Starting multi-engine OCR: ${imageVariants.length} variants × ${ocrConfigs.length} configs = ${imageVariants.length * ocrConfigs.length} attempts`)
    
    let bestResult: OCRResult = { text: '', confidence: 0, method: '', processingTime: 0 }
    const results: OCRResult[] = []
    
    for (let variantIdx = 0; variantIdx < imageVariants.length; variantIdx++) {
      const variant = imageVariants[variantIdx]
      console.log(`🎨 Processing variant: ${variant.name} (${variant.description})`)
      
      for (let configIdx = 0; configIdx < ocrConfigs.length; configIdx++) {
        const config = ocrConfigs[configIdx]
        const attemptStart = performance.now()
        
        try {
          console.log(`  ⚙️ Attempt ${variantIdx * ocrConfigs.length + configIdx + 1}/${imageVariants.length * ocrConfigs.length}: ${variant.name} + ${config.name}`)
          
          // Configure OCR engine for this attempt
          const parameters = {
            tessedit_pageseg_mode: parseInt(config.psm) as any,
            ...config.parameters
          }
          
          await this.worker!.setParameters(parameters)
          
          // Perform OCR
          const recognition = await this.worker!.recognize(variant.canvas)
          const text = recognition.data.text
          const confidence = recognition.data.confidence || 0
          const processingTime = performance.now() - attemptStart
          
          // Calculate quality score
          const qualityScore = this.calculateQualityScore(text, confidence)
          
          const result: OCRResult = {
            text,
            confidence: qualityScore,
            method: `${variant.name}+${config.name}`,
            processingTime
          }
          
          results.push(result)
          
          console.log(`    📊 Result: ${qualityScore.toFixed(1)}% quality, ${text.length} chars, ${processingTime.toFixed(0)}ms`)
          
          // Update best result
          if (qualityScore > bestResult.confidence) {
            bestResult = result
            console.log(`    🏆 New best result!`)
          }
          
        } catch (error) {
          const processingTime = performance.now() - attemptStart
          console.log(`    ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'} (${processingTime.toFixed(0)}ms)`)
        }
      }
    }
    
    console.log(`\n🏁 OCR Processing Complete:`)
    console.log(`   Best method: ${bestResult.method}`)
    console.log(`   Quality score: ${bestResult.confidence.toFixed(1)}%`)
    console.log(`   Text length: ${bestResult.text.length} characters`)
    console.log(`   Processing time: ${bestResult.processingTime.toFixed(0)}ms`)
    
    return bestResult
  }

  private calculateQualityScore(text: string, confidence: number): number {
    let score = confidence || 0
    
    // Bonus for containing monetary values
    if (/\$\d+\.?\d{0,2}|\d+\.\d{2}/.test(text)) {
      score += 15
      console.log(`      💰 +15 bonus: Contains monetary values`)
    }
    
    // Bonus for containing common receipt words
    const receiptWords = ['total', 'subtotal', 'tax', 'amount', 'receipt', 'invoice', 'date', 'time']
    const foundWords = receiptWords.filter(word => 
      text.toLowerCase().includes(word.toLowerCase())
    ).length
    if (foundWords > 0) {
      const wordBonus = foundWords * 3
      score += wordBonus
      console.log(`      📝 +${wordBonus} bonus: Contains ${foundWords} receipt keywords`)
    }
    
    // Bonus for reasonable text length
    if (text.length > 50 && text.length < 5000) {
      score += 5
      console.log(`      📏 +5 bonus: Good text length (${text.length} chars)`)
    }
    
    // Penalty for too many special characters (indicates OCR errors)
    const specialCharRatio = (text.match(/[^a-zA-Z0-9\s.,\$:()\-]/g) || []).length / text.length
    if (specialCharRatio > 0.1) {
      const penalty = Math.round(specialCharRatio * 20)
      score -= penalty
      console.log(`      ⚠️ -${penalty} penalty: High special character ratio (${(specialCharRatio * 100).toFixed(1)}%)`)
    }
    
    return Math.max(0, Math.min(100, score))
  }

  private updateProcessingStats(processingTime: number) {
    this.processingStats.totalProcessed++
    this.processingStats.averageProcessingTime = 
      (this.processingStats.averageProcessingTime * (this.processingStats.totalProcessed - 1) + processingTime) / 
      this.processingStats.totalProcessed
  }

  getProcessingStats() {
    return { ...this.processingStats }
  }

  async terminate() {
    if (this.worker) {
      console.log('🛑 Terminating OCR Engine...')
      await this.worker.terminate()
      this.worker = null
      this.isInitialized = false
      console.log('✅ OCR Engine terminated')
    }
  }
}

// Export types and interfaces
export type { ExtractedInvoiceData, InvoiceItem }
