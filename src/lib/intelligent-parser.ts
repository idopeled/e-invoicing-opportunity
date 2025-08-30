import { ExtractedInvoiceData, InvoiceItem } from './ocr-engine'

interface ParsingConfig {
  fuzzyMatchThreshold: number
  contextRadius: number
  currencyPriority: string[]
  languageSupport: string[]
}

interface ParsedAmount {
  value: number
  currency?: string
  confidence: number
  source: string
}

interface FieldMatch {
  field: string
  value: string
  confidence: number
  lineIndex: number
  method: string
}

export class IntelligentParser {
  private config: ParsingConfig = {
    fuzzyMatchThreshold: 0.7,
    contextRadius: 3,
    currencyPriority: ['USD', '$', 'EUR', '€', 'GBP', '£'],
    languageSupport: ['en', 'nl', 'de', 'fr', 'es']
  }

  parseInvoiceData(rawText: string, fileName: string, processingMethod?: string, confidence?: number): ExtractedInvoiceData {
    console.log(`🧠 Starting intelligent parsing for ${fileName}...`)
    const startTime = performance.now()
    
    const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean)
    const cleanedLines = this.preprocessLines(lines)
    
    console.log(`📋 Processing ${cleanedLines.length} lines of text`)
    console.log(`📝 Raw text preview:`, rawText.substring(0, 500) + (rawText.length > 500 ? '...' : ''))
    
    const invoiceData: ExtractedInvoiceData = {
      id: crypto.randomUUID(),
      rawText,
      processingMethod,
      confidence,
      processingTime: 0
    }

    // Multi-strategy parsing approach
    try {
      // Strategy 1: Pattern-based extraction
      this.extractBasicFields(invoiceData, cleanedLines)
      
      // Strategy 2: Context-aware parsing
      this.extractContextualFields(invoiceData, cleanedLines, rawText)
      
      // Strategy 3: Fuzzy matching for corrupted text
      this.extractWithFuzzyMatching(invoiceData, cleanedLines)
      
      // Strategy 4: Advanced amount extraction
      this.extractAmountsAdvanced(invoiceData, cleanedLines, rawText)
      
      // Strategy 5: Line items extraction
      invoiceData.items = this.extractLineItems(cleanedLines)
      
      // Strategy 6: Additional business data
      this.extractBusinessData(invoiceData, cleanedLines, rawText)
      
      // Post-processing validation and cleanup
      this.validateAndCleanData(invoiceData)
      
      const processingTime = performance.now() - startTime
      invoiceData.processingTime = processingTime
      
      console.log(`✅ Intelligent parsing completed in ${processingTime.toFixed(2)}ms`)
      console.log(`📊 Extraction summary:`, this.getExtractionSummary(invoiceData))
      
      return invoiceData
      
    } catch (error) {
      console.error('❌ Parsing failed:', error)
      const processingTime = performance.now() - startTime
      invoiceData.processingTime = processingTime
      return invoiceData
    }
  }

  private preprocessLines(lines: string[]): string[] {
    return lines.map(line => {
      // Remove excessive whitespace
      let cleaned = line.replace(/\s+/g, ' ').trim()
      
      // Fix common OCR errors
      cleaned = cleaned.replace(/[|\\]/g, ' ') // Replace pipes and backslashes
      cleaned = cleaned.replace(/[""]/g, '"') // Normalize quotes
      cleaned = cleaned.replace(/['']/g, "'") // Normalize apostrophes
      cleaned = cleaned.replace(/(\d)\s*[,.]\s*(\d{2})(?!\d)/g, '$1.$2') // Fix decimal separators
      cleaned = cleaned.replace(/\$\s+/g, '$') // Fix spaced dollar signs
      
      return cleaned
    }).filter(line => line.length > 0)
  }

  private extractBasicFields(invoiceData: ExtractedInvoiceData, lines: string[]) {
    console.log('🔍 Extracting basic fields with pattern matching...')
    
    // Enhanced invoice number patterns
    const invoiceNumberPatterns = [
      /(?:invoice|inv|bill|receipt|ticket)[\s#]*(?:no\.?|number|num\.?)?\s*:?\s*([A-Za-z0-9\-\.]+)/i,
      /(?:no\.?|#|num\.?)\s*([A-Za-z0-9\-\.]{3,})/i,
      /^([A-Za-z0-9\-\.]{4,})\s*$/  // Standalone alphanumeric code
    ]

    // Enhanced date patterns with multiple formats
    const datePatterns = [
      /(?:date|datum|fecha)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
      /(?:issued|printed|created).*?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
    ]

    // Time patterns
    const timePatterns = [
      /(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/g,
      /(?:time|tijd|hora)\s*:?\s*(\d{1,2}:\d{2})/i
    ]

    // Extract using patterns
    for (const line of lines) {
      // Invoice numbers
      if (!invoiceData.invoiceNumber) {
        for (const pattern of invoiceNumberPatterns) {
          const match = line.match(pattern)
          if (match && match[1] && match[1].length >= 3) {
            invoiceData.invoiceNumber = match[1].trim()
            console.log(`  📋 Invoice number: ${invoiceData.invoiceNumber}`)
            break
          }
        }
      }

      // Dates
      if (!invoiceData.date) {
        for (const pattern of datePatterns) {
          const match = line.match(pattern)
          if (match && match[1]) {
            invoiceData.date = this.normalizeDate(match[1])
            console.log(`  📅 Date: ${invoiceData.date}`)
            break
          }
        }
      }

      // Time
      if (!invoiceData.time) {
        for (const pattern of timePatterns) {
          const match = line.match(pattern)
          if (match && match[1]) {
            invoiceData.time = this.normalizeTime(match[1])
            console.log(`  🕐 Time: ${invoiceData.time}`)
            break
          }
        }
      }
    }
  }

  private extractContextualFields(invoiceData: ExtractedInvoiceData, lines: string[], rawText: string) {
    console.log('🎯 Extracting contextual fields...')
    
    // Vendor extraction with context awareness
    if (!invoiceData.vendor) {
      invoiceData.vendor = this.extractVendorWithContext(lines)
      if (invoiceData.vendor) {
        console.log(`  🏪 Vendor: ${invoiceData.vendor}`)
      }
    }

    // Address extraction
    if (!invoiceData.vendorAddress) {
      invoiceData.vendorAddress = this.extractAddressWithContext(lines)
      if (invoiceData.vendorAddress) {
        console.log(`  📍 Address: ${invoiceData.vendorAddress}`)
      }
    }

    // Phone extraction
    if (!invoiceData.vendorPhone) {
      const phoneMatch = rawText.match(/(\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4})/);
      if (phoneMatch) {
        invoiceData.vendorPhone = phoneMatch[1].replace(/\s+/g, ' ').trim()
        console.log(`  📞 Phone: ${invoiceData.vendorPhone}`)
      }
    }

    // Email extraction
    if (!invoiceData.vendorEmail) {
      const emailMatch = rawText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        invoiceData.vendorEmail = emailMatch[1]
        console.log(`  📧 Email: ${invoiceData.vendorEmail}`)
      }
    }
  }

  private extractVendorWithContext(lines: string[]): string | undefined {
    // Strategy 1: Look for obvious vendor indicators
    const vendorPatterns = [
      /(?:vendor|supplier|from|merchant|store|shop|business)\s*:?\s*(.+)/i,
      /(?:naam|name)\s*:?\s*(.+)/i
    ]

    for (const line of lines) {
      for (const pattern of vendorPatterns) {
        const match = line.match(pattern)
        if (match && match[1] && match[1].length > 2) {
          return match[1].trim()
        }
      }
    }

    // Strategy 2: First meaningful line (common in receipts)
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i]
      
      // Skip obvious non-vendor lines
      const skipPatterns = /^(invoice|bill|receipt|tax|date|datum|check|server|item|total|subtotal|\d+)/i
      
      if (!skipPatterns.test(line) && line.length > 3 && line.length < 50) {
        // Prefer lines with business indicators
        if (/^[A-Za-z]/.test(line) && !/^\d+\s/.test(line)) {
          return line
        }
      }
    }

    return undefined
  }

  private extractAddressWithContext(lines: string[]): string | undefined {
    // Look for address patterns (street + city/postal)
    for (let i = 0; i < lines.length - 1; i++) {
      const line1 = lines[i]
      const line2 = lines[i + 1]
      
      // Check if consecutive lines form an address
      if (/\d+.*(?:street|st|ave|avenue|road|rd|blvd|lane|ln|way|drive|dr)/i.test(line1)) {
        if (/\d{5}|[A-Z]{2}\s+\d{5}|\d{4}\s*[A-Z]{2}/i.test(line2)) {
          return `${line1}, ${line2}`
        }
      }
    }

    // Single line address with postal code
    for (const line of lines) {
      if (/.*\d{4,5}.*[A-Z]{2,}|.*[A-Z]{2,}.*\d{4,5}/.test(line) && line.length > 10) {
        return line
      }
    }

    return undefined
  }

  private extractWithFuzzyMatching(invoiceData: ExtractedInvoiceData, lines: string[]) {
    console.log('🔀 Extracting with fuzzy matching for corrupted text...')
    
    // Common field variations due to OCR errors
    const fuzzyPatterns = {
      total: ['total', 'totaal', 'tota1', 't0tal', 'tatol', 'iotal', 'fotal'],
      subtotal: ['subtotal', 'sub total', 'subtotaal', 'sub-total', 'sublotal'],
      tax: ['tax', 'btw', 'vat', 'sales tax', 'tax:', 'tox', 'iax'],
      amount: ['amount', 'bedrag', 'am0unt', 'amouht', 'am0unt'],
      invoice: ['invoice', 'factuur', 'inv0ice', 'invoic3', '1nvoice']
    }

    for (const line of lines) {
      const lowerLine = line.toLowerCase()
      
      // Check each fuzzy pattern
      for (const [field, variations] of Object.entries(fuzzyPatterns)) {
        for (const variation of variations) {
          if (this.fuzzyMatch(lowerLine, variation)) {
            console.log(`  🎯 Fuzzy match found: "${line}" matches "${variation}" for field "${field}"`)
            // Process this line for the matched field type
            this.processFuzzyMatchedLine(invoiceData, line, field)
            break
          }
        }
      }
    }
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    const similarity = this.calculateSimilarity(text, pattern)
    return similarity >= this.config.fuzzyMatchThreshold
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein-based similarity
    const len1 = str1.length
    const len2 = str2.length
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null))
    
    for (let i = 0; i <= len1; i++) matrix[i][0] = i
    for (let j = 0; j <= len2; j++) matrix[0][j] = j
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        )
      }
    }
    
    const distance = matrix[len1][len2]
    const maxLength = Math.max(len1, len2)
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength
  }

  private processFuzzyMatchedLine(invoiceData: ExtractedInvoiceData, line: string, fieldType: string) {
    // Extract number from the fuzzy matched line
    const numberMatch = line.match(/\$?(\d+[,.]?\d*)/g)
    if (numberMatch) {
      const amount = this.parseAmount(numberMatch[numberMatch.length - 1])
      if (amount > 0) {
        switch (fieldType) {
          case 'total':
            if (!invoiceData.total || amount > invoiceData.total) {
              invoiceData.total = amount
            }
            break
          case 'subtotal':
            if (!invoiceData.subtotal) {
              invoiceData.subtotal = amount
            }
            break
          case 'tax':
            if (!invoiceData.tax) {
              invoiceData.tax = amount
            }
            break
        }
      }
    }
  }

  private extractAmountsAdvanced(invoiceData: ExtractedInvoiceData, lines: string[], rawText: string) {
    console.log('💰 Advanced amount extraction...')
    
    // All amounts found in the text
    const allAmounts: ParsedAmount[] = []
    
    // Enhanced amount patterns
    const amountPatterns = [
      // Standard currency formats
      /\$(\d{1,6}(?:,\d{3})*\.?\d{0,2})\b/g,
      /(\d{1,6}(?:,\d{3})*\.\d{2})\s*(?:\$|USD|usd)/gi,
      // European formats
      /€(\d{1,6}(?:\.\d{3})*,\d{2})\b/g,
      /(\d{1,6}(?:\.\d{3})*,\d{2})\s*(?:€|EUR|eur)/gi,
      // Generic decimal numbers that could be amounts
      /\b(\d{1,4}\.\d{2})\b/g,
      /\b(\d{1,3},\d{2})\b/g
    ]

    // Extract all potential amounts
    for (const pattern of amountPatterns) {
      let match
      while ((match = pattern.exec(rawText)) !== null) {
        const amountStr = match[1] || match[0]
        const value = this.parseAmount(amountStr)
        if (value > 0 && value < 10000) { // Reasonable range
          allAmounts.push({
            value,
            currency: this.detectCurrency(match[0]),
            confidence: this.calculateAmountConfidence(match[0], rawText, match.index || 0),
            source: match[0]
          })
        }
      }
    }

    console.log(`  💰 Found ${allAmounts.length} potential amounts:`, 
      allAmounts.map(a => `${a.source} (${a.confidence}%)`))

    // Context-based amount assignment
    this.assignAmountsWithContext(invoiceData, allAmounts, lines)

    // Final amount validation and assignment
    this.finalizeAmountAssignment(invoiceData, allAmounts)
  }

  private assignAmountsWithContext(invoiceData: ExtractedInvoiceData, amounts: ParsedAmount[], lines: string[]) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      const nextLine = i < lines.length - 1 ? lines[i + 1] : ''
      
      // Find amounts in this line and nearby lines
      const lineAmounts = amounts.filter(amount => {
        const lineText = `${lines[i]} ${nextLine}`.toLowerCase()
        return lineText.includes(amount.source.toLowerCase())
      })

      if (lineAmounts.length === 0) continue

      // Context-based assignment
      if (/total.*:|total\s*$/.test(line) && !invoiceData.total) {
        const bestAmount = lineAmounts.reduce((best, curr) => 
          curr.confidence > best.confidence ? curr : best
        )
        invoiceData.total = bestAmount.value
        invoiceData.currency = bestAmount.currency
        console.log(`  🎯 Total assigned from context: $${bestAmount.value}`)
      }
      
      else if (/subtotal|sub.total/.test(line) && !invoiceData.subtotal) {
        const bestAmount = lineAmounts.reduce((best, curr) => 
          curr.confidence > best.confidence ? curr : best
        )
        invoiceData.subtotal = bestAmount.value
        console.log(`  🎯 Subtotal assigned from context: $${bestAmount.value}`)
      }
      
      else if (/tax|btw|vat/.test(line) && !invoiceData.tax) {
        const bestAmount = lineAmounts.reduce((best, curr) => 
          curr.confidence > best.confidence ? curr : best
        )
        invoiceData.tax = bestAmount.value
        console.log(`  🎯 Tax assigned from context: $${bestAmount.value}`)
      }
    }
  }

  private finalizeAmountAssignment(invoiceData: ExtractedInvoiceData, amounts: ParsedAmount[]) {
    // If no total was found, use the highest confidence amount
    if (!invoiceData.total && amounts.length > 0) {
      const bestAmount = amounts.reduce((best, curr) => 
        curr.confidence > best.confidence ? curr : best
      )
      
      // Only assign if confidence is reasonable
      if (bestAmount.confidence > 50) {
        invoiceData.total = bestAmount.value
        invoiceData.currency = bestAmount.currency
        console.log(`  📊 Total assigned by highest confidence: $${bestAmount.value} (${bestAmount.confidence}%)`)
      }
    }

    // Currency detection if not set
    if (!invoiceData.currency && amounts.length > 0) {
      const currencies = amounts.map(a => a.currency).filter(c => c)
      if (currencies.length > 0) {
        invoiceData.currency = currencies[0]
      }
    }
  }

  private calculateAmountConfidence(amountStr: string, fullText: string, position: number): number {
    let confidence = 50 // Base confidence
    
    // Context analysis around the amount
    const contextStart = Math.max(0, position - 50)
    const contextEnd = Math.min(fullText.length, position + 50)
    const context = fullText.substring(contextStart, contextEnd).toLowerCase()
    
    // Boost confidence based on context
    if (/total/.test(context)) confidence += 25
    if (/subtotal/.test(context)) confidence += 20
    if (/tax|vat|btw/.test(context)) confidence += 20
    if (/amount/.test(context)) confidence += 15
    if (/due/.test(context)) confidence += 15
    
    // Boost for proper currency formatting
    if (/^\$\d+\.\d{2}$/.test(amountStr)) confidence += 20
    if (/^\d+\.\d{2}$/.test(amountStr)) confidence += 10
    
    // Reduce confidence for suspicious amounts
    const value = this.parseAmount(amountStr)
    if (value < 0.01 || value > 5000) confidence -= 20
    if (amountStr.includes('000')) confidence -= 10 // Likely not a receipt amount
    
    return Math.max(0, Math.min(100, confidence))
  }

  private detectCurrency(amountStr: string): string | undefined {
    if (amountStr.includes('$')) return 'USD'
    if (amountStr.includes('€')) return 'EUR'
    if (amountStr.includes('£')) return 'GBP'
    
    // Default based on format
    if (/\d+,\d{2}/.test(amountStr)) return 'EUR' // European format
    if (/\d+\.\d{2}/.test(amountStr)) return 'USD' // US format
    
    return undefined
  }

  private extractLineItems(lines: string[]): InvoiceItem[] {
    console.log('📋 Extracting line items...')
    const items: InvoiceItem[] = []
    
    // Look for structured item data
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Pattern: Description ... Price
      const itemPattern = /^(.{3,50}?)\s+.*?\$?(\d+\.?\d{0,2})\s*$/
      const match = line.match(itemPattern)
      
      if (match && match[1] && match[2]) {
        const description = match[1].trim()
        const amount = this.parseAmount(match[2])
        
        // Validate it looks like a real item
        if (amount > 0 && amount < 200 && 
            !/(total|subtotal|tax|amount)/i.test(description) &&
            description.length > 5) {
          
          items.push({
            description,
            amount,
            quantity: 1,
            unitPrice: amount
          })
          
          console.log(`  📝 Item found: ${description} - $${amount}`)
        }
      }
    }
    
    return items
  }

  private extractBusinessData(invoiceData: ExtractedInvoiceData, lines: string[], rawText: string) {
    console.log('🏢 Extracting additional business data...')
    
    // Transaction-related patterns
    const transactionPatterns = {
      transactionId: /(?:transaction|trans|ref).*?:?\s*([A-Z0-9]{6,})/i,
      authorizationCode: /(?:auth|approval).*?:?\s*([A-Z0-9]{4,})/i,
      cardNumber: /(?:card|kaart).*?([x*\d]{4,})/i,
      paymentMethod: /(?:card type|payment|method).*?:?\s*([A-Z]+)/i
    }

    for (const line of lines) {
      for (const [field, pattern] of Object.entries(transactionPatterns)) {
        if (!invoiceData[field as keyof ExtractedInvoiceData]) {
          const match = line.match(pattern)
          if (match && match[1]) {
            (invoiceData as any)[field] = match[1].trim()
            console.log(`  💳 ${field}: ${match[1].trim()}`)
          }
        }
      }
    }

    // Store remaining interesting data in extra fields
    this.extractExtraFields(invoiceData, lines)
  }

  private extractExtraFields(invoiceData: ExtractedInvoiceData, lines: string[]) {
    const extraData: string[] = []
    
    const skipPatterns = /^(total|subtotal|tax|date|time|amount|vendor|invoice|receipt|check|server|item|description|price|\d+\s*$|^\s*$)/i
    
    for (const line of lines) {
      if (!skipPatterns.test(line) && 
          line.length > 3 && 
          line.length < 100 &&
          !extraData.includes(line)) {
        extraData.push(line)
      }
    }
    
    // Assign to extra fields
    if (extraData.length > 0) invoiceData.extraField1 = extraData[0]
    if (extraData.length > 1) invoiceData.extraField2 = extraData[1] 
    if (extraData.length > 2) invoiceData.extraField3 = extraData[2]
    if (extraData.length > 3) invoiceData.extraField4 = extraData[3]
    if (extraData.length > 4) invoiceData.extraField5 = extraData[4]
  }

  private validateAndCleanData(invoiceData: ExtractedInvoiceData) {
    console.log('🔍 Validating and cleaning extracted data...')
    
    // Validate amounts
    if (invoiceData.total && invoiceData.subtotal && invoiceData.tax) {
      const calculatedTotal = invoiceData.subtotal + invoiceData.tax
      const difference = Math.abs(invoiceData.total - calculatedTotal)
      
      if (difference / invoiceData.total > 0.1) { // More than 10% difference
        console.log(`  ⚠️ Amount validation warning: Total ${invoiceData.total} doesn't match subtotal ${invoiceData.subtotal} + tax ${invoiceData.tax}`)
      }
    }

    // Clean and validate vendor name
    if (invoiceData.vendor) {
      invoiceData.vendor = invoiceData.vendor.replace(/[^\w\s\-\.'&]/g, '').trim()
      if (invoiceData.vendor.length < 2) {
        invoiceData.vendor = undefined
      }
    }

    // Validate dates
    if (invoiceData.date && !this.isValidDate(invoiceData.date)) {
      console.log(`  ⚠️ Invalid date format: ${invoiceData.date}`)
      invoiceData.date = undefined
    }
  }

  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr)
    return date instanceof Date && !isNaN(date.getTime())
  }

  private normalizeDate(dateStr: string): string {
    // Parse and normalize date format to MM/DD/YYYY
    const cleanDate = dateStr.replace(/[^\d\/\-\.]/g, '')
    const parts = cleanDate.split(/[\/\-\.]/)
    
    if (parts.length === 3) {
      const [part1, part2, part3] = parts.map(p => parseInt(p))
      
      let month: number, day: number, year: number
      
      if (part3 > 1900) {
        // MM/DD/YYYY or DD/MM/YYYY format
        if (part1 <= 12 && part2 <= 31) {
          month = part1
          day = part2
        } else if (part2 <= 12 && part1 <= 31) {
          month = part2
          day = part1
        } else {
          return dateStr // Can't determine format
        }
        year = part3
      } else {
        // MM/DD/YY format
        month = part1 <= 12 ? part1 : part2
        day = part1 <= 12 ? part2 : part1
        year = part3 + (part3 < 50 ? 2000 : 1900)
      }
      
      return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`
    }
    
    return dateStr
  }

  private normalizeTime(timeStr: string): string {
    // Clean up and normalize time format
    let cleaned = timeStr.replace(/\s+/g, ' ').trim()
    
    // Convert to 12-hour format if not already
    const match = cleaned.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/)
    if (match) {
      const hour = parseInt(match[1])
      const minute = match[2]
      const second = match[3] || '00'
      const ampm = match[4]?.toUpperCase()
      
      if (ampm) {
        return `${hour}:${minute} ${ampm}`
      } else if (hour > 12) {
        return `${hour - 12}:${minute} PM`
      } else if (hour === 0) {
        return `12:${minute} AM`
      } else {
        return `${hour}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`
      }
    }
    
    return cleaned
  }

  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0
    
    // Remove currency symbols and clean up
    let cleaned = amountStr.replace(/[\$€£,\s]/g, '')
    
    // Handle European format (comma as decimal separator)
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(',', '.')
    } else if (cleaned.includes(',') && cleaned.includes('.')) {
      // Format like 1.234,56 - remove dots (thousand separators), convert comma to dot
      const lastComma = cleaned.lastIndexOf(',')
      const lastDot = cleaned.lastIndexOf('.')
      if (lastComma > lastDot) {
        // Comma is decimal separator
        cleaned = cleaned.replace(/\./g, '').replace(',', '.')
      } else {
        // Dot is decimal separator
        cleaned = cleaned.replace(/,/g, '')
      }
    }
    
    const number = parseFloat(cleaned)
    return isNaN(number) ? 0 : Math.round(number * 100) / 100 // Round to 2 decimal places
  }

  private getExtractionSummary(data: ExtractedInvoiceData): object {
    return {
      invoiceNumber: !!data.invoiceNumber,
      vendor: !!data.vendor,
      date: !!data.date,
      time: !!data.time,
      total: !!data.total ? `$${data.total}` : null,
      subtotal: !!data.subtotal ? `$${data.subtotal}` : null,
      tax: !!data.tax ? `$${data.tax}` : null,
      currency: data.currency,
      items: data.items?.length || 0,
      confidence: data.confidence ? `${data.confidence.toFixed(1)}%` : null,
      processingTime: data.processingTime ? `${data.processingTime.toFixed(0)}ms` : null
    }
  }
}