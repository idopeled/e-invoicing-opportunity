'use client'

import { useState, useCallback } from 'react'
import { FileText, Zap, Shield, Download } from 'lucide-react'
import { FileUpload } from '@/components/file-upload'
import { InvoiceTable } from '@/components/invoice-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExtractedInvoiceData } from '@/lib/optimized-ocr'
import { exportToCSV, exportToExcel } from '@/lib/export'

export default function Home() {
  const [invoices, setInvoices] = useState<ExtractedInvoiceData[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<string>('')

  const handleFilesSelected = useCallback((files: File[]) => {
    if (files.length === 0) return
    setUploadedFiles(prev => [...prev, ...files])
  }, [])

  const handleStartProcessing = useCallback(async () => {
    if (uploadedFiles.length === 0) return

    setIsProcessing(true)
    setProcessingStatus('🚀 Loading Enterprise OCR System...')

    try {
      // Dynamically import the enterprise OCR service
      const { optimizedOCRService } = await import('@/lib/optimized-ocr')
      
      setProcessingStatus('⚡ Initializing Optimized OCR Engine...')
      await optimizedOCRService.initialize()
      const newInvoices: ExtractedInvoiceData[] = []
      const processedResults: ExtractedInvoiceData[] = []

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i]
        const fileType = file.type === 'application/pdf' ? 'PDF' : 'Image'
        
        setProcessingStatus(`🎯 Processing ${fileType}: ${file.name} (${i + 1}/${uploadedFiles.length})\n⚡ Using optimized OCR with smart image enhancement...`)

        try {
          const startTime = performance.now()
          
          // Use enterprise OCR with all advanced features
          const result = await optimizedOCRService.processDocument(file)
          
          const processingTime = performance.now() - startTime
          processedResults.push(result)
          
          if (result.success) {
            newInvoices.push(result.data)
            setProcessingStatus(`✅ Successfully processed ${file.name}\n📊 Quality: ${result.data.confidence?.toFixed(1) || 'N/A'}% | Time: ${processingTime.toFixed(0)}ms\n🎨 Method: ${result.data.processingMethod || 'Advanced Multi-Engine'}`)
          } else {
            console.warn(`Partial processing for ${file.name}:`, result.error)
            // Still add the data even if quality is low
            newInvoices.push(result.data)
            setProcessingStatus(`⚠️ Processed ${file.name} with warnings\n❗ Issue: ${result.error}\n📊 Attempts: ${result.performance.attemptsUsed}`)
          }
          
        } catch (error) {
          console.error(`Enterprise OCR failed for ${file.name}:`, error)
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          
          // Create minimal error data
          const errorData: ExtractedInvoiceData = {
            id: crypto.randomUUID(),
            vendor: `Error processing: ${file.name}`,
            rawText: `Processing failed: ${errorMsg}`,
            extraField1: errorMsg
          }
          newInvoices.push(errorData)
          
          setProcessingStatus(`❌ Error processing ${file.name}\n🔧 Error: ${errorMsg}\n💡 The file may be corrupted or in an unsupported format`)
        }
        
        // Brief pause between files for UX
        if (i < uploadedFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // Show final summary
      const successful = processedResults.filter(r => r.success).length
      const avgTime = processedResults.reduce((sum, r) => sum + r.performance.totalTime, 0) / processedResults.length
      
      setProcessingStatus(`🎉 Processing Complete!\n✅ ${successful}/${uploadedFiles.length} files processed successfully\n⏱️ Average time: ${avgTime.toFixed(0)}ms per file\n📋 ${newInvoices.length} invoices extracted`)
      
      setInvoices(prev => [...prev, ...newInvoices])
      setUploadedFiles([]) // Clear uploaded files after processing
      
      // Clear status after showing summary
      setTimeout(() => {
        setProcessingStatus('')
      }, 5000)
      
    } catch (error) {
      console.error('Enterprise OCR system error:', error)
      setProcessingStatus(`💥 System Error: ${error instanceof Error ? error.message : 'Unknown error'}\n🔧 Please try again or contact support if the issue persists`)
    } finally {
      setIsProcessing(false)
    }
  }, [uploadedFiles])

  const handleExportCSV = useCallback(() => {
    exportToCSV(invoices, { 
      filename: 'invoice_export',
      dateFormat: 'MM/DD/YYYY' 
    })
  }, [invoices])

  const handleExportExcel = useCallback(() => {
    exportToExcel(invoices, { 
      filename: 'invoice_export',
      includeItems: true,
      dateFormat: 'MM/DD/YYYY' 
    })
  }, [invoices])

  const handleEditInvoice = useCallback((invoice: ExtractedInvoiceData) => {
    // Placeholder for edit functionality
    console.log('Edit invoice:', invoice)
  }, [])

  const handleDeleteInvoice = useCallback((id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id))
  }, [])

  const handleRemoveUploadedFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleClearAllFiles = useCallback(() => {
    setUploadedFiles([])
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">InvoiceOCR</h1>
                <p className="text-sm text-gray-500">Professional Invoice Processing</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {uploadedFiles.length > 0 && (
                <span className="text-sm text-blue-600">{uploadedFiles.length} files ready</span>
              )}
              {invoices.length > 0 && (
                <span className="text-sm text-green-600">{invoices.length} invoices processed</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        {invoices.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Smart Invoice OCR
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Optimized OCR engine with smart image processing and intelligent field extraction. 
              Fast, accurate, and reliable processing of any invoice or receipt format.
            </p>
            
            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-2">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Optimized Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Smart OCR engine with optimized image enhancement and fast processing
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-2">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">Secure & Private</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    All processing happens in your browser - your documents never leave your device
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-2">
                    <Download className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">Smart Parsing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Intelligent field extraction with context awareness and automatic error correction
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* File Upload */}
        <div className="mb-8">
          <FileUpload 
            onFilesSelected={handleFilesSelected}
            accept="image/*,.pdf"
            multiple={true}
            maxSize={10 * 1024 * 1024}
          />
        </div>

        {/* Uploaded Files & Start Processing */}
        {uploadedFiles.length > 0 && !isProcessing && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Ready to Process ({uploadedFiles.length} files)</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleClearAllFiles}
                    className="text-sm"
                  >
                    Clear All
                  </Button>
                  <Button 
                    onClick={handleStartProcessing}
                    className="text-sm"
                    disabled={isProcessing}
                  >
                    Start Processing
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {file.type === 'application/pdf' ? (
                        <FileText className="h-5 w-5 text-red-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.type} • {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUploadedFile(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <Card className="mb-8">
            <CardContent className="flex items-center space-x-3 p-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <div>
                <p className="font-medium">Processing Documents</p>
                <p className="text-sm text-muted-foreground">{processingStatus}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Table */}
        {invoices.length > 0 && (
          <InvoiceTable
            data={invoices}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">
              Optimized OCR Engine • Smart image processing • Intelligent parsing • 100% local processing
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
