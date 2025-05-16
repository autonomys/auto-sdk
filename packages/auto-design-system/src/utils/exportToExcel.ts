/**
 * Utility function to export data to Excel format
 * @param data - Array of objects to export
 * @param filename - Name of the exported file
 */
export const exportToExcel = (data: unknown[], filename: string): void => {
  if (!data || data.length === 0) {
    console.error('No data to export')
    return
  }

  try {
    // In a real implementation, we would use a library like xlsx or exceljs
    // For this design system, we'll provide a simplified implementation

    // Get headers from first item keys
    const headers = Object.keys(data[0] as object)

    // Create CSV content
    const csvContent = [
      headers.join(','), // Header row
      ...data.map((row) =>
        headers
          .map((header) => {
            // Handle values with commas by wrapping in quotes
            const value = String((row as Record<string, unknown>)[header] ?? '')
            return value.includes(',') ? `"${value}"` : value
          })
          .join(','),
      ),
    ].join('\n')

    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

    // Create download link
    const link = document.createElement('a')

    // Create the URL for the blob
    const url = URL.createObjectURL(blob)

    // Set link properties
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'

    // Add to document, trigger click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up the URL
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting to Excel:', error)
  }
}
