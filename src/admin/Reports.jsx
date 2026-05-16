import { useEffect, useState } from 'react'
import { ordersAPI, reportsAPI } from '../services/api.js'

function getOrderDate(order) {
  const rawDate = order.timestamp || order.date
  if (!rawDate) return null
  const parsed = new Date(rawDate)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getCompletedOrders(orders) {
  return orders.filter((order) => order.status === 'completed')
}

function calculateOrderQty(order) {
  return (order.items || []).reduce((sum, item) => sum + (item.qty || 0), 0)
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + diff)
  return d
}

function endOfWeek(date) {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  return d
}

function formatDate(date) {
  return date.toLocaleDateString('id-ID')
}

function formatMonth(date) {
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function summarizeOrders(groupedOrders) {
  const totalOrders = groupedOrders.length
  const totalRevenue = groupedOrders.reduce((sum, order) => sum + (order.total || 0), 0)
  const totalItems = groupedOrders.reduce((sum, order) => sum + calculateOrderQty(order), 0)

  return {
    totalOrders,
    totalItems,
    totalRevenue
  }
}

function escapeCsvValue(value) {
  const normalized = value ?? ''
  const text = String(normalized).replace(/"/g, '""')
  return /[",\n]/.test(text) ? `"${text}"` : text
}

function buildCsvContent(rows) {
  const headers = ['Periode', 'Tipe', 'Jumlah Transaksi', 'Item Terjual', 'Total Pendapatan']
  const lines = [headers.join(',')]

  rows.forEach((row) => {
    const values = headers.map((header) => escapeCsvValue(row[header]))
    lines.push(values.join(','))
  })

  return lines.join('\n')
}

function parseDateInput(value, endOfDay = false) {
  if (!value) return null
  const [year, month, day] = value.split('-').map((part) => Number(part))
  if (!year || !month || !day) return null
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0)
}

function isDateWithinRange(date, startDate, endDate) {
  if (!date) return false
  if (startDate && date < startDate) return false
  if (endDate && date > endDate) return false
  return true
}

function formatDateToInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPresetDates(preset) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (preset) {
    case 'today':
      return { start: formatDateToInput(today), end: formatDateToInput(today) }
    case 'last7days': {
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      return { start: formatDateToInput(sevenDaysAgo), end: formatDateToInput(today) }
    }
    case 'thisMonth': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: formatDateToInput(firstDay), end: formatDateToInput(lastDay) }
    }
    default:
      return { start: '', end: '' }
  }
}

export default function Reports() {
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const loadStats = async () => {
    setLoading(true)
    setError('')
    try {
      const [statsResult, ordersResult] = await Promise.all([
        reportsAPI.getStats(),
        ordersAPI.getAll()
      ])

      setStats(statsResult)
      setOrders(ordersResult)
    } catch (err) {
      setError('Gagal memuat laporan. Coba lagi nanti.')
    } finally {
      setLoading(false)
    }
  }

  const exportRecapToCsv = async () => {
    setExporting(true)
    setError('')

    try {
      const startDateObj = parseDateInput(startDate)
      const endDateObj = parseDateInput(endDate, true)

      if (startDateObj && endDateObj && startDateObj > endDateObj) {
        setError('Tanggal mulai tidak boleh lebih besar dari tanggal sampai.')
        return
      }

      const completedOrders = getCompletedOrders(orders).filter((order) => {
        const date = getOrderDate(order)
        return isDateWithinRange(date, startDateObj, endDateObj)
      })

      if (completedOrders.length === 0) {
        setError('Belum ada pesanan selesai untuk direkap ke CSV.')
        return
      }

      const dailyMap = new Map()
      const weeklyMap = new Map()
      const monthlyMap = new Map()
      const yearlyMap = new Map()

      completedOrders.forEach((order) => {
        const date = getOrderDate(order)
        if (!date) return

        const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        const weekStart = startOfWeek(date)
        const weekEnd = endOfWeek(date)
        const weekKey = `${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()}`
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
        const yearKey = `${date.getFullYear()}`

        if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, { label: formatDate(date), orders: [] })
        if (!weeklyMap.has(weekKey)) weeklyMap.set(weekKey, { label: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`, orders: [] })
        if (!monthlyMap.has(monthKey)) monthlyMap.set(monthKey, { label: formatMonth(date), orders: [] })
        if (!yearlyMap.has(yearKey)) yearlyMap.set(yearKey, { label: yearKey, orders: [] })

        dailyMap.get(dayKey).orders.push(order)
        weeklyMap.get(weekKey).orders.push(order)
        monthlyMap.get(monthKey).orders.push(order)
        yearlyMap.get(yearKey).orders.push(order)
      })

      const buildRows = (sourceMap, periodTitle) => Array.from(sourceMap.values()).map((entry) => {
        const summary = summarizeOrders(entry.orders)
        return {
          Periode: entry.label,
          Tipe: periodTitle,
          'Jumlah Transaksi': summary.totalOrders,
          'Item Terjual': summary.totalItems,
          'Total Pendapatan': summary.totalRevenue
        }
      })

      const rows = [
        ...buildRows(dailyMap, 'Harian'),
        ...buildRows(weeklyMap, 'Mingguan'),
        ...buildRows(monthlyMap, 'Bulanan'),
        ...buildRows(yearlyMap, 'Tahunan')
      ]

      const csvBlob = new Blob([buildCsvContent(rows)], { type: 'text/csv;charset=utf-8;' })
      const downloadUrl = URL.createObjectURL(csvBlob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', `rekap-penjualan-${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      setError('Gagal mengekspor rekap ke CSV.')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Laporan Real Time</h2>
          <p className="text-gray-600 mt-2">Pantau performa penjualan dan transaksi secara langsung.</p>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-2">
          <p className="text-sm text-gray-500">Terakhir diperbarui: <span className="font-semibold">{stats?.timestamp ? new Date(stats.timestamp).toLocaleTimeString('id-ID') : '-'}</span></p>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700" aria-label="Tanggal mulai" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700" aria-label="Tanggal sampai" />
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <button onClick={() => { const d = getPresetDates('today'); setStartDate(d.start); setEndDate(d.end) }} className="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-xs font-medium text-gray-700 transition">Hari ini</button>
            <button onClick={() => { const d = getPresetDates('last7days'); setStartDate(d.start); setEndDate(d.end) }} className="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-xs font-medium text-gray-700 transition">7 hari terakhir</button>
            <button onClick={() => { const d = getPresetDates('thisMonth'); setStartDate(d.start); setEndDate(d.end) }} className="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-xs font-medium text-gray-700 transition">Bulan ini</button>
            <button onClick={() => { setStartDate(''); setEndDate('') }} className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-600 transition">Bersihkan</button>
          </div>
          <p className="text-xs text-gray-500">Kosongkan tanggal untuk ekspor semua data.</p>
          <button onClick={exportRecapToCsv} disabled={exporting || loading} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition">{exporting ? 'Menyimpan CSV...' : 'Simpan Rekap CSV Otomatis'}</button>
        </div>
      </div>

      {loading ? <div className="text-gray-600">Memuat laporan...</div> : error ? <div className="text-red-600">{error}</div> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-3xl shadow-md"><h3 className="text-gray-600 mb-3">Total Revenue</h3><p className="text-3xl font-bold text-green-600">Rp {Number(stats.totalRevenue || 0).toLocaleString('id-ID')}</p></div>
            <div className="bg-white p-6 rounded-3xl shadow-md"><h3 className="text-gray-600 mb-3">Completed Orders</h3><p className="text-3xl font-bold text-blue-600">{stats.completedOrders || 0}</p></div>
            <div className="bg-white p-6 rounded-3xl shadow-md"><h3 className="text-gray-600 mb-3">Pending Orders</h3><p className="text-3xl font-bold text-orange-600">{stats.pendingOrders || 0}</p></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl shadow-md p-6"><h3 className="text-2xl font-bold mb-4">Menu Items</h3><p className="text-gray-600">Total menu aktif: <span className="font-semibold">{stats.totalMenuItems || 0}</span></p></div>
            <div className="bg-white rounded-3xl shadow-md p-6"><h3 className="text-2xl font-bold mb-4">Ringkasan Transaksi</h3><div className="h-64 bg-gradient-to-b from-green-50 to-green-100 rounded-lg flex items-center justify-center text-gray-500 border-2 border-green-200"><div className="text-center"><p className="text-lg">Aktivitas transaksi</p><p className="text-sm text-gray-500">Performa sistem</p></div></div></div>
          </div>
        </>
      )}
    </section>
  )
}
