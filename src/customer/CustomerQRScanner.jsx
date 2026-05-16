import { BrowserMultiFormatReader } from '@zxing/browser'
import { useEffect, useMemo, useRef, useState } from 'react'
import { tablesAPI } from '../services/api.js'

const TOTAL_TABLES = 14

const parseTableNumber = (rawText) => {
  const text = String(rawText || '').trim().toUpperCase()
  const mejaMatch = text.match(/MEJA[-_\s:]?0*(\d{1,2})/)
  if (mejaMatch) return Number(mejaMatch[1])
  const tableMatch = text.match(/TABLE[-_\s:]?0*(\d{1,2})/)
  if (tableMatch) return Number(tableMatch[1])
  const plainNumber = text.match(/^0*(\d{1,2})$/)
  if (plainNumber) return Number(plainNumber[1])
  return null
}

export default function CustomerQRScanner({ onScanned, setCurrentPage, currentTableId }) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const readerRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [scannedData, setScannedData] = useState('')
  const [tableInput, setTableInput] = useState('')
  const [error, setError] = useState('')
  const [tableStatusData, setTableStatusData] = useState({ totalTables: TOTAL_TABLES, occupied: 0, available: TOTAL_TABLES, tables: [], timestamp: null })

  const tableStatusMap = useMemo(() => {
    const map = new Map()
    tableStatusData.tables.forEach((table) => map.set(table.tableId, table))
    return map
  }, [tableStatusData.tables])

  const availableTables = useMemo(() => Array.from({ length: TOTAL_TABLES }, (_, idx) => idx + 1), [])

  const loadTableStatus = async () => {
    try {
      const data = await tablesAPI.getStatus()
      setTableStatusData(data)
    } catch (err) {
      setError('Gagal memuat status meja realtime.')
    }
  }

  useEffect(() => {
    loadTableStatus()
    const intervalId = setInterval(loadTableStatus, 5000)
    return () => {
      clearInterval(intervalId)
      if (controlsRef.current) controlsRef.current.stop()
      if (readerRef.current) readerRef.current.reset()
    }
  }, [])

  const submitScannedTable = (tableNumber) => {
    if (Number.isNaN(tableNumber) || tableNumber < 1 || tableNumber > TOTAL_TABLES) {
      setError('Meja tidak valid. Gunakan barcode meja 1 sampai 14.')
      return
    }

    const tableData = `MEJA-${String(tableNumber).padStart(2, '0')}`
    const tableInfo = tableStatusMap.get(tableData)

    if (tableInfo?.status === 'occupied' && tableData !== currentTableId) {
      setError(`Meja ${tableData} sedang dipakai. Pilih meja lain.`)
      return
    }

    setError('')
    setScannedData(tableData)
    setTimeout(() => onScanned(tableData), 450)
  }

  const stopScanning = async () => {
    try {
      if (controlsRef.current) await controlsRef.current.stop()
      if (readerRef.current) readerRef.current.reset()
    } finally {
      controlsRef.current = null
      setScanning(false)
    }
  }

  const startScanning = async () => {
    setError('')
    if (!videoRef.current) return

    try {
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader
      setScanning(true)

      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (!result) return
        const parsedTable = parseTableNumber(result.getText())
        if (!parsedTable) {
          setError(`Kode tidak dikenali: ${result.getText()}`)
          return
        }
        submitScannedTable(parsedTable)
        stopScanning()
      })

      controlsRef.current = controls
    } catch (err) {
      setError('Tidak bisa mengakses kamera. Pastikan izin kamera aktif.')
      setScanning(false)
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    submitScannedTable(parseInt(tableInput, 10))
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-amber-100 via-orange-50 to-rose-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-amber-200">
          <div className="mb-8"><h2 className="text-3xl font-bold text-gray-900 mb-3">Scan Barcode Meja</h2><p className="text-gray-600">Scan barcode meja yang tersedia untuk membuka menu. Total meja aktif: 14 meja.</p></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-gray-900 p-4 text-white">
              {!scanning ? (
                <div className="border border-dashed border-white/30 rounded-3xl p-12 text-center min-h-[420px] flex flex-col items-center justify-center"><p className="text-5xl mb-4">Scan</p><p className="text-lg font-semibold mb-2">Scanner siap digunakan</p><p className="text-sm text-white/80 mb-6">Arahkan kamera ke barcode/QR meja untuk deteksi asli.</p><button onClick={startScanning} className="w-full bg-white text-gray-900 rounded-full py-3 font-semibold hover:bg-amber-100 transition">Mulai Scan Asli</button></div>
              ) : (
                <div className="space-y-4"><div className="rounded-3xl overflow-hidden bg-black relative"><video ref={videoRef} autoPlay playsInline className="w-full h-96 object-cover" /><div className="absolute inset-0 pointer-events-none flex items-center justify-center"><div className="w-56 h-56 border-4 border-emerald-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" /></div></div><p className="text-sm text-center text-white/80">Arahkan barcode meja ke area kotak hijau.</p><button onClick={stopScanning} className="bg-red-500 text-white rounded-full py-3 font-semibold hover:bg-red-600 transition">Hentikan Scan</button></div>
              )}
            </div>

            <div className="space-y-6">
              <form onSubmit={handleManualSubmit} className="bg-amber-50 border border-amber-200 rounded-3xl p-6"><h3 className="text-xl font-bold text-gray-900 mb-2">Input Kode Meja</h3><p className="text-sm text-gray-600 mb-4">Jika kamera belum mendeteksi, masukkan nomor meja manual (1-14).</p><div className="flex gap-3"><input type="number" min="1" max="14" value={tableInput} onChange={(e) => setTableInput(e.target.value)} className="w-full px-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent" placeholder="Contoh: 7" /><button type="submit" className="bg-amber-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-amber-800 transition">Masuk</button></div></form>
              <div className="bg-white border border-gray-200 rounded-3xl p-6"><div className="flex items-center justify-between gap-3 mb-2"><h3 className="text-xl font-bold text-gray-900">Status Meja Realtime</h3><button onClick={loadTableStatus} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full">Refresh</button></div><p className="text-sm text-gray-600 mb-3">Tersedia: {tableStatusData.available} | Terpakai: {tableStatusData.occupied}</p><p className="text-xs text-gray-500 mb-4">Update terakhir: {tableStatusData.timestamp ? new Date(tableStatusData.timestamp).toLocaleTimeString('id-ID') : '-'}</p><div className="grid grid-cols-4 sm:grid-cols-7 gap-2">{availableTables.map((tableNo) => { const tableData = `MEJA-${String(tableNo).padStart(2, '0')}`; const tableInfo = tableStatusMap.get(tableData); const occupied = tableInfo?.status === 'occupied' && tableData !== currentTableId; return <button key={tableNo} onClick={() => submitScannedTable(tableNo)} disabled={occupied} title={occupied ? `Sedang dipakai oleh ${tableInfo?.latestCustomerName || 'customer lain'}` : `Pilih ${tableData}`} className={`rounded-xl py-2 text-sm font-semibold transition ${occupied ? 'bg-red-100 text-red-700 border border-red-200 cursor-not-allowed' : 'border border-amber-300 text-amber-900 hover:bg-amber-100'}`}>{tableNo}</button> })}</div></div>
              <button onClick={() => setCurrentPage('home')} className="w-full bg-white border border-gray-300 text-gray-700 rounded-full py-3 font-semibold hover:bg-gray-50 transition">Kembali ke Beranda</button>
            </div>
          </div>
          {error && <div className="mt-6 rounded-3xl bg-red-100 border border-red-300 p-5 text-red-700">{error}</div>}
          {scannedData && <div className="mt-6 rounded-3xl bg-green-100 border border-green-300 p-6 text-center"><p className="text-green-800 font-semibold mb-2">Scan Berhasil!</p><p className="text-green-700">Meja: {scannedData}</p><p className="text-sm text-green-600 mt-2">Mengalihkan ke halaman menu...</p></div>}
        </div>
      </div>
    </section>
  )
}
