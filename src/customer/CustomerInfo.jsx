import { useState } from 'react'

export default function CustomerInfo({ setCurrentPage, setCustomerName, nextPage = 'order', tableId, initialName = '' }) {
  const [name, setName] = useState(initialName)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      setCustomerName(name.trim())
      setCurrentPage(nextPage)
    }
  }

  return (
    <section className="min-h-screen bg-amber-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Informasi Pelanggan</h2>
          <p className="text-gray-600 mb-2">Silakan masukkan nama Anda sebelum mulai memesan.</p>
          <p className="text-sm text-amber-700 mb-6">Meja aktif: {tableId || 'Belum scan meja'}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent" placeholder="Masukkan nama Anda" required />
            </div>
            <button type="submit" className="w-full bg-amber-900 text-white rounded-full py-3 font-semibold hover:bg-amber-800 transition">Lanjutkan ke Pesan</button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => setCurrentPage('qr-scanner')} className="text-amber-600 hover:text-amber-800 text-sm">Kembali ke Scanner</button>
          </div>
        </div>
      </div>
    </section>
  )
}
