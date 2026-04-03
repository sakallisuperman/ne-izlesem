'use client'
import { useAuth } from '@/contexts/AuthContext'

export default function Profile() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center pb-20" style={{ background: '#0a0a0f' }}>
        <div className="text-lg" style={{ color: '#94a3b8' }}>Yükleniyor...</div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: '#0a0a0f' }}>
        <div className="text-5xl mb-6">👤</div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#f1f5f9' }}>Giriş Yap</h1>
        <p className="text-center mb-8 max-w-sm" style={{ color: '#94a3b8' }}>
          Önerilerini kaydet, izlediklerini işaretle ve kişiselleştirilmiş deneyimin keyfini çıkar.
        </p>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-3 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105 border"
          style={{ background: '#ffffff', color: '#0a0a0f', borderColor: '#ffffff20' }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Google ile Giriş Yap
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-6 pt-12 pb-24" style={{ background: '#0a0a0f' }}>
      <div className="max-w-md mx-auto">
        <div className="flex flex-col items-center mb-10">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profil"
              className="w-20 h-20 rounded-full mb-4 border-2"
              style={{ borderColor: '#f59e0b' }}
            />
          ) : (
            <div className="w-20 h-20 rounded-full mb-4 flex items-center justify-center text-3xl"
              style={{ background: '#f59e0b22', color: '#f59e0b' }}>
              {(user.user_metadata?.full_name || 'K')[0].toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>
            {user.user_metadata?.full_name || 'Kullanıcı'}
          </h1>
          <p className="text-sm" style={{ color: '#94a3b8' }}>{user.email}</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={signOut}
            className="w-full py-3 rounded-xl font-medium transition-all border"
            style={{ background: '#12121a', color: '#ef4444', borderColor: '#ef444433' }}
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </main>
  )
}
