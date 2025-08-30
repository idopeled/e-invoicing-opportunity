'use client'

import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { ExtractedInvoiceData } from '@/lib/ocr'
import { cn } from '@/lib/utils'

interface InvoiceTableProps {
  data: ExtractedInvoiceData[]
  onEdit?: (invoice: ExtractedInvoiceData) => void
  onDelete?: (id: string) => void
  onExportCSV?: () => void
  onExportExcel?: () => void
}

const columnHelper = createColumnHelper<ExtractedInvoiceData>()

export function InvoiceTable({ 
  data, 
  onEdit, 
  onDelete, 
  onExportCSV, 
  onExportExcel 
}: InvoiceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const columns = useMemo(() => [
    columnHelper.accessor('invoiceNumber', {
      id: 'invoiceNumber',
      header: 'Invoice #',
      cell: ({ getValue, row, column }) => {
        const value = getValue() || 'N/A'
        const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id
        
        return isEditing ? (
          <Input
            defaultValue={value}
            className="h-8"
            onBlur={(e) => {
              // Handle update logic here
              setEditingCell(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditingCell(null)
              }
            }}
            autoFocus
          />
        ) : (
          <div 
            className="cursor-pointer hover:bg-muted/50 p-1 rounded"
            onClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
          >
            {value}
          </div>
        )
      },
      size: 120,
    }),
    
    columnHelper.accessor('vendor', {
      id: 'vendor',
      header: 'Vendor',
      cell: ({ getValue, row, column }) => {
        const value = getValue() || 'Unknown'
        const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id
        
        return isEditing ? (
          <Input
            defaultValue={value}
            className="h-8"
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
            autoFocus
          />
        ) : (
          <div 
            className="cursor-pointer hover:bg-muted/50 p-1 rounded max-w-[200px] truncate"
            onClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
            title={value}
          >
            {value}
          </div>
        )
      },
      size: 200,
    }),

    columnHelper.accessor('date', {
      id: 'date',
      header: 'Date',
      cell: ({ getValue, row, column }) => {
        const value = getValue() || 'N/A'
        const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id
        
        return isEditing ? (
          <Input
            type="date"
            defaultValue={value}
            className="h-8"
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
            autoFocus
          />
        ) : (
          <div 
            className="cursor-pointer hover:bg-muted/50 p-1 rounded"
            onClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
          >
            {value}
          </div>
        )
      },
      size: 110,
    }),

    columnHelper.accessor('dueDate', {
      id: 'dueDate',
      header: 'Due Date',
      cell: ({ getValue, row, column }) => {
        const value = getValue() || 'N/A'
        const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id
        
        return isEditing ? (
          <Input
            type="date"
            defaultValue={value}
            className="h-8"
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
            autoFocus
          />
        ) : (
          <div 
            className="cursor-pointer hover:bg-muted/50 p-1 rounded"
            onClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
          >
            {value}
          </div>
        )
      },
      size: 110,
    }),

    columnHelper.accessor('subtotal', {
      id: 'subtotal',
      header: 'Subtotal',
      cell: ({ getValue, row, column }) => {
        const value = getValue()
        const formatted = value ? `$${value.toFixed(2)}` : '$0.00'
        const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id
        
        return isEditing ? (
          <Input
            type="number"
            step="0.01"
            defaultValue={value?.toString() || '0'}
            className="h-8"
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
            autoFocus
          />
        ) : (
          <div 
            className="cursor-pointer hover:bg-muted/50 p-1 rounded text-right font-mono"
            onClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
          >
            {formatted}
          </div>
        )
      },
      size: 100,
    }),

    columnHelper.accessor('tax', {
      id: 'tax',
      header: 'Tax',
      cell: ({ getValue, row, column }) => {
        const value = getValue()
        const formatted = value ? `$${value.toFixed(2)}` : '$0.00'
        const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id
        
        return isEditing ? (
          <Input
            type="number"
            step="0.01"
            defaultValue={value?.toString() || '0'}
            className="h-8"
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
            autoFocus
          />
        ) : (
          <div 
            className="cursor-pointer hover:bg-muted/50 p-1 rounded text-right font-mono"
            onClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
          >
            {formatted}
          </div>
        )
      },
      size: 100,
    }),

    columnHelper.accessor('time', {
      id: 'time',
      header: 'Time',
      cell: ({ getValue }) => getValue() || 'N/A',
      size: 80,
    }),

    columnHelper.accessor('transactionId', {
      id: 'transactionId', 
      header: 'Transaction ID',
      cell: ({ getValue }) => getValue() || 'N/A',
      size: 120,
    }),

    columnHelper.accessor('paymentMethod', {
      id: 'paymentMethod',
      header: 'Payment Method', 
      cell: ({ getValue }) => getValue() || 'N/A',
      size: 120,
    }),

    columnHelper.accessor('total', {
      id: 'total',
      header: 'Total',
      cell: ({ getValue, row, column }) => {
        const value = getValue()
        const formatted = value ? `$${value.toFixed(2)}` : '$0.00'
        const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id
        
        return isEditing ? (
          <Input
            type="number"
            step="0.01"
            defaultValue={value?.toString() || '0'}
            className="h-8"
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
            autoFocus
          />
        ) : (
          <div 
            className="cursor-pointer hover:bg-muted/50 p-1 rounded text-right font-mono font-semibold"
            onClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
          >
            {formatted}
          </div>
        )
      },
      size: 100,
    }),

    columnHelper.display({
      id: 'details',
      header: 'Details',
      cell: ({ row }) => {
        const invoice = row.original
        const hasAdditionalData = invoice.vendorPhone || invoice.vendorEmail || invoice.authorizationCode || invoice.terminalId || invoice.merchantId || invoice.cardNumber || invoice.extraField1
        
        if (!hasAdditionalData) return null
        
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const isExpanded = expandedRows.has(row.id)
              const newExpanded = new Set(expandedRows)
              if (isExpanded) {
                newExpanded.delete(row.id)
              } else {
                newExpanded.add(row.id)
              }
              setExpandedRows(newExpanded)
            }}
            className="h-8 w-8 p-0"
          >
            {expandedRows.has(row.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )
      },
      size: 80,
    }),

    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(row.original)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(row.original.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      size: 100,
    }),
  ], [editingCell, expandedRows, onEdit, onDelete])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const totalAmount = useMemo(() => {
    return data.reduce((sum, invoice) => sum + (invoice.total || 0), 0)
  }, [data])

  const totalTax = useMemo(() => {
    return data.reduce((sum, invoice) => sum + (invoice.tax || 0), 0)
  }, [data])

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Extracted Invoice Data</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {data.length} invoice{data.length !== 1 ? 's' : ''} • 
                Total: <span className="font-semibold">${totalAmount.toFixed(2)}</span> • 
                Tax: <span className="font-semibold">${totalTax.toFixed(2)}</span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onExportCSV}
                className="h-9"
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onExportExcel}
                className="h-9"
              >
                <Download className="mr-2 h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search invoices..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" className="h-10">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead 
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={cn(
                          "font-semibold",
                          header.column.getCanSort() && "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center space-x-2">
                          {header.isPlaceholder ? null : (
                            <>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <div className="flex flex-col">
                                  {header.column.getIsSorted() === 'asc' && (
                                    <ChevronUp className="h-4 w-4" />
                                  )}
                                  {header.column.getIsSorted() === 'desc' && (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                  {!header.column.getIsSorted() && (
                                    <div className="h-4 w-4" />
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => [
                    <TableRow
                      key={row.id}
                      className="hover:bg-muted/50 transition-colors"
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell 
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>,
                    expandedRows.has(row.id) && (
                      <TableRow key={`${row.id}-expanded`}>
                        <TableCell colSpan={columns.length} className="p-4 bg-muted/20">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            {row.original.vendorPhone && (
                              <div><strong>Phone:</strong> {row.original.vendorPhone}</div>
                            )}
                            {row.original.vendorEmail && (
                              <div><strong>Email:</strong> {row.original.vendorEmail}</div>
                            )}
                            {row.original.vendorAddress && (
                              <div><strong>Address:</strong> {row.original.vendorAddress}</div>
                            )}
                            {row.original.authorizationCode && (
                              <div><strong>Auth Code:</strong> {row.original.authorizationCode}</div>
                            )}
                            {row.original.terminalId && (
                              <div><strong>Terminal:</strong> {row.original.terminalId}</div>
                            )}
                            {row.original.merchantId && (
                              <div><strong>Merchant:</strong> {row.original.merchantId}</div>
                            )}
                            {row.original.cardNumber && (
                              <div><strong>Card:</strong> {row.original.cardNumber}</div>
                            )}
                            {row.original.extraField1 && (
                              <div><strong>Extra 1:</strong> {row.original.extraField1}</div>
                            )}
                            {row.original.extraField2 && (
                              <div><strong>Extra 2:</strong> {row.original.extraField2}</div>
                            )}
                            {row.original.extraField3 && (
                              <div><strong>Extra 3:</strong> {row.original.extraField3}</div>
                            )}
                            {row.original.extraField4 && (
                              <div><strong>Extra 4:</strong> {row.original.extraField4}</div>
                            )}
                            {row.original.extraField5 && (
                              <div><strong>Extra 5:</strong> {row.original.extraField5}</div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  ])
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No invoices found. Upload some documents to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} • 
                Showing {table.getRowModel().rows.length} of {data.length} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}