import { useEffect, useState } from 'react'
import { ordersAPI, settingsAPI } from '../services/api.js'

const normalizeWhatsAppNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('62')) return digits
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  return digits
}

export default function CustomerPayment({ setCurrentPage, customerName, setPaymentMethod, paymentMethod, order, tableId, deviceId }) {
  const [method, setMethod] = useState(paymentMethod || 'pay-later')
  const [paid, setPaid] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [createdOrderId, setCreatedOrderId] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [sendingProof, setSendingProof] = useState(false)
  const [proofMessage, setProofMessage] = useState('')
  const [proofSent, setProofSent] = useState(false)
  const [adminWhatsAppNumber, setAdminWhatsAppNumber] = useState('')
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const paymentOptions = [
    { key: 'pay-later', label: 'Bayar Langsung di Kasir' },
    { key: 'online', label: 'Bayar Online (QRIS / E-Wallet)' }
  ]

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsAPI.get()
        setAdminWhatsAppNumber(settings.whatsappNumber || '')
      } catch (err) {
        setAdminWhatsAppNumber('')
      } finally {
        setSettingsLoaded(true)
      }
    }

    loadSettings()
  }, [])

  if (!order) {
    return <section className="min-h-screen flex items-center justify-center bg-amber-50 py-12"><div className="bg-white rounded-3xl shadow-xl p-10 text-center"><h2 className="text-2xl font-bold text-gray-900 mb-4">Tidak ada pesanan</h2><p className="text-gray-600">Silakan buat pesanan terlebih dahulu di halaman Pesan.</p></div></section>
  }

  const handlePay = async () => {
    if (method === 'online' && !proofFile) {
      setMessage('Untuk pembayaran online, unggah bukti pembayaran terlebih dahulu.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const payload = {
        id: order.id,
        customerName,
        tableId: order.tableId,
        deviceId,
        items: order.items,
        total: order.total,
        status: 'pending',
        date: order.date,
        paymentMethod: method,
        timestamp: order.timestamp,
        paymentStatus: method === 'online' ? 'waiting_proof_verification' : 'paid_at_cashier',
        paymentProof: proofFile ? { fileName: proofFile.name, fileSize: proofFile.size, fileType: proofFile.type, uploadedAt: new Date().toISOString() } : null,
        cashierNote: method === 'online' ? 'Menunggu verifikasi bukti pembayaran via WhatsApp.' : 'Silakan bayar di kasir.'
      }

      const createdOrder = await ordersAPI.create(payload)
      setCreatedOrderId(createdOrder.id)
      setPaymentMethod(method)
      setPaid(true)
      setMessage(method === 'online' ? 'Pesanan tersimpan. Kirim bukti pembayaran ke WhatsApp admin/kasir untuk verifikasi.' : 'Pembayaran berhasil dan pesanan telah dikirim ke sistem.')
    } catch (err) {
      setMessage('Gagal menyimpan pesanan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendProofWhatsApp = async () => {
    setSendingProof(true)
    setProofMessage('')

    const normalizedWhatsAppNumber = normalizeWhatsAppNumber(adminWhatsAppNumber)
    if (!normalizedWhatsAppNumber) {
      setProofMessage('Nomor WhatsApp admin/kasir belum diatur. Silakan minta admin mengisi nomor di dashboard.')
      setSendingProof(false)
      return
    }

    const lines = [
      'Halo Admin/Kasir Daeng Kopi, saya kirim konfirmasi pembayaran online.',
      '',
      `Order ID: ${createdOrderId || order.id}`,
      `Nama: ${customerName || 'Pelanggan'}`,
      `Meja: ${tableId || order.tableId || '-'}`,
      `Total: Rp ${Number(order.total || 0).toLocaleString('id-ID')}`,
      'Metode: Pembayaran Online',
      `Bukti: ${proofFile?.name || 'Terlampir di chat'}`,
      '',
      'Mohon verifikasi pembayaran saya. Terima kasih.'
    ]

    try {
      const whatsappUrl = `https://wa.me/${normalizedWhatsAppNumber}?text=${encodeURIComponent(lines.join('\n'))}`
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')

      if (createdOrderId) {
        await ordersAPI.update(createdOrderId, {
          proofSentWhatsappAt: new Date().toISOString(),
          proofSentToNumber: normalizedWhatsAppNumber,
          paymentProofStatus: 'sent_whatsapp'
        })
      }

      setProofSent(true)
      setProofMessage('WhatsApp terbuka. Silakan kirim lampiran bukti pembayaran pada chat yang terbuka.')
    } catch (err) {
      setProofMessage('Gagal membuka WhatsApp atau menyimpan status bukti.')
    } finally {
      setSendingProof(false)
    }
  }

  return (
    <section className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Pembayaran</h2>
        <p className="text-gray-600 mb-6">Bayar pesananmu secara cepat dan aman.</p>

        <div className="space-y-4 mb-8">
          <div className="rounded-3xl bg-amber-50 p-5">
            <div className="flex justify-between mb-2"><span className="font-semibold">Order ID</span><span>{order.id}</span></div>
            <div className="flex justify-between mb-2"><span className="font-semibold">Pelanggan</span><span>{customerName || 'Pelanggan'}</span></div>
            <div className="flex justify-between mb-2"><span className="font-semibold">Meja</span><span>{tableId || order.tableId || '-'}</span></div>
            <div className="flex justify-between"><span className="font-semibold">Total</span><span>Rp {order.total.toLocaleString('id-ID')}</span></div>
          </div>

          <div className="rounded-3xl bg-gray-50 p-5">
            <h3 className="text-lg font-semibold mb-3">Metode Pembayaran</h3>
            <div className="space-y-3">
              {paymentOptions.map((option) => (
                <label key={option.key} className="flex items-center gap-3 bg-white p-4 rounded-3xl cursor-pointer border transition">
                  <input type="radio" name="payment" value={option.key} checked={method === option.key} onChange={() => setMethod(option.key)} className="form-radio text-amber-900" />
                  <span className="font-medium">{option.label}</span>
                </label>
              ))}
            </div>

            {method === 'online' && (
              <div className="mt-4 p-4 rounded-2xl border border-blue-200 bg-blue-50">
                <p className="text-sm text-blue-800 mb-3 font-medium">Unggah bukti pembayaran online</p>
                <input type="file" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-700" />
                {proofFile && <p className="mt-2 text-xs text-blue-700">File: {proofFile.name} ({Math.round(proofFile.size / 1024)} KB)</p>}
                <p className="mt-2 text-xs text-blue-700">Nomor tujuan WhatsApp: {settingsLoaded ? adminWhatsAppNumber || 'Belum diatur admin' : 'Memuat...'}</p>
                <p className="mt-2 text-xs text-blue-700">Setelah konfirmasi, kirim bukti ke WhatsApp admin/kasir.</p>
              </div>
            )}
          </div>
        </div>

        {message && <p className="mb-4 text-sm text-green-700">{message}</p>}

        {!paid ? (
          <button onClick={handlePay} disabled={loading} className="w-full bg-amber-900 text-white rounded-full py-3 font-semibold hover:bg-amber-800 transition disabled:opacity-50">{loading ? 'Memproses...' : method === 'pay-later' ? 'Konfirmasi Bayar di Kasir' : 'Bayar Online Sekarang'}</button>
        ) : (
          <div className="rounded-3xl bg-green-100 border border-green-200 p-6 text-center"><h3 className="text-2xl font-bold text-green-800 mb-2">Pembayaran Berhasil!</h3><p className="text-gray-700">Pesananmu sudah dicatat. Cek statusnya di halaman riwayat pada HP ini.</p></div>
        )}

        {paid && method === 'online' && (
          <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <h4 className="font-semibold text-emerald-800 mb-2">Kirim Bukti Pembayaran ke WhatsApp</h4>
            <p className="text-sm text-emerald-700 mb-3">Klik tombol di bawah untuk buka WhatsApp admin/kasir dengan format data otomatis.</p>
            <button onClick={handleSendProofWhatsApp} disabled={sendingProof} className="w-full bg-emerald-600 text-white rounded-full py-3 font-semibold hover:bg-emerald-700 transition disabled:opacity-50">{sendingProof ? 'Membuka WhatsApp...' : proofSent ? 'Kirim Ulang via WhatsApp' : 'Kirim Bukti via WhatsApp'}</button>
            {proofMessage && <p className="mt-2 text-sm text-emerald-800">{proofMessage}</p>}
          </div>
        )}

        {paid && <button onClick={() => setCurrentPage('history')} className="w-full mt-4 bg-white border border-amber-300 text-amber-900 rounded-full py-3 font-semibold hover:bg-amber-50 transition">Lihat Riwayat Pesanan Saya</button>}
      </div>
    </section>
  )
}
