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
}

export interface InvoiceItem {
  description: string
  quantity?: number
  unitPrice?: number
  amount?: number
}

export class OCRService {
  private worker: Worker | null = null
  private isInitialized = false

  async initialize() {
    if (this.isInitialized) return

    try {
      console.log('Initializing OCR worker...')
      this.worker = await createWorker('eng')
      await this.worker.setParameters({
        tessedit_pageseg_mode: 6 as any, // Uniform block of text
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$():- \n',
        // Improve number recognition
        classify_enable_learning: '0',
        classify_enable_adaptive_matcher: '0',
      })
      this.isInitialized = true
      console.log('OCR worker initialized successfully')
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error)
      throw new Error(`OCR initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async extractText(file: File): Promise<string> {
    try {
      if (!this.worker || !this.isInitialized) {
        await this.initialize()
      }

      if (!this.worker) {
        throw new Error('OCR worker not initialized')
      }

      console.log(`Processing file: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      
      // Handle PDF files by converting to images first
      if (file.type === 'application/pdf') {
        console.log(`Converting PDF to images: ${file.name}`)
        const images = await this.convertPdfToImages(file)
        let combinedText = ''
        
        for (let i = 0; i < images.length; i++) {
          console.log(`Processing PDF page ${i + 1}/${images.length}`)
          const { data: { text } } = await this.worker.recognize(images[i])
          combinedText += text + '\n\n'
        }
        
        console.log(`OCR completed for ${file.name}, extracted ${combinedText.length} characters from ${images.length} pages`)
        return combinedText
      } else {
        // Handle image files with multi-attempt OCR
        const { data: { text } } = await this.worker.recognize(file)
        console.log(`OCR completed for ${file.name}, extracted ${text.length} characters`)
        return text
      }
    } catch (error) {
      console.error(`OCR extraction failed for ${file.name}:`, error)
      throw new Error(`Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async convertPdfToImages(file: File): Promise<HTMLCanvasElement[]> {
    // Ensure we're in the browser environment
    if (typeof window === 'undefined') {
      throw new Error('PDF processing is only available in the browser')
    }

    try {
      // Load PDF.js dynamically
      const pdfjsLib = await loadPdfjs()
      if (!pdfjsLib) {
        throw new Error('Failed to load PDF processing library')
      }

      console.log('Loading PDF document...')
      const arrayBuffer = await file.arrayBuffer()
      
      // Try to create a loading task with error handling
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      })
      
      const pdf = await loadingTask.promise
      console.log(`PDF loaded successfully, ${pdf.numPages} pages`)
      
      const images: HTMLCanvasElement[] = []

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Rendering page ${pageNum}/${pdf.numPages}`)
        const page = await pdf.getPage(pageNum)
        const viewport = page.getViewport({ scale: 2.0 }) // Higher scale for better OCR
        
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')!
        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        await page.render(renderContext).promise
        images.push(canvas)
        console.log(`Page ${pageNum} rendered successfully`)
      }

      await loadingTask.destroy() // Clean up resources
      console.log('PDF conversion completed successfully')
      return images
    } catch (error) {
      console.error('PDF conversion failed:', error)
      // Provide a helpful error message for users
      throw new Error(`Unable to process PDF file. This may be due to:\n- PDF is password protected\n- PDF contains complex formatting\n- Network issues loading PDF processor\n\nTry converting the PDF to images first, or use a different PDF file.`)
    }
  }

  private async preprocessImage(file: File): Promise<HTMLCanvasElement[]> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          console.log(`Original image size: ${img.width}x${img.height}`)
          
          // Create multiple preprocessed versions
          const variants: HTMLCanvasElement[] = []
          
          // Determine optimal size (min 300px width, max 2000px)
          const targetWidth = Math.max(300, Math.min(2000, img.width * 2))
          const targetHeight = Math.round((targetWidth / img.width) * img.height)
          
          console.log(`Target size: ${targetWidth}x${targetHeight}`)
          
          // Variant 1: Enhanced contrast with grayscale
          variants.push(this.createPreprocessedVariant(img, targetWidth, targetHeight, 'enhanced'))
          
          // Variant 2: High contrast black/white
          variants.push(this.createPreprocessedVariant(img, targetWidth, targetHeight, 'bw'))
          
          // Variant 3: Original with just scaling
          variants.push(this.createPreprocessedVariant(img, targetWidth, targetHeight, 'original'))
          
          resolve(variants)
        } catch (error) {
          console.error('Image preprocessing failed:', error)
          reject(error)
        }
      }
      
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  private createPreprocessedVariant(img: HTMLImageElement, width: number, height: number, type: 'enhanced' | 'bw' | 'original'): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    canvas.width = width
    canvas.height = height
    
    // Draw image with high quality settings
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, width, height)
    
    if (type === 'original') {
      return canvas
    }
    
    // Apply image processing
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
      
      let processed: number
      
      if (type === 'enhanced') {
        // Enhanced contrast: improve readability
        processed = gray < 100 ? Math.max(0, gray - 20) : 
                   gray > 200 ? Math.min(255, gray + 20) : gray
      } else { // 'bw'
        // High contrast black/white
        processed = gray < 128 ? 0 : 255
      }
      
      data[i] = processed     // Red
      data[i + 1] = processed // Green
      data[i + 2] = processed // Blue
      // Alpha stays the same
    }
    
    ctx.putImageData(imageData, 0, 0)
    return canvas
  }

  parseInvoiceData(rawText: string, fileName: string): ExtractedInvoiceData {
    const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean)
    
    // Debug logging
    console.log(`=== PARSING ${fileName} ===`)
    console.log('Raw OCR text:')
    console.log(rawText)
    console.log('\nSplit lines:')
    lines.forEach((line, i) => console.log(`${i}: "${line}"`))
    
    const invoiceData: ExtractedInvoiceData = {
      id: crypto.randomUUID(),
      rawText
    }

    // Invoice number patterns
    const invoiceNumberPatterns = [
      /invoice\s*(?:number|no\.?|#)?\s*:?\s*([A-Za-z0-9-]+)/i,
      /inv\s*(?:no\.?|#)?\s*:?\s*([A-Za-z0-9-]+)/i,
      /(?:number|no\.?|#)\s*:?\s*([A-Za-z0-9-]+)/i
    ]

    // Date patterns (including Dutch)
    const datePatterns = [
      /(?:invoice\s+)?date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(?:datum|date)\s*:\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(?:datum|date)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(?:issued\s+)?(?:on\s+)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/
    ]

    // Due date patterns
    const dueDatePatterns = [
      /due\s+(?:date\s*:?\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /payment\s+due\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
    ]

    // Amount patterns (including Dutch and EUR format)
    const totalPatterns = [
      /total\s*:?\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$|USD)?/i,
      /totaal\s*:?\s*\|?\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$)?/i,
      /totaal\s*:\s*:\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$)?/i,
      /amount\s+due\s*:?\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$|USD)?/i,
      /grand\s+total\s*:?\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$|USD)?/i,
      /bedrag\s*:?\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$)?/i,
      // Additional patterns for various formats
      /[\$€]([0-9,]+\.\d{2})\s*(?:total|due|amount)/i,
      /(?:pay|payment|charge)\s*[\$€]?([0-9,]+[,\.]\d{2})/i,
      /^[\$€]?([0-9,]+[,\.]\d{2})\s*$/, // Just a number on its own line
      // Pattern for numbers at end of lines (like "55 55")
      /(\d+\.?\d*)\s+(\d+\.?\d*)\s*$/,
      // Pattern for standalone numbers that might be prices
      /\b(\d{1,3}\.?\d{2})\b/
    ]

    const subtotalPatterns = [
      /subtotal\s*:?\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$)?/i,
      /sub\s*total\s*:?\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$)?/i,
      /subtotaal\s*:?\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$)?/i
    ]

    const taxPatterns = [
      /tax\s*:?\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$)?/i,
      /vat\s*:?\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$)?/i,
      /btw\s*:?\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$)?/i,
      /sales\s+tax\s*:?\s*[\$€]?([0-9,]+[,\.]\d{2})\s*(?:EUR|€|\$)?/i
    ]

    // Extract invoice number
    for (const pattern of invoiceNumberPatterns) {
      for (const line of lines) {
        const match = line.match(pattern)
        if (match && match[1]) {
          invoiceData.invoiceNumber = match[1]
          break
        }
      }
      if (invoiceData.invoiceNumber) break
    }

    // Extract dates
    for (const pattern of datePatterns) {
      for (const line of lines) {
        const match = line.match(pattern)
        if (match && match[1] && !invoiceData.date) {
          invoiceData.date = this.normalizeDate(match[1])
          break
        }
      }
      if (invoiceData.date) break
    }

    for (const pattern of dueDatePatterns) {
      for (const line of lines) {
        const match = line.match(pattern)
        if (match && match[1]) {
          invoiceData.dueDate = this.normalizeDate(match[1])
          break
        }
      }
      if (invoiceData.dueDate) break
    }

    // Extract vendor (usually in the first few lines or after "from")
    const vendorPatterns = [
      /from\s*:?\s*(.+)/i,
      /vendor\s*:?\s*(.+)/i,
      /supplier\s*:?\s*(.+)/i,
      /leverancier\s*:?\s*(.+)/i
    ]

    for (const pattern of vendorPatterns) {
      for (const line of lines) {
        const match = line.match(pattern)
        if (match && match[1]) {
          invoiceData.vendor = match[1].trim()
          break
        }
      }
      if (invoiceData.vendor) break
    }

    // If no vendor found with patterns, try to extract from first few lines
    if (!invoiceData.vendor && lines.length > 0) {
      // Look for business names, website domains, or company names
      for (let i = 0; i < Math.min(8, lines.length); i++) {
        const line = lines[i]
        
        // Skip obvious non-vendor lines
        const skipPatterns = /^(invoice|bill|receipt|tax|date|datum|pinbon|poi|klantticket|bastiaansplein|delft|premium|reseller|\d+\s*dc|\d{3}\s*\d{3}|\d+\s*(ave|st|rd|way|drive|lane|blvd|ase))/i
        
        if (!skipPatterns.test(line) && line.length > 2 && line.length < 50) { // Avoid very long address lines
          // Prioritize .nl domains or recognizable business names
          if (line.includes('.nl') || line.includes('.com')) {
            invoiceData.vendor = line
            break
          }
          // Look for business names (avoid addresses with numbers at start)
          if (/[a-z]/.test(line) && line.length > 3 && !/^\d+\s/.test(line) && !/^[A-Z0-9\s]+$/.test(line)) {
            // Avoid lines that look like addresses (contain street indicators)
            if (!/\d+\s*(ave|street|st|rd|way|drive|lane|blvd|ase|chicago|il)/i.test(line)) {
              invoiceData.vendor = line
              break
            }
          }
        }
      }
    }

    // Extract amounts - try multiple approaches
    // First try standard patterns
    for (const pattern of totalPatterns) {
      for (const line of lines) {
        const match = line.match(pattern)
        if (match && match[1]) {
          invoiceData.total = this.parseAmount(match[1])
          break
        }
      }
      if (invoiceData.total) break
    }
    
    // If no total found, try alternative extraction methods
    if (!invoiceData.total) {
      console.log('No total found with standard patterns, trying alternative methods...')
      
      // Method 1: Look for numbers at the end of lines that contain pricing info
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // Look for line with "55 55" pattern (from OCR output)
        const doubleNumberMatch = line.match(/(\d+\.?\d*)\s+(\d+\.?\d*)\s*$/)
        if (doubleNumberMatch) {
          console.log(`Found double number pattern in line: "${line}"`)
          const num1 = parseFloat(doubleNumberMatch[1])
          const num2 = parseFloat(doubleNumberMatch[2])
          // Use the larger number as it's likely the price
          invoiceData.total = Math.max(num1, num2)
          console.log(`Using larger number as total: ${invoiceData.total}`)
          break
        }
        
        // Look for "Total" line and check next line for amount
        if (line.toLowerCase().includes('total') && i + 1 < lines.length) {
          const nextLine = lines[i + 1]
          const numberMatch = nextLine.match(/(\d+\.?\d{2})/)
          if (numberMatch) {
            invoiceData.total = parseFloat(numberMatch[1])
            console.log(`Found total on next line after "Total": ${invoiceData.total}`)
            break
          }
        }
        
        // Look for price patterns in lines with item descriptions
        if (line.length > 10 && /\d+\.?\d*\s+\d+\.?\d*/.test(line)) {
          const priceMatch = line.match(/(\d+\.?\d{2})\s*$/)
          if (priceMatch) {
            const price = parseFloat(priceMatch[1])
            if (price > 5 && price < 1000) { // Reasonable range for food items
              invoiceData.total = price
              console.log(`Found reasonable price in line "${line}": ${invoiceData.total}`)
              break
            }
          }
        }
      }
      
      if (!invoiceData.total) {
        console.log('No total found with alternative methods')
      }
    } else {
      console.log('Total found with standard patterns:', invoiceData.total)
    }

    for (const pattern of subtotalPatterns) {
      for (const line of lines) {
        const match = line.match(pattern)
        if (match && match[1]) {
          invoiceData.subtotal = this.parseAmount(match[1])
          break
        }
      }
      if (invoiceData.subtotal) break
    }

    for (const pattern of taxPatterns) {
      for (const line of lines) {
        const match = line.match(pattern)
        if (match && match[1]) {
          invoiceData.tax = this.parseAmount(match[1])
          break
        }
      }
      if (invoiceData.tax) break
    }

    // Try to extract currency (prioritize EUR for European documents)
    const currencyMatch = rawText.match(/EUR|€|\$|USD|GBP|CAD/i)
    if (currencyMatch) {
      const curr = currencyMatch[0].toUpperCase()
      invoiceData.currency = curr === '€' ? 'EUR' : curr
    } else if (/\d+,\d{2}/.test(rawText)) {
      // If European decimal format is detected, assume EUR
      invoiceData.currency = 'EUR'
    }

    // Extract additional financial and business fields
    this.extractAdditionalFields(invoiceData, lines, rawText)

    // Extract line items (simplified)
    invoiceData.items = this.extractLineItems(lines)

    return invoiceData
  }

  private normalizeDate(dateStr: string): string {
    // Try to parse and normalize date format
    const cleanDate = dateStr.replace(/[^\d\/\-\.]/g, '')
    const parts = cleanDate.split(/[\/\-\.]/)
    
    if (parts.length === 3) {
      const [part1, part2, part3] = parts
      
      // Determine if it's MM/DD/YYYY, DD/MM/YYYY, or YYYY/MM/DD
      if (part3.length === 4) {
        // MM/DD/YYYY or DD/MM/YYYY
        const month = parseInt(part1) <= 12 ? part1 : part2
        const day = parseInt(part1) <= 12 ? part2 : part1
        return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${part3}`
      } else if (part1.length === 4) {
        // YYYY/MM/DD
        return `${part2.padStart(2, '0')}/${part3.padStart(2, '0')}/${part1}`
      }
    }
    
    return dateStr // Return original if can't parse
  }

  private parseAmount(amountStr: string): number {
    // Handle European format: 64,00 EUR or 1.234,56 EUR
    const cleaned = amountStr.replace(/[^\d\.,]/g, '')
    
    let number = 0
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Format like 1.234,56 - dot is thousands separator, comma is decimal
      const parts = cleaned.split(',')
      const integerPart = parts[0].replace(/\./g, '')
      const decimalPart = parts[1] || '0'
      number = parseFloat(integerPart + '.' + decimalPart)
    } else if (cleaned.includes(',') && /,\d{2}$/.test(cleaned)) {
      // Format like 64,00 - comma is decimal separator
      number = parseFloat(cleaned.replace(',', '.'))
    } else {
      // Standard format: 64.00
      number = parseFloat(cleaned.replace(/,/g, ''))
    }
    
    return isNaN(number) ? 0 : number
  }

  private extractAdditionalFields(invoiceData: ExtractedInvoiceData, lines: string[], rawText: string) {
    // Extract phone number
    const phoneMatch = rawText.match(/(\d{3}\s*\d{3}\s*\d{2}\s*\d{2})/);
    if (phoneMatch) {
      invoiceData.vendorPhone = phoneMatch[1].replace(/\s+/g, ' ');
    }

    // Extract email
    const emailMatch = rawText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      invoiceData.vendorEmail = emailMatch[1];
    }

    // Extract address (look for postal code pattern)
    const addressMatch = rawText.match(/(.*?\d{4}\s*[A-Z]{2}\s*[A-Za-z]+)/);
    if (addressMatch) {
      invoiceData.vendorAddress = addressMatch[1].trim();
    }

    // Extract transaction fields
    for (const line of lines) {
      // Transaction ID
      if (line.includes('Transactie:')) {
        const transMatch = line.match(/Transactie:\s*([A-Z0-9]+)/);
        if (transMatch) invoiceData.transactionId = transMatch[1];
      }
      
      // Authorization code
      if (line.includes('Autorisatiecode:')) {
        const authMatch = line.match(/Autorisatiecode:\s*([A-Z0-9]+)/);
        if (authMatch) invoiceData.authorizationCode = authMatch[1];
      }
      
      // Terminal ID
      if (line.includes('Terminal:')) {
        const termMatch = line.match(/Terminal:\s*([A-Z0-9]+)/);
        if (termMatch) invoiceData.terminalId = termMatch[1];
      }
      
      // Merchant ID
      if (line.includes('Merchant:')) {
        const merchMatch = line.match(/Merchant:\s*([A-Z0-9]+)/);
        if (merchMatch) invoiceData.merchantId = merchMatch[1];
      }
      
      // Card number (masked)
      if (line.includes('Kaart:')) {
        const cardMatch = line.match(/Kaart:\s*([0-9x]+)/);
        if (cardMatch) invoiceData.cardNumber = cardMatch[1];
      }
      
      // Payment method
      if (line.includes('Leesmethode:')) {
        const payMatch = line.match(/Leesmethode:\s*([A-Z]+)/);
        if (payMatch) invoiceData.paymentMethod = payMatch[1];
      }
    }

    // Extract time from date line
    const timeMatch = rawText.match(/(\d{2}:\d{2})/);
    if (timeMatch) {
      invoiceData.time = timeMatch[1];
    }

    // Store additional unstructured data in extra fields
    const extraData = [];
    for (const line of lines) {
      // Skip already extracted data
      if (!line.includes('Totaal:') && !line.includes('Datum:') && 
          !line.includes('Transactie:') && !line.includes('Terminal:') &&
          !line.includes('amac.nl') && !line.includes('Bastiaansplein') &&
          line.length > 5 && !/^\d+$/.test(line)) {
        extraData.push(line);
      }
    }
    
    // Fill extra fields with remaining data
    if (extraData.length > 0) invoiceData.extraField1 = extraData[0];
    if (extraData.length > 1) invoiceData.extraField2 = extraData[1];
    if (extraData.length > 2) invoiceData.extraField3 = extraData[2];
    if (extraData.length > 3) invoiceData.extraField4 = extraData[3];
    if (extraData.length > 4) invoiceData.extraField5 = extraData[4];
  }

  private extractLineItems(lines: string[]): InvoiceItem[] {
    const items: InvoiceItem[] = []
    
    // Look for table-like structures with prices
    for (const line of lines) {
      // Simple pattern: description followed by amounts
      const itemPattern = /^(.+?)\s+(\d+(?:\.\d{2})?)\s*\$?\s*(\d+(?:[,\d]*)?(?:\.\d{2})?)$/
      const match = line.match(itemPattern)
      
      if (match && match[1] && match[3]) {
        const description = match[1].trim()
        const amount = this.parseAmount(match[3])
        
        if (description.length > 2 && amount > 0) {
          items.push({
            description,
            amount,
            quantity: parseFloat(match[2]) || 1,
            unitPrice: amount / (parseFloat(match[2]) || 1)
          })
        }
      }
    }
    
    return items
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
      this.isInitialized = false
    }
  }
}

// Export a singleton instance
export const ocrService = new OCRService()