import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { ExtractedInvoiceData } from './ocr'

export interface ExportOptions {
  filename?: string
  includeItems?: boolean
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
}

export interface ExportRowData {
  'Row': number
  'Invoice Number': string
  'Vendor': string
  'Date': string
  'Due Date': string
  'Subtotal': number
  'Tax': number
  'Total': number
  'Currency': string
  'Bill To': string
  'Items Count': number
  'Raw Text Preview': string
}

export interface ItemExportData {
  'Invoice Row': number
  'Invoice Number': string
  'Vendor': string
  'Item #': number
  'Description': string
  'Quantity': number
  'Unit Price': number
  'Line Total': number
}

export interface SummaryData {
  'Metric': string
  'Value': string | number
}

export class ExportService {
  static formatDate(dateStr: string | undefined, format: string = 'MM/DD/YYYY'): string {
    if (!dateStr) return ''
    
    try {
      // Handle various input formats
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr // Return original if can't parse
      
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear().toString()
      
      switch (format) {
        case 'DD/MM/YYYY':
          return `${day}/${month}/${year}`
        case 'YYYY-MM-DD':
          return `${year}-${month}-${day}`
        case 'MM/DD/YYYY':
        default:
          return `${month}/${day}/${year}`
      }
    } catch {
      return dateStr
    }
  }

  static prepareDataForExport(
    data: ExtractedInvoiceData[], 
    options: ExportOptions = {}
  ): ExportRowData[] {
    const { dateFormat = 'MM/DD/YYYY' } = options
    
    return data.map((invoice, index) => ({
      'Row': index + 1,
      'Invoice Number': invoice.invoiceNumber || '',
      'Vendor': invoice.vendor || '',
      'Date': this.formatDate(invoice.date, dateFormat),
      'Due Date': this.formatDate(invoice.dueDate, dateFormat),
      'Subtotal': invoice.subtotal || 0,
      'Tax': invoice.tax || 0,
      'Total': invoice.total || 0,
      'Currency': invoice.currency || 'USD',
      'Bill To': invoice.billTo || '',
      'Items Count': invoice.items?.length || 0,
      'Raw Text Preview': invoice.rawText?.substring(0, 100) + (invoice.rawText && invoice.rawText.length > 100 ? '...' : '') || ''
    }))
  }

  static async exportToCSV(
    data: ExtractedInvoiceData[], 
    options: ExportOptions = {}
  ): Promise<void> {
    const { filename = 'invoices' } = options
    
    const exportData = this.prepareDataForExport(data, options)
    
    if (exportData.length === 0) {
      console.warn('No data to export')
      return
    }

    // Convert to CSV format
    const headers = Object.keys(exportData[0])
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header]
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    saveAs(blob, `${filename}_${timestamp}.csv`)
  }

  static async exportToExcel(
    data: ExtractedInvoiceData[], 
    options: ExportOptions = {}
  ): Promise<void> {
    const { filename = 'invoices', includeItems = false } = options
    
    const exportData = this.prepareDataForExport(data, options)
    
    if (exportData.length === 0) {
      console.warn('No data to export')
      return
    }

    // Create workbook
    const workbook = XLSX.utils.book_new()
    
    // Main invoices sheet
    const mainSheet = XLSX.utils.json_to_sheet(exportData)
    
    // Auto-size columns
    const mainColWidths = Object.keys(exportData[0]).map(key => ({
      wch: Math.max(
        key.length,
        ...exportData.map(row => String(row[key] || '').length)
      )
    }))
    mainSheet['!cols'] = mainColWidths
    
    XLSX.utils.book_append_sheet(workbook, mainSheet, 'Invoices')

    // Optional: Create separate sheet for line items
    if (includeItems) {
      const itemsData: ItemExportData[] = []
      
      data.forEach((invoice, invoiceIndex) => {
        if (invoice.items && invoice.items.length > 0) {
          invoice.items.forEach((item, itemIndex) => {
            itemsData.push({
              'Invoice Row': invoiceIndex + 1,
              'Invoice Number': invoice.invoiceNumber || '',
              'Vendor': invoice.vendor || '',
              'Item #': itemIndex + 1,
              'Description': item.description || '',
              'Quantity': item.quantity || 1,
              'Unit Price': item.unitPrice || 0,
              'Amount': item.amount || 0
            })
          })
        }
      })
      
      if (itemsData.length > 0) {
        const itemsSheet = XLSX.utils.json_to_sheet(itemsData)
        
        // Auto-size columns for items sheet
        const itemsColWidths = Object.keys(itemsData[0]).map(key => ({
          wch: Math.max(
            key.length,
            ...itemsData.map(row => String(row[key] || '').length)
          )
        }))
        itemsSheet['!cols'] = itemsColWidths
        
        XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Line Items')
      }
    }

    // Create summary sheet
    const summary = this.generateSummary(data)
    const summarySheet = XLSX.utils.json_to_sheet(summary)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // Export file
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`)
  }

  private static generateSummary(data: ExtractedInvoiceData[]): SummaryData[] {
    if (data.length === 0) return []
    
    const totalInvoices = data.length
    const totalAmount = data.reduce((sum, inv) => sum + (inv.total || 0), 0)
    const totalTax = data.reduce((sum, inv) => sum + (inv.tax || 0), 0)
    const totalSubtotal = data.reduce((sum, inv) => sum + (inv.subtotal || 0), 0)
    
    // Vendor analysis
    const vendorCounts: Record<string, number> = {}
    const vendorAmounts: Record<string, number> = {}
    
    data.forEach(invoice => {
      const vendor = invoice.vendor || 'Unknown'
      vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1
      vendorAmounts[vendor] = (vendorAmounts[vendor] || 0) + (invoice.total || 0)
    })

    // Date range
    const dates = data
      .map(inv => inv.date)
      .filter(Boolean)
      .sort()
    
    const summary = [
      { 'Metric': 'Total Invoices', 'Value': totalInvoices },
      { 'Metric': 'Total Amount', 'Value': `$${totalAmount.toFixed(2)}` },
      { 'Metric': 'Total Tax', 'Value': `$${totalTax.toFixed(2)}` },
      { 'Metric': 'Total Subtotal', 'Value': `$${totalSubtotal.toFixed(2)}` },
      { 'Metric': 'Average Invoice Amount', 'Value': `$${(totalAmount / totalInvoices).toFixed(2)}` },
      { 'Metric': 'Date Range (From)', 'Value': dates.length > 0 ? dates[0] : 'N/A' },
      { 'Metric': 'Date Range (To)', 'Value': dates.length > 0 ? dates[dates.length - 1] : 'N/A' },
      { 'Metric': 'Unique Vendors', 'Value': Object.keys(vendorCounts).length },
      { 'Metric': '', 'Value': '' }, // Separator
      { 'Metric': 'Export Generated', 'Value': new Date().toLocaleString() }
    ]

    return summary
  }

  // Utility method to validate data before export
  static validateExportData(data: ExtractedInvoiceData[]): {
    isValid: boolean
    warnings: string[]
    errors: string[]
  } {
    const warnings: string[] = []
    const errors: string[] = []
    
    if (!data || data.length === 0) {
      errors.push('No data to export')
      return { isValid: false, warnings, errors }
    }

    data.forEach((invoice, index) => {
      if (!invoice.invoiceNumber) {
        warnings.push(`Row ${index + 1}: Missing invoice number`)
      }
      
      if (!invoice.vendor) {
        warnings.push(`Row ${index + 1}: Missing vendor information`)
      }
      
      if (!invoice.total || invoice.total <= 0) {
        warnings.push(`Row ${index + 1}: Missing or invalid total amount`)
      }
      
      if (!invoice.date) {
        warnings.push(`Row ${index + 1}: Missing invoice date`)
      }
    })

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    }
  }
}

// Export convenience functions
export const exportToCSV = (data: ExtractedInvoiceData[], options?: ExportOptions) => 
  ExportService.exportToCSV(data, options)

export const exportToExcel = (data: ExtractedInvoiceData[], options?: ExportOptions) => 
  ExportService.exportToExcel(data, options)