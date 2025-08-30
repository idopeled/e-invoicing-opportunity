import { EnterpriseOCREngine, ExtractedInvoiceData } from './ocr-engine'
import { IntelligentParser } from './intelligent-parser'

export interface ProcessingOptions {
  enableAdvancedPreprocessing?: boolean
  maxRetries?: number
  timeoutMs?: number
  enableFuzzyMatching?: boolean
  enableContextualParsing?: boolean
}

export interface ProcessingResult {
  data: ExtractedInvoiceData
  success: boolean
  error?: string
  performance: {
    totalTime: number
    ocrTime: number
    parsingTime: number
    attemptsUsed: number
  }
}

export class EnterpriseOCRService {
  private ocrEngine: EnterpriseOCREngine
  private parser: IntelligentParser
  private isInitialized = false
  private processingStats = {
    totalDocuments: 0,
    successfulProcessing: 0,
    averageProcessingTime: 0,
    averageConfidence: 0
  }

  constructor() {
    this.ocrEngine = new EnterpriseOCREngine()
    this.parser = new IntelligentParser()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🚀 Initializing Enterprise OCR Service...')
    
    try {
      await this.ocrEngine.initialize()
      this.isInitialized = true
      console.log('✅ Enterprise OCR Service ready')
    } catch (error) {
      console.error('❌ Failed to initialize Enterprise OCR Service:', error)
      throw error
    }
  }

  async processDocument(
    file: File,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = performance.now()
    
    // Set default options
    const opts = {
      enableAdvancedPreprocessing: true,
      maxRetries: 2,
      timeoutMs: 60000, // 60 seconds timeout
      enableFuzzyMatching: true,
      enableContextualParsing: true,
      ...options
    }

    console.log(`🎯 Processing document: ${file.name}`)
    console.log(`📋 Options:`, opts)

    if (!this.isInitialized) {
      try {
        await this.initialize()
      } catch (error) {
        return this.createErrorResult(startTime, 'Initialization failed', error instanceof Error ? error : new Error(String(error)))
      }
    }

    // Validate file
    const validationError = this.validateFile(file)
    if (validationError) {
      return this.createErrorResult(startTime, validationError)
    }

    let lastError: Error | null = null
    let ocrTime = 0
    let parsingTime = 0
    let attemptsUsed = 0

    // Main processing loop with retries
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      attemptsUsed = attempt + 1
      
      try {
        console.log(`🔄 Processing attempt ${attempt + 1}/${opts.maxRetries + 1}`)
        
        // Step 1: OCR Processing with timeout
        const ocrStartTime = performance.now()
        const rawText = await this.processWithTimeout(
          () => this.ocrEngine.processDocument(file),
          opts.timeoutMs,
          'OCR processing timeout'
        )
        ocrTime = performance.now() - ocrStartTime
        
        console.log(`📝 OCR completed: ${rawText.length} characters extracted`)
        
        if (!rawText || rawText.trim().length < 10) {
          throw new Error('OCR extracted insufficient text')
        }

        // Step 2: Intelligent Parsing
        const parsingStartTime = performance.now()
        const ocrStats = this.ocrEngine.getProcessingStats()
        const invoiceData = this.parser.parseInvoiceData(
          rawText, 
          file.name, 
          'enterprise-multi-engine',
          ocrStats.averageConfidence
        )
        parsingTime = performance.now() - parsingStartTime

        // Step 3: Quality Assessment
        const qualityScore = this.assessDataQuality(invoiceData)
        console.log(`📊 Data quality score: ${qualityScore.toFixed(1)}/100`)

        // Step 4: Decide if result is acceptable
        const isAcceptable = this.isResultAcceptable(invoiceData, qualityScore, attempt === opts.maxRetries)
        
        if (isAcceptable) {
          const totalTime = performance.now() - startTime
          
          // Update statistics
          this.updateProcessingStats(totalTime, qualityScore)
          
          console.log(`✅ Document processing successful!`)
          console.log(`⏱️ Performance: Total ${totalTime.toFixed(0)}ms (OCR: ${ocrTime.toFixed(0)}ms, Parsing: ${parsingTime.toFixed(0)}ms)`)
          
          return {
            data: invoiceData,
            success: true,
            performance: {
              totalTime,
              ocrTime,
              parsingTime,
              attemptsUsed
            }
          }
        } else {
          console.log(`⚠️ Result quality insufficient (${qualityScore.toFixed(1)}/100), ${attempt < opts.maxRetries ? 'retrying...' : 'using best available'}`)
          
          if (attempt === opts.maxRetries) {
            // Last attempt - return what we have
            const totalTime = performance.now() - startTime
            this.updateProcessingStats(totalTime, qualityScore)
            
            return {
              data: invoiceData,
              success: false,
              error: `Low quality result (${qualityScore.toFixed(1)}/100) after ${attemptsUsed} attempts`,
              performance: {
                totalTime,
                ocrTime,
                parsingTime,
                attemptsUsed
              }
            }
          }
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.log(`❌ Attempt ${attempt + 1} failed:`, lastError.message)
        
        if (attempt === opts.maxRetries) {
          console.log(`💥 All ${opts.maxRetries + 1} attempts exhausted`)
          break
        }
        
        // Wait before retry (exponential backoff)
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000)
        console.log(`⏳ Waiting ${delayMs}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    // All attempts failed
    return this.createErrorResult(
      startTime,
      `Processing failed after ${attemptsUsed} attempts`,
      lastError,
      { totalTime: 0, ocrTime, parsingTime, attemptsUsed }
    )
  }

  private validateFile(file: File): string | null {
    // Size validation (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return 'File size exceeds 50MB limit'
    }
    
    // Type validation
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp',
      'image/tiff', 'image/webp', 'application/pdf'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return `Unsupported file type: ${file.type}. Supported types: ${allowedTypes.join(', ')}`
    }
    
    // Name validation
    if (!file.name || file.name.trim().length === 0) {
      return 'Invalid file name'
    }
    
    return null
  }

  private async processWithTimeout<T>(
    processFunc: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(timeoutMessage))
      }, timeoutMs)
      
      processFunc()
        .then(result => {
          clearTimeout(timeout)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  private assessDataQuality(data: ExtractedInvoiceData): number {
    let score = 0
    let maxScore = 0
    
    // Core fields scoring
    if (data.total) { score += 25; maxScore += 25 }
    if (data.vendor) { score += 20; maxScore += 20 }
    if (data.date) { score += 15; maxScore += 15 }
    if (data.subtotal) { score += 10; maxScore += 10 }
    if (data.tax) { score += 10; maxScore += 10 }
    maxScore += 50 // Base score potential
    
    // Text quality indicators
    if (data.rawText && data.rawText.length > 100) { score += 10; maxScore += 10 }
    if (data.invoiceNumber) { score += 5; maxScore += 5 }
    if (data.time) { score += 5; maxScore += 5 }
    
    // Consistency checks
    if (data.total && data.subtotal && data.tax) {
      const calculatedTotal = data.subtotal + data.tax
      const difference = Math.abs(data.total - calculatedTotal) / data.total
      if (difference < 0.05) { // Within 5%
        score += 10
      }
      maxScore += 10
    }
    
    // OCR confidence bonus
    if (data.confidence && data.confidence > 70) {
      score += Math.min(15, (data.confidence - 70) * 0.5)
    }
    maxScore += 15
    
    return maxScore > 0 ? (score / maxScore) * 100 : 0
  }

  private isResultAcceptable(data: ExtractedInvoiceData, qualityScore: number, isLastAttempt: boolean): boolean {
    // Minimum acceptable quality thresholds
    const minQualityScore = isLastAttempt ? 30 : 60
    
    // Must have at least a total amount or vendor
    const hasEssentialData = !!(data.total || data.vendor)
    
    // Text must be substantial
    const hasSubstantialText = !!(data.rawText && data.rawText.length > 50)
    
    return qualityScore >= minQualityScore && hasEssentialData && hasSubstantialText
  }

  private createErrorResult(
    startTime: number, 
    message: string, 
    error?: Error | null,
    performance?: Partial<ProcessingResult['performance']>
  ): ProcessingResult {
    const totalTime = performance?.totalTime ?? (globalThis.performance.now() - startTime)
    
    console.error('❌ Processing failed:', message, error?.message || '')
    
    return {
      data: {
        id: crypto.randomUUID(),
        rawText: '',
        processingTime: totalTime
      },
      success: false,
      error: `${message}${error ? `: ${error.message}` : ''}`,
      performance: {
        totalTime,
        ocrTime: performance?.ocrTime ?? 0,
        parsingTime: performance?.parsingTime ?? 0,
        attemptsUsed: performance?.attemptsUsed ?? 0
      }
    }
  }

  private updateProcessingStats(totalTime: number, qualityScore: number) {
    this.processingStats.totalDocuments++
    if (qualityScore >= 60) {
      this.processingStats.successfulProcessing++
    }
    
    // Update averages
    this.processingStats.averageProcessingTime = 
      (this.processingStats.averageProcessingTime * (this.processingStats.totalDocuments - 1) + totalTime) / 
      this.processingStats.totalDocuments
      
    this.processingStats.averageConfidence = 
      (this.processingStats.averageConfidence * (this.processingStats.totalDocuments - 1) + qualityScore) / 
      this.processingStats.totalDocuments
  }

  getProcessingStatistics() {
    const successRate = this.processingStats.totalDocuments > 0 
      ? (this.processingStats.successfulProcessing / this.processingStats.totalDocuments) * 100 
      : 0
      
    return {
      ...this.processingStats,
      successRate: successRate.toFixed(1) + '%',
      averageProcessingTime: this.processingStats.averageProcessingTime.toFixed(0) + 'ms',
      averageConfidence: this.processingStats.averageConfidence.toFixed(1) + '%'
    }
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error', details: Record<string, unknown> }> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }
      
      return {
        status: 'ok',
        details: {
          initialized: this.isInitialized,
          stats: this.getProcessingStatistics()
        }
      }
    } catch (error) {
      return {
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  }

  async terminate() {
    console.log('🛑 Terminating Enterprise OCR Service...')
    if (this.ocrEngine) {
      await this.ocrEngine.terminate()
    }
    this.isInitialized = false
    console.log('✅ Enterprise OCR Service terminated')
  }
}

// Export a singleton instance for easy use
export const enterpriseOCRService = new EnterpriseOCRService()

// Export types for external use
export type { ExtractedInvoiceData } from './ocr-engine'