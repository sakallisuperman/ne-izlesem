import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function callGroq(userMessage: string, retries = 2, systemOverride?: string): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const systemContent = systemOverride || `Sen bir film ve dizi uzmanısın. Kullanıcıya TAM OLARAK 3 film ve 3 dizi önereceksin, toplamda 6 öneri.

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir şey yazma, markdown kullanma:
{"recommendations":[{"title":"Orijinal Film/Dizi Adı","turkish_title":"Türkçe adı varsa yoksa boş string","type":"film veya dizi","year":2019,"duration":"2s 15dk veya 3 sezon","imdb":8.2,"platform":"Hangi platformda izlenebilir (Netflix, Amazon Prime, vs.)","reason":"Filmi veya diziyi çarpıcı şekilde tanıtan, izleyiciyi heyecanlandıran 2-3 cümlelik özgün açıklama.","tags":["#bu filme özgü tag","#konuyla ilgili tag","#duygu veya atmosfer tag"]}]}

ÖNEMLİ KURALLAR:
- Her film/dizi için hashtag'ler O YAPITA ÖZEL olsun
- Reason alanı filmi/diziyi satmalı, kullanıcıyı izlemeye ikna etmeli
- Gerçek var olan yapıtlar öner, uydurma
- Çeşitlilik sağla — en az 2 öneri az bilinen/niş yapım olsun
- Kullanıcının platform ve dönem tercihine dikkat et
- İzleme arkadaşı "Aileyle" ise aile dostu yapımlar öner (şiddet/yetişkin içerik yok)
- HER SEFERINDE FARKLI yapıtlar öner
- "Fark etmez" seçenekleri kısıtlama yok demek`
  for (let i = 0; i <= retries; i++) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemContent },
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
    const {
      answers,
      excludeTitles = [],
      feedback,
      previousTitles = [],
      reverseMode = false,
    } = await req.json()

    const isFamily = answers.company === 'Aileyle'
    const familyNote = isFamily
      ? '\n\nAİLE İLE İZLENECEK: Cinsel içerik, çıplaklık, ağır küfür ve aşırı şiddet içeren yapımlar ÖNERİLMESİN. Aile dostu, 13+ veya herkes için uygun yapımlar öner.'
      : ''

    let userMessage = `Kullanıcının cevapları:
- Ruh hali: ${answers.mood || 'belirtilmedi'}
- Dönem tercihi: ${answers.era || 'Fark etmez'}
- İstediği deneyim: ${answers.style || 'belirtilmedi'}
- Final tercihi: ${answers.ending || 'belirtilmedi'}
- İzleme arkadaşı: ${answers.company || 'Yalnız'}
- Platformlar: ${Array.isArray(answers.platform) ? answers.platform.join(', ') : (answers.platform || 'Fark etmez')}
- Favori türler: ${Array.isArray(answers.genres) ? answers.genres.join(', ') : (answers.genres || 'belirtilmedi')}${familyNote}`

    if (excludeTitles.length > 0) {
      userMessage += `\n\nDaha önce izlenen ve ÖNERİLMEMESİ gereken yapımlar: ${excludeTitles.join(', ')}`
    }

    if (feedback && feedback.length > 0) {
      userMessage += `\n\nKullanıcı önceki önerileri beğenmedi. Feedback: ${feedback.join(', ')}. Lütfen TAMAMEN FARKLI filmler öner. Önceki öneriler: ${previousTitles.join(', ')}`
    }

    let systemOverride: string | undefined

    if (reverseMode) {
      userMessage += `\n\nKullanıcı şu an "${answers.mood || 'belirsiz'}" hissediyor. Ona TAM TERSİ tonda filmler öner ki ruh hali değişsin:
- Melankolik/Duygusal → İlham verici, umut dolu, komedi
- Neşeli/Heyecanlı → Derin, düşündüren, sakin
- Yorgun → Enerjik, adrenalin dolu
- Stresli → Rahatlatıcı, sakin, feelgood
- Canı sıkkın → Şaşırtıcı, beklenmedik, farklı
TAM OLARAK 1 film ve 1 dizi öner. Önceki önerilerden tamamen farklı, sıra dışı seçimler yap.`
      systemOverride = `Sen bir film ve dizi uzmanısın. Kullanıcıya TAM OLARAK 1 film ve 1 dizi önereceksin, toplamda 2 öneri.

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir şey yazma, markdown kullanma:
{"recommendations":[{"title":"Orijinal Film/Dizi Adı","turkish_title":"Türkçe adı varsa yoksa boş string","type":"film veya dizi","year":2019,"duration":"2s 15dk veya 3 sezon","imdb":8.2,"platform":"Hangi platformda izlenebilir","reason":"2-3 cümlelik özgün açıklama.","tags":["#tag1","#tag2","#tag3"]}]}

KURALLAR: Gerçek yapıtlar öner. Sıra dışı, az bilinen seçimler tercih et. "Fark etmez" kısıtlama yok demek.`
    } else {
      userMessage += `\n\nBu kişiye TAM OLARAK 3 film ve 3 dizi öner. Toplamda 6 öneri.
ÖNEMLİ: Mainstream/popüler yapımların yanında mutlaka az bilinen yapımlar da öner.`
    }

    const cleaned = await callGroq(userMessage, 2, systemOverride)
    const data = JSON.parse(cleaned)

    try { await supabase.from('sessions').insert({ answers, recommendations: data.recommendations }) } catch {}

    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Bir sorun oluştu, lütfen tekrar deneyin' }, { status: 500 })
  }
}
