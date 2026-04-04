import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function callGroq(userMessage: string, retries = 2): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  for (let i = 0; i <= retries; i++) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Sen bir film ve dizi uzmanısın. Kullanıcıya TAM OLARAK 3 film ve 3 dizi önereceksin, toplamda 6 öneri.

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir şey yazma, markdown kullanma:
{"recommendations":[{"title":"Orijinal Film/Dizi Adı","turkish_title":"Türkçe adı varsa yoksa boş string","type":"film veya dizi","year":2019,"duration":"2s 15dk veya 3 sezon","imdb":8.2,"platform":"Hangi platformda izlenebilir (Netflix, Amazon Prime, vs.)","reason":"Filmi veya diziyi çarpıcı şekilde tanıtan, izleyiciyi heyecanlandıran 2-3 cümlelik özgün açıklama.","tags":["#bu filme özgü tag","#konuyla ilgili tag","#duygu veya atmosfer tag"]}]}

ÖNEMLİ KURALLAR:
- Her film/dizi için hashtag'ler O YAPITA ÖZEL olsun
- Reason alanı filmi/diziyi satmalı, kullanıcıyı izlemeye ikna etmeli
- Gerçek var olan yapıtlar öner, uydurma
- Çeşitlilik sağla — en az 2 öneri az bilinen/niş yapım olsun
- Kullanıcının platform tercihine dikkat et
- HER SEFERINDE FARKLI yapıtlar öner
- Dönem tercihine uy
- Dil tercihi "Yabancı (Dublajlı)" ise Türkçe dublajı olan yapımlar öner
- Dil tercihi "Yabancı (Altyazılı)" ise yabancı yapımlar öner
- "Fark etmez" seçenekleri kısıtlama yok demek`
          },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.9,
        max_tokens: 2500,
      })
      const content = completion.choices[0].message.content || ''
      const cleaned = content.replace(/```json|```/g, '').trim()
      JSON.parse(cleaned)
      return cleaned
    } catch (err) {
      if (i < retries) {
        await new Promise(r => setTimeout(r, 2000))
        continue
      }
      throw err
    }
  }
  throw new Error('Retries exhausted')
}

export async function POST(req: NextRequest) {
  try {
    const { answers } = await req.json()
    const userMessage = `Kullanıcının cevapları:
- Ruh hali: ${answers.mood}
- Ayıracağı zaman: ${answers.time}
- İstediği deneyim: ${answers.style}
- Final tercihi: ${answers.ending}
- Dönem tercihi: ${answers.era}
- Dil tercihi: ${answers.language}
- Kimlerle izliyor: ${answers.company}
- Platformlar: ${Array.isArray(answers.platform) ? answers.platform.join(', ') : answers.platform}
- Favori türler: ${Array.isArray(answers.genres) ? answers.genres.join(', ') : answers.genres}

Bu kişiye TAM OLARAK 3 film ve 3 dizi öner. Toplamda 6 öneri.
ÖNEMLİ: Mainstream/popüler yapımların yanında mutlaka az bilinen yapımlar da öner.`

    const cleaned = await callGroq(userMessage)
    const data = JSON.parse(cleaned)

    try { await supabase.from('sessions').insert({ answers, recommendations: data.recommendations }) } catch {}

    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Bir sorun oluştu, lütfen tekrar deneyin' }, { status: 500 })
  }
}
