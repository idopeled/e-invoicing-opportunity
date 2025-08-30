import { createWorker, Worker } from 'tesseract.js'

// Dynamic import for PDF.js to avoid SSR issues
let pdfjs: any = null

async function loadPdfjs() {
  if (typeof window !== 'undefined' && !pdfjs) {
    const reactPdf = await import('react-pdf')
    pdfjs = reactPdf.pdfjs
    
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      const workerUrls = [
        `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
      ]
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrls[0]
    }
    
    console.log(`PDF.js loaded with version ${pdfjs.version}`)
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
  
  transactionId?: string
  authorizationCode?: string
  terminalId?: string
  merchantId?: string
  cardNumber?: string
  paymentMethod?: string
  
  extraField1?: string
  extraField2?: string
  extraField3?: string
  extraField4?: string
  extraField5?: string
  
  items?: InvoiceItem[]
  rawText?: string
  
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

interface ProcessingResult {
  success: boolean
  data: ExtractedInvoiceData
  error?: string
  performance: {
    totalTime: number
    ocrTime: number
    parsingTime: number
  }
}

export class OptimizedOCRService {
  private worker: Worker | null = null
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🚀 Initializing Optimized OCR Service...')
    
    try {
      this.worker = await createWorker('eng')
      
      // Optimized settings for speed and accuracy
      await this.worker.setParameters({
        tessedit_pageseg_mode: 6 as any, // Uniform block - best for receipts
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$():- \n\t'
      })
      
      this.isInitialized = true
      console.log('✅ Optimized OCR Service ready')
    } catch (error) {
      console.error('❌ Failed to initialize OCR Service:', error)
      throw error
    }
  }

  async processDocument(file: File): Promise<ProcessingResult> {
    const startTime = performance.now()
    
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      console.log(`📄 Processing: ${file.name}`)
      
      // OCR Processing
      const ocrStartTime = performance.now()
      const rawText = file.type === 'application/pdf' 
        ? await this.processPDF(file)
        : await this.processImageOptimized(file)
      const ocrTime = performance.now() - ocrStartTime
      
      console.log(`📝 OCR completed: ${rawText.length} characters`)
      
      // Smart Parsing
      const parsingStartTime = performance.now()
      const invoiceData = this.parseInvoiceData(rawText, file.name)
      const parsingTime = performance.now() - parsingStartTime
      
      const totalTime = performance.now() - startTime
      invoiceData.processingTime = totalTime
      invoiceData.processingMethod = 'optimized-smart-ocr'
      
      // Quality assessment
      const confidence = this.assessQuality(invoiceData)
      invoiceData.confidence = confidence
      
      console.log(`✅ Processing complete: ${confidence.toFixed(1)}% confidence in ${totalTime.toFixed(0)}ms`)
      
      return {
        success: confidence > 50,
        data: invoiceData,
        performance: { totalTime, ocrTime, parsingTime }
      }
      
    } catch (error) {
      const totalTime = performance.now() - startTime
      console.error('❌ Processing failed:', error)
      
      return {
        success: false,
        data: {
          id: crypto.randomUUID(),
          rawText: '',
          processingTime: totalTime
        },
        error: error instanceof Error ? error.message : String(error),
        performance: { totalTime, ocrTime: 0, parsingTime: 0 }
      }
    }
  }

  private async processImageOptimized(file: File): Promise<string> {
    console.log('🖼️ Processing image with optimized OCR...')
    
    // Create single optimized image variant
    const optimizedImage = await this.createOptimizedImage(file)
    
    // Try primary OCR approach
    try {
      const result = await this.worker!.recognize(optimizedImage)
      const text = result.data.text
      console.log(`Primary OCR: ${result.data.confidence}% confidence`)
      
      if (text.length > 50 && result.data.confidence > 60) {
        return text
      }
    } catch (error) {
      console.log('Primary OCR failed, trying fallback...')
    }
    
    // Fallback: try with different PSM mode
    try {
      await this.worker!.setParameters({
        tessedit_pageseg_mode: 8 as any // Single word mode - better for amounts
      })
      
      const result = await this.worker!.recognize(optimizedImage)
      const text = result.data.text
      console.log(`Fallback OCR: ${result.data.confidence}% confidence`)
      
      // Reset to original settings
      await this.worker!.setParameters({
        tessedit_pageseg_mode: 6 as any
      })
      
      return text
      
    } catch (error) {
      console.error('All OCR attempts failed:', error)
      throw new Error('OCR processing failed')
    }
  }

  private async createOptimizedImage(file: File): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          
          // Optimal sizing for OCR
          const targetWidth = Math.max(800, Math.min(1600, img.width * 1.5))
          const targetHeight = Math.round((targetWidth / img.width) * img.height)
          
          canvas.width = targetWidth
          canvas.height = targetHeight
          
          console.log(`🎯 Optimized size: ${targetWidth}x${targetHeight}`)
          
          // High quality drawing
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
          
          // Smart image enhancement
          this.enhanceImageForOCR(ctx, targetWidth, targetHeight)
          
          resolve(canvas)
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  private enhanceImageForOCR(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    
    // Smart enhancement based on image characteristics
    let avgBrightness = 0
    for (let i = 0; i < data.length; i += 4) {
      avgBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3
    }
    avgBrightness /= (data.length / 4)
    
    const isLowContrast = avgBrightness > 100 && avgBrightness < 180
    
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
      
      let enhanced: number
      
      if (isLowContrast) {
        // Boost contrast for low-contrast images
        enhanced = gray < 128 ? Math.max(0, gray - 40) : Math.min(255, gray + 40)
      } else {
        // Gentle enhancement for normal images
        enhanced = gray < 100 ? Math.max(0, gray - 15) : 
                   gray > 200 ? Math.min(255, gray + 15) : gray
      }
      
      data[i] = enhanced
      data[i + 1] = enhanced
      data[i + 2] = enhanced
    }
    
    ctx.putImageData(imageData, 0, 0)
    console.log(`📈 Image enhanced (avg brightness: ${avgBrightness.toFixed(0)}, low contrast: ${isLowContrast})`)
  }

  private async processPDF(file: File): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('PDF processing only available in browser')
    }

    try {
      const pdfjsLib = await loadPdfjs()
      if (!pdfjsLib) throw new Error('Failed to load PDF library')

      console.log('📖 Converting PDF to image...')
      const arrayBuffer = await file.arrayBuffer()
      
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      })
      
      const pdf = await loadingTask.promise
      console.log(`📄 PDF loaded: ${pdf.numPages} pages`)
      
      // Process only first page for speed
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 2.0 })
      
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      canvas.height = viewport.height
      canvas.width = viewport.width

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise

      // Apply OCR to the PDF page
      const result = await this.worker!.recognize(canvas)
      await loadingTask.destroy()
      
      return result.data.text
      
    } catch (error) {
      console.error('❌ PDF processing failed:', error)
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private parseInvoiceData(rawText: string, fileName: string): ExtractedInvoiceData {
    console.log('🧠 Smart parsing invoice data...')
    
    const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean)
    
    const invoiceData: ExtractedInvoiceData = {
      id: crypto.randomUUID(),
      rawText
    }

    // Smart field extraction
    this.extractAmounts(invoiceData, lines, rawText)
    this.extractBasicFields(invoiceData, lines)
    this.extractVendorInfo(invoiceData, lines)
    this.extractTransactionData(invoiceData, lines)
    this.extractItems(invoiceData, lines)

    return invoiceData
  }

  private extractAmounts(data: ExtractedInvoiceData, lines: string[], fullText: string) {
    console.log('💰 Extracting amounts...')
    
    // Enhanced amount patterns
    const amountPatterns = [
      // Standard formats
      /(?:total|amount)\s*:?\s*\$?([0-9]+\.?[0-9]{0,2})/gi,
      /\$([0-9]+\.[0-9]{2})/g,
      // European formats
      /(?:totaal|bedrag)\s*:?\s*€?([0-9]+,?[0-9]{0,2})/gi,
      // Context-based
      /([0-9]+\.[0-9]{2})\s*(?:total|due|amount)/gi,
    ]
    
    const amounts: { value: number, context: string, line: string }[] = []
    
    // Extract all potential amounts with context
    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase()
      
      // Look for amounts in this line
      amountPatterns.forEach(pattern => {
        let match
        while ((match = pattern.exec(line)) !== null) {
          const value = this.parseAmount(match[1])
          if (value > 0 && value < 10000) {
            amounts.push({
              value,
              context: lowerLine,
              line: line
            })
          }
        }
      })
    })
    
    console.log(`Found ${amounts.length} potential amounts:`, amounts.map(a => `$${a.value} (${a.context.substring(0, 20)}...)`))
    
    // Smart assignment based on context
    for (const amount of amounts) {
      const context = amount.context
      
      if (context.includes('total') && !data.total) {
        data.total = amount.value
        data.currency = 'USD'
        console.log(`  🎯 Total: $${amount.value} from "${amount.line}"`)
      }
      else if ((context.includes('subtotal') || context.includes('sub total')) && !data.subtotal) {
        data.subtotal = amount.value
        console.log(`  🎯 Subtotal: $${amount.value}`)
      }
      else if (context.includes('tax') && !data.tax) {
        data.tax = amount.value
        console.log(`  🎯 Tax: $${amount.value}`)
      }
    }
    
    // Fallback: use largest reasonable amount as total
    if (!data.total && amounts.length > 0) {
      const sortedAmounts = amounts.sort((a, b) => b.value - a.value)
      const bestAmount = sortedAmounts[0]
      if (bestAmount.value >= 1 && bestAmount.value <= 500) { // Reasonable range
        data.total = bestAmount.value
        data.currency = 'USD'
        console.log(`  📊 Using best estimate for total: $${bestAmount.value}`)
      }
    }
  }

  private extractBasicFields(data: ExtractedInvoiceData, lines: string[]) {
    console.log('📝 Extracting basic fields...')
    
    for (const line of lines) {
      // Date patterns
      if (!data.date) {
        const dateMatch = line.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/)
        if (dateMatch) {
          data.date = this.normalizeDate(dateMatch[1])
          console.log(`  📅 Date: ${data.date}`)
        }
      }
      
      // Time patterns
      if (!data.time) {
        const timeMatch = line.match(/(\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?)/)
        if (timeMatch) {
          data.time = timeMatch[1]
          console.log(`  🕐 Time: ${data.time}`)
        }
      }
      
      // Invoice number
      if (!data.invoiceNumber) {
        const invMatch = line.match(/(?:check|invoice|receipt|ticket)[\s:#]*([A-Za-z0-9\-]{3,})/i)
        if (invMatch) {
          data.invoiceNumber = invMatch[1]
          console.log(`  📋 Invoice #: ${data.invoiceNumber}`)
        }
      }
    }
  }

  private extractVendorInfo(data: ExtractedInvoiceData, lines: string[]) {
    console.log('🏪 Extracting vendor info...')
    
    // Find vendor name (usually in first few lines)
    if (!data.vendor && lines.length > 0) {
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i]
        
        // Skip obvious non-vendor lines
        if (!/^(invoice|bill|receipt|check|server|total|date|item|\d+)/i.test(line) && 
            line.length > 3 && line.length < 50) {
          data.vendor = line
          console.log(`  🏪 Vendor: ${data.vendor}`)
          break
        }
      }
    }
    
    // Phone number
    const fullText = lines.join(' ')
    const phoneMatch = fullText.match(/(\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4})/)
    if (phoneMatch) {
      data.vendorPhone = phoneMatch[1]
      console.log(`  📞 Phone: ${data.vendorPhone}`)
    }
  }

  private extractTransactionData(data: ExtractedInvoiceData, lines: string[]) {
    console.log('💳 Extracting transaction data...')
    
    for (const line of lines) {
      // Card type
      if (!data.paymentMethod && /mastercard|visa|amex|discover/i.test(line)) {
        const cardMatch = line.match(/(mastercard|visa|amex|discover)/i)
        if (cardMatch) {
          data.paymentMethod = cardMatch[1].toUpperCase()
          console.log(`  💳 Payment: ${data.paymentMethod}`)
        }
      }
      
      // Transaction references
      if (!data.transactionId) {
        const transMatch = line.match(/(?:ref|reference|trans)[\s:#]*([A-Za-z0-9]{6,})/i)
        if (transMatch) {
          data.transactionId = transMatch[1]
          console.log(`  🔗 Transaction ID: ${data.transactionId}`)
        }
      }
    }
  }

  private extractItems(data: ExtractedInvoiceData, lines: string[]) {
    const items: InvoiceItem[] = []
    
    for (const line of lines) {
      // Look for item lines with amounts
      const itemMatch = line.match(/^(.{5,40}?)\s+.*?\$?([0-9]+\.?[0-9]{0,2})\s*$/)
      if (itemMatch) {
        const description = itemMatch[1].trim()
        const amount = this.parseAmount(itemMatch[2])
        
        if (amount > 0 && amount < 100 && 
            !/(total|subtotal|tax|amount|payment|card|server)/i.test(description)) {
          items.push({
            description,
            amount,
            quantity: 1,
            unitPrice: amount
          })
        }
      }
    }
    
    if (items.length > 0) {
      data.items = items
      console.log(`  📋 Found ${items.length} items`)
    }
  }

  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0
    
    let cleaned = amountStr.replace(/[\$€£,\s]/g, '')
    
    // Handle European format
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(',', '.')
    }
    
    const number = parseFloat(cleaned)
    return isNaN(number) ? 0 : Math.round(number * 100) / 100
  }

  private normalizeDate(dateStr: string): string {
    const parts = dateStr.split(/[\/\-\.]/)
    if (parts.length === 3) {
      const [part1, part2, part3] = parts.map(p => parseInt(p))
      
      let month: number, day: number, year: number
      
      if (part3 > 1900) {
        month = part1 <= 12 ? part1 : part2
        day = part1 <= 12 ? part2 : part1
        year = part3
      } else {
        month = part1
        day = part2
        year = part3 + (part3 < 50 ? 2000 : 1900)
      }
      
      return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`
    }
    return dateStr
  }

  private assessQuality(data: ExtractedInvoiceData): number {
    let score = 0
    
    // Core data presence
    if (data.total) score += 30
    if (data.vendor) score += 25
    if (data.date) score += 15
    if (data.subtotal) score += 10
    if (data.tax) score += 10
    if (data.invoiceNumber) score += 5
    if (data.time) score += 5
    
    return Math.min(100, score)
  }

  async terminate() {
    if (this.worker) {
      console.log('🛑 Terminating OCR Service...')
      await this.worker.terminate()
      this.worker = null
      this.isInitialized = false
      console.log('✅ OCR Service terminated')
    }
  }
}

// Export singleton instance
export const optimizedOCRService = new OptimizedOCRService()